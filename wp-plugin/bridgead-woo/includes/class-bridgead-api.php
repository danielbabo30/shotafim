<?php
/**
 * לקוח HTTP ל-BridgeAd — חתימת HMAC על כל בקשה, לפי מסמך "BridgeAd Tracking API".
 *
 *   signingString = "{timestamp}.{raw_json_body}"
 *   header X-BridgeAd-Signature = "sha256=" . hmac_sha256_hex( signingString, apiKey )
 *   header X-BridgeAd-Site      = siteId  (מזהה ה-TrackedSite מהצימוד)
 *   header X-BridgeAd-Timestamp = unix seconds
 *
 * @package BridgeAd
 */

defined( 'ABSPATH' ) || exit;

class Bridgead_Api {

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	public function base_url() {
		return untrailingslashit( apply_filters( 'bridgead_api_base', BRIDGEAD_API_BASE ) );
	}

	/**
	 * @return array{site_id:string, api_key:string}
	 */
	public function credentials() {
		$settings = get_option( 'bridgead_settings', array() );
		return array(
			'site_id' => isset( $settings['site_id'] ) ? (string) $settings['site_id'] : '',
			'api_key' => isset( $settings['api_key'] ) ? (string) $settings['api_key'] : '',
		);
	}

	public function is_configured() {
		$c = $this->credentials();
		return '' !== $c['site_id'] && '' !== $c['api_key'];
	}

	/**
	 * ה-pepper הקבוע לאתר, נגזר מהמפתח — תואם לצד השרת (`sha256("pepper:" . apiKey)`).
	 */
	public function site_pepper() {
		$c = $this->credentials();
		return '' === $c['api_key'] ? '' : hash( 'sha256', 'pepper:' . $c['api_key'] );
	}

	const PRIVACY_OPTION = 'bridgead_privacy_key';

	/**
	 * מפתח הפרטיות (SEC-P-13) — סוד נפרד מ-apiKey, נמסר פעם אחת מהשרת ב-heartbeat
	 * ונשמר רק כאן (autoload=no). ריק = עדיין לא התקבל → נשארים על hash v1 (תאימות לאחור).
	 */
	public function privacy_key() {
		$key = get_option( self::PRIVACY_OPTION, '' );
		return ( is_string( $key ) && preg_match( '/^[0-9a-f]{64}$/', $key ) ) ? $key : '';
	}

	/**
	 * גרסת ה-hash לשליחה: 2 אם יש privacyKey, אחרת 1 (ישן).
	 */
	public function hash_version() {
		return '' === $this->privacy_key() ? 1 : 2;
	}

	/**
	 * תת-מפתח לפי הקשר (ip|ua|customer) — HMAC-SHA256(privacyKey, purpose), בינארי.
	 */
	private function privacy_subkey( $purpose ) {
		return hash_hmac( 'sha256', $purpose, $this->privacy_key(), true );
	}

	/**
	 * צמצום IP לפני hash: IPv4 → /24, IPv6 → /48 (IPv4-mapped מטופל כ-IPv4).
	 * מחזיר מחרוזת קנונית (inet_ntop) או '' אם הקלט אינו IP תקין.
	 */
	public static function truncate_ip( $ip ) {
		$bin = @inet_pton( (string) $ip );
		if ( false === $bin ) {
			return '';
		}
		if ( 16 === strlen( $bin ) && str_repeat( "\0", 10 ) . "\xff\xff" === substr( $bin, 0, 12 ) ) {
			$bin = substr( $bin, 12 ); // ::ffff:a.b.c.d
		}
		if ( 4 === strlen( $bin ) ) {
			$bin = substr( $bin, 0, 3 ) . "\0";
		} else {
			$bin = substr( $bin, 0, 6 ) . str_repeat( "\0", 10 );
		}
		return inet_ntop( $bin );
	}

	/**
	 * ipHash v2 = "v2:" . HMAC(subkey(ip), "YYYY-MM-DD|" . truncated_ip). ללא privacyKey → v1.
	 */
	public function ip_hash( $ip ) {
		if ( 2 !== $this->hash_version() ) {
			return hash( 'sha256', $ip . $this->daily_salt() );
		}
		return 'v2:' . hash_hmac( 'sha256', gmdate( 'Y-m-d' ) . '|' . self::truncate_ip( $ip ), $this->privacy_subkey( 'ip' ) );
	}

	public function ua_hash( $ua ) {
		if ( 2 !== $this->hash_version() ) {
			return hash( 'sha256', $ua . $this->daily_salt() );
		}
		return 'v2:' . hash_hmac( 'sha256', gmdate( 'Y-m-d' ) . '|' . $ua, $this->privacy_subkey( 'ua' ) );
	}

