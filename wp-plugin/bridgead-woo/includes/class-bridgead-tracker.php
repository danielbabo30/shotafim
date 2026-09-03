<?php
/**
 * מעקב קליקים — קורא את פרמטר ה-ref, שם cookie first-party, שולח אירוע server-side,
 * ומדביק את ה-ref וה-landing להזמנה כשהיא נוצרת (שיוך שורד גם אם ה-cookie נמחק).
 *
 * @package BridgeAd
 */

defined( 'ABSPATH' ) || exit;

class Bridgead_Tracker {

	const QUERY_PARAM   = 'bgad_ref';
	const COOKIE_REF    = 'bgad_ref';
	const COOKIE_TS     = 'bgad_ts';
	const COOKIE_LAND   = 'bgad_land';
	const SESSION_REF   = 'bridgead_ref';
	const SESSION_LAND  = 'bridgead_land';

	public function __construct() {
		add_action( 'init', array( $this, 'capture_click' ), 1 );
		add_action( 'woocommerce_checkout_update_order_meta', array( $this, 'stamp_order' ) );
		add_action( 'woocommerce_store_api_checkout_update_order_meta', array( $this, 'stamp_order' ) );
	}

	public function capture_click() {
		if ( ! isset( $_GET[ self::QUERY_PARAM ] ) ) {
			return;
		}

		$ref = sanitize_text_field( wp_unslash( $_GET[ self::QUERY_PARAM ] ) );
		$ref = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $ref );
		if ( '' === $ref || strlen( $ref ) > 64 ) {
			return;
		}

		$settings = get_option( 'bridgead_settings', array() );
		$days     = isset( $settings['cookie_days'] ) ? (int) $settings['cookie_days'] : 90;
		$expires  = time() + $days * DAY_IN_SECONDS;
		$landing  = home_url( add_query_arg( array() ) );

		if ( ! headers_sent() ) {
			$args = array(
				'expires'  => $expires,
				'path'     => COOKIEPATH ? COOKIEPATH : '/',
				'domain'   => COOKIE_DOMAIN,
				'secure'   => is_ssl(),
				'httponly' => false,
				'samesite' => 'Lax',
			);
			setcookie( self::COOKIE_REF, $ref, $args );
			setcookie( self::COOKIE_TS, (string) time(), $args );
			setcookie( self::COOKIE_LAND, esc_url_raw( $landing ), $args );
		}

		if ( function_exists( 'WC' ) && WC()->session ) {
			WC()->session->set( self::SESSION_REF, $ref );
			WC()->session->set( self::SESSION_LAND, $landing );
		}

		$api = Bridgead_Api::instance();
		if ( ! $api->is_configured() ) {
			return;
		}

		$salt = $api->daily_salt();
		$ua   = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';

		$payload = array(
			'refCode'    => $ref,
			'occurredAt' => gmdate( 'c' ),
			'landingUrl' => esc_url_raw( $landing ),
			'ipHash'     => hash( 'sha256', self::client_ip() . $salt ),
		);
		if ( '' !== $ua ) {
			$payload['uaHash'] = hash( 'sha256', $ua . $salt );
		}
		$country = self::country();
		if ( $country ) {
			$payload['country'] = $country;
		}

		// לא חוסמים את הבקשה — האירוע נכנס לתור ונשלח ברקע.
		$api->enqueue_or_send(
			'/api/track/click',
			$payload,
			'click:' . $ref . ':' . floor( time() / 30 )
		);
	}

	/**
	 * מדביק להזמנה את ה-ref וה-landing (מ-session או cookie) ברגע היצירה.
	 *
	 * @param int|WC_Order $order_id
	 */
	public function stamp_order( $order_id ) {
		$order = is_a( $order_id, 'WC_Order' ) ? $order_id : wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		$ref  = '';
		$land = '';
		if ( function_exists( 'WC' ) && WC()->session ) {
			$ref  = (string) WC()->session->get( self::SESSION_REF, '' );
			$land = (string) WC()->session->get( self::SESSION_LAND, '' );
		}
		if ( '' === $ref && isset( $_COOKIE[ self::COOKIE_REF ] ) ) {
			$ref = preg_replace( '/[^A-Za-z0-9_-]/', '', sanitize_text_field( wp_unslash( $_COOKIE[ self::COOKIE_REF ] ) ) );
		}
		if ( '' === $land && isset( $_COOKIE[ self::COOKIE_LAND ] ) ) {
			$land = esc_url_raw( wp_unslash( $_COOKIE[ self::COOKIE_LAND ] ) );
		}

		if ( '' !== $ref ) {
			$order->update_meta_data( '_bridgead_ref', $ref );
			if ( '' !== $land ) {
				$order->update_meta_data( '_bridgead_landing', $land );
			}
			$order->save();
		}
	}

	private static function client_ip() {
		foreach ( array( 'HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR' ) as $header ) {
			if ( ! empty( $_SERVER[ $header ] ) ) {
				$value = sanitize_text_field( wp_unslash( $_SERVER[ $header ] ) );
				$parts = explode( ',', $value );
				return trim( $parts[0] );
			}
		}
		return '';
	}

	private static function country() {
		if ( ! empty( $_SERVER['HTTP_CF_IPCOUNTRY'] ) ) {
			$c = strtoupper( sanitize_text_field( wp_unslash( $_SERVER['HTTP_CF_IPCOUNTRY'] ) ) );
			if ( preg_match( '/^[A-Z]{2}$/', $c ) ) {
				return $c;
			}
		}
		if ( class_exists( 'WC_Geolocation' ) ) {
			$geo = WC_Geolocation::geolocate_ip( self::client_ip() );
			if ( ! empty( $geo['country'] ) ) {
				return $geo['country'];
			}
		}
		return null;
	}
}
