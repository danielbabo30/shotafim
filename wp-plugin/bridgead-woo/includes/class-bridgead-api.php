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

	/**
	 * מלח יומי ל-dedup של IP/UA — תואם לצד השרת (`siteId + YYYY-MM-DD`).
	 */
	public function daily_salt() {
		$c = $this->credentials();
		return $c['site_id'] . gmdate( 'Y-m-d' );
	}

	/**
	 * בקשת POST חתומה.
	 *
	 * @return array{ok:bool, code:int, body:mixed, error:string}
	 */
	public function post( $path, $payload, $args = array() ) {
		$c = $this->credentials();
		if ( '' === $c['site_id'] || '' === $c['api_key'] ) {
			return array( 'ok' => false, 'code' => 0, 'body' => null, 'error' => 'not_configured' );
		}

		$body      = wp_json_encode( $payload );
		$timestamp = (string) time();
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
			return array( 'ok' => false, 'code' => 0, 'body' => null, 'error' => $response->get_error_message() );
		}

		$code   = (int) wp_remote_retrieve_response_code( $response );
		$parsed = json_decode( wp_remote_retrieve_body( $response ), true );

		return array(
			'ok'    => $code >= 200 && $code < 300,
			'code'  => $code,
			'body'  => $parsed,
			'error' => ( $code >= 200 && $code < 300 ) ? '' : 'http_' . $code,
		);
	}

	/**
	 * שולח אירוע — במקרה כשל (חוץ מ-4xx שאינו 404/429), מוסיף לתור ה-retry.
	 */
	public function enqueue_or_send( $path, $payload, $idempotency_key ) {
		$result = $this->post( $path, $payload );
		if ( ! $result['ok'] ) {
			$code = (int) $result['code'];
			$permanent = in_array( $code, array( 400, 401, 409, 422 ), true );
			if ( ! $permanent ) {
				Bridgead_Queue::add( $path, $payload, $idempotency_key );
			} else {
				error_log( sprintf( 'BridgeAd: %s rejected (%d) — not retrying', $path, $code ) );
			}
		}
		return $result;
	}
}