	/**
	 * customerHash v2 = "v2:" . HMAC(subkey(customer), lower(trim(email))). יציב לאורך זמן (ללא תאריך).
	 */
	public function customer_hash( $email ) {
		$email = strtolower( trim( (string) $email ) );
		if ( '' === $email ) {
			return '';
		}
		if ( 2 !== $this->hash_version() ) {
			return hash( 'sha256', $email . $this->site_pepper() );
		}
		return 'v2:' . hash_hmac( 'sha256', $email, $this->privacy_subkey( 'customer' ) );
	}

	/**
	 * שדות נוספים ל-heartbeat: מבקש privacyKey אם אין עדיין.
	 */
	public function heartbeat_extra() {
		return '' === $this->privacy_key() ? array( 'needsPrivacyKey' => true ) : array();
	}

	/**
	 * שומר privacyKey שהתקבל בתשובת heartbeat (רק בפורמט hex תקין).
	 */
	public function store_privacy_key_from( $result ) {
		if ( ! empty( $result['ok'] ) && is_array( $result['body'] ) && ! empty( $result['body']['privacyKey'] ) ) {
			$key = (string) $result['body']['privacyKey'];
			if ( preg_match( '/^[0-9a-f]{64}$/', $key ) ) {
				update_option( self::PRIVACY_OPTION, $key, false );
			}
		}
	}

	/**
	 * heartbeat מלא + קליטת privacyKey. משמש cron / בדיקת חיבור / שמירת צימוד.
	 */
	public function send_heartbeat( $orders_since = 0, $args = array() ) {
		$result = $this->post(
			'/api/plugin/heartbeat',
			array_merge(
				array(
					'pluginVersion'     => BRIDGEAD_VERSION,
					'wooVersion'        => defined( 'WC_VERSION' ) ? WC_VERSION : 'unknown',
					'wpVersion'         => get_bloginfo( 'version' ),
					'phpVersion'        => PHP_VERSION,
					'ordersSinceLast'   => (int) $orders_since,
					'stuckWebhookQueue' => Bridgead_Queue::size(),
					'sentAt'            => gmdate( 'c' ),
				),
				$this->heartbeat_extra()
			),
			$args
		);
		$this->store_privacy_key_from( $result );
		return $result;
	}

	/**
	 * מלח יומי ל-dedup של IP/UA — תואם לצד השרת (`siteId + YYYY-MM-DD`).
	 */
	public function daily_salt() {
		$c = $this->credentials();
		return $c['site_id'] . gmdate( 'Y-m-d' );
	}

	const CLOCK_OFFSET_OPTION = 'bridgead_clock_offset';
	const CONN_STATE_OPTION   = 'bridgead_conn_state';
	const MAX_CLOCK_OFFSET    = 86400; // ±24 שעות

	/**
	 * היסט שעון (שניות) בין שעון החנות לשעון השרת, כפי שנלמד מתשובת 401 clock_skew (B-3).
	 */
	public function clock_offset() {
		return (int) get_option( self::CLOCK_OFFSET_OPTION, 0 );
	}

	private function signing_time() {
		return time() + $this->clock_offset();
	}

	/**
	 * מצב החיבור האחרון שנצפה: '' (תקין) | 'disconnected' | 'rejected'. מוצג למנהל במסך ההגדרות.
	 *
	 * @return array{state:string, code:string, at:int}
	 */
	public function connection_state() {
		$v = get_option( self::CONN_STATE_OPTION, array() );
		return is_array( $v ) && ! empty( $v['state'] )
			? array(
				'state' => (string) $v['state'],
				'code'  => isset( $v['code'] ) ? (string) $v['code'] : '',
				'at'    => isset( $v['at'] ) ? (int) $v['at'] : 0,
			)
			: array( 'state' => '', 'code' => '', 'at' => 0 );
	}

	public function is_disconnected() {
		$s = $this->connection_state();
		return 'disconnected' === $s['state'];
	}

	public function set_connection_state( $state, $code = '' ) {
		if ( '' === $state ) {
			if ( false !== get_option( self::CONN_STATE_OPTION, false ) ) {
				delete_option( self::CONN_STATE_OPTION );
			}
			return;
		}
		$cur = $this->connection_state();
		if ( $cur['state'] === $state && $cur['code'] === $code ) {
			return; // בלי כתיבה מיותרת ל-DB בכל בקשה
		}
		update_option( self::CONN_STATE_OPTION, array( 'state' => $state, 'code' => $code, 'at' => time() ), false );
	}

	/**
	 * בקשת POST חתומה. 401 עם code=clock_skew → מתקן היסט שעון ומנסה שוב פעם אחת (B-3).
	 *
	 * @return array{ok:bool, code:int, body:mixed, error:string, reason:string}
	 */
	public function post( $path, $payload, $args = array(), $_retried = false ) {
		$c = $this->credentials();
		if ( '' === $c['site_id'] || '' === $c['api_key'] ) {
			return array( 'ok' => false, 'code' => 0, 'body' => null, 'error' => 'not_configured', 'reason' => 'not_configured' );
		}

		$body      = wp_json_encode( $payload );
		$timestamp = (string) $this->signing_time();
		$signature = 'sha256=' . hash_hmac( 'sha256', $timestamp . '.' . $body, $c['api_key'] );

		$response = wp_remote_post(
			$this->base_url() . $path,
			wp_parse_args(
				$args,
				array(
					'timeout'     => 12,
					'redirection' => 0,
					'blocking'    => true,
					'headers'     => array(
						'Content-Type'         => 'application/json',
						'X-BridgeAd-Site'      => $c['site_id'],
						'X-BridgeAd-Timestamp' => $timestamp,
						'X-BridgeAd-Signature' => $signature,
						'User-Agent'           => 'BridgeAd-Woo/' . BRIDGEAD_VERSION,
					),
					'body'        => $body,
				)
			)
		);

		if ( is_wp_error( $response ) ) {
			return array( 'ok' => false, 'code' => 0, 'body' => null, 'error' => $response->get_error_message(), 'reason' => 'network' );
		}

		$code   = (int) wp_remote_retrieve_response_code( $response );
		$parsed = json_decode( wp_remote_retrieve_body( $response ), true );
		$reason = ( is_array( $parsed ) && ! empty( $parsed['code'] ) && is_string( $parsed['code'] ) ) ? $parsed['code'] : '';

		// סטיית שעון: השרת מחזיר את שעונו; מתקנים היסט (מוגבל ל-±24h) ושולחים שוב פעם אחת.
		if ( 401 === $code && 'clock_skew' === $reason && ! $_retried && is_array( $parsed ) && isset( $parsed['serverTime'] ) && is_numeric( $parsed['serverTime'] ) ) {
			$offset = (int) $parsed['serverTime'] - time();
			if ( abs( $offset ) <= self::MAX_CLOCK_OFFSET ) {
				update_option( self::CLOCK_OFFSET_OPTION, $offset, false );
				return $this->post( $path, $payload, $args, true );
			}
		}

		$ok = $code >= 200 && $code < 300;
		if ( $ok ) {
			$this->set_connection_state( '' );
		} elseif ( 401 === $code && 'site_disconnected' === $reason ) {
			$this->set_connection_state( 'disconnected', $reason );
		} elseif ( 401 === $code ) {
			$this->set_connection_state( 'rejected', '' !== $reason ? $reason : 'unauthorized' );
		}

		return array(
			'ok'     => $ok,
			'code'   => $code,
			'body'   => $parsed,
			'error'  => $ok ? '' : ( '' !== $reason ? 'http_' . $code . ':' . $reason : 'http_' . $code ),
			'reason' => $reason,
		);
	}

	/**
	 * האם כשל הוא קבוע (אין טעם לנסות שוב): 400/409/422, או 401 "אתר מנותק".
	 * 401 אחר (שעון/חתימה) אינו קבוע — נשאר בתור עם backoff (B-3).
	 */
	public static function is_permanent( $result ) {
		$code = (int) $result['code'];
		if ( in_array( $code, array( 400, 409, 422 ), true ) ) {
			return true;
		}
		return 401 === $code && isset( $result['reason'] ) && 'site_disconnected' === $result['reason'];
	}

	/**
	 * שולח אירוע — כשל לא-קבוע נכנס לתור ה-retry. מוסיף למערך התוצאה:
	 *   queued  — האירוע בתור (יישלח בהמשך; מותר לסמן כמדווח)
	 *   dropped — נזרק (כשל קבוע); לא לסמן כמדווח.
	 */
	public function enqueue_or_send( $path, $payload, $idempotency_key ) {
		if ( $this->is_disconnected() ) {
			// החנות נותקה בצד BridgeAd — לא צוברים אירועים; heartbeat ממשיך לבדוק אם חזרנו.
			$r = array( 'ok' => false, 'code' => 401, 'body' => null, 'error' => 'site_disconnected', 'reason' => 'site_disconnected' );
			$r['queued']  = false;
			$r['dropped'] = true;
			return $r;
		}

		$result = $this->post( $path, $payload );
		$result['queued']  = false;
		$result['dropped'] = false;
		if ( ! $result['ok'] ) {
			if ( ! self::is_permanent( $result ) ) {
				Bridgead_Queue::add( $path, $payload, $idempotency_key );
				$result['queued'] = true;
			} else {
				$result['dropped'] = true;
				error_log( sprintf( 'BridgeAd: %s rejected (%d %s) — not retrying', $path, (int) $result['code'], $result['reason'] ) );
			}
		}
		return $result;
	}

	/**
	 * רק מכניס לתור (בלי שליחה) — לנתיבים שאסור שיחסמו את בקשת המבקר.
	 */
	public function enqueue_only( $path, $payload, $idempotency_key ) {
		if ( $this->is_disconnected() ) {
			return false;
		}
		Bridgead_Queue::add( $path, $payload, $idempotency_key );
		return true;
	}
}
