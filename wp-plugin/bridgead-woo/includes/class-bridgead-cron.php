<?php
/**
 * משימות מתוזמנות: heartbeat כל 6 שעות, digest לילי, ניקוז תור ה-retry כל 5 דקות.
 * תואם למסמך "BridgeAd Tracking API".
 *
 * @package BridgeAd
 */

defined( 'ABSPATH' ) || exit;

class Bridgead_Cron {

	const HEARTBEAT = 'bridgead_heartbeat';
	const DIGEST    = 'bridgead_digest';
	const FLUSH     = 'bridgead_flush_queue';

	public function __construct() {
		add_filter( 'cron_schedules', array( __CLASS__, 'add_schedules' ) );
		add_action( self::HEARTBEAT, array( $this, 'heartbeat' ) );
		add_action( self::DIGEST, array( $this, 'digest' ) );
		add_action( self::FLUSH, array( 'Bridgead_Queue', 'flush' ) );
	}

	public static function add_schedules( $schedules ) {
		$schedules['bridgead_6h'] = array(
			'interval' => 6 * HOUR_IN_SECONDS,
			'display'  => __( 'כל 6 שעות (BridgeAd)', 'bridgead-woo' ),
		);
		$schedules['bridgead_5min'] = array(
			'interval' => 5 * MINUTE_IN_SECONDS,
			'display'  => __( 'כל 5 דקות (BridgeAd)', 'bridgead-woo' ),
		);
		return $schedules;
	}

	public static function schedule() {
		if ( ! wp_next_scheduled( self::HEARTBEAT ) ) {
			wp_schedule_event( time() + 300, 'bridgead_6h', self::HEARTBEAT );
		}
		if ( ! wp_next_scheduled( self::DIGEST ) ) {
			wp_schedule_event( strtotime( 'tomorrow 3:00' ), 'daily', self::DIGEST );
		}
		if ( ! wp_next_scheduled( self::FLUSH ) ) {
			wp_schedule_event( time() + 120, 'bridgead_5min', self::FLUSH );
		}
	}

	public static function unschedule() {
		foreach ( array( self::HEARTBEAT, self::DIGEST, self::FLUSH ) as $hook ) {
			$timestamp = wp_next_scheduled( $hook );
			if ( $timestamp ) {
				wp_unschedule_event( $timestamp, $hook );
			}
			wp_clear_scheduled_hook( $hook );
		}
	}

	/**
	 * POST /api/plugin/heartbeat — "אני חי".
	 */
	public function heartbeat() {
		$api = Bridgead_Api::instance();
		if ( ! $api->is_configured() ) {
			return;
		}

		$since = (int) get_option( 'bridgead_last_heartbeat', 0 );

		$result = $api->post(
			'/api/plugin/heartbeat',
			array(
				'pluginVersion'    => BRIDGEAD_VERSION,
				'wooVersion'       => defined( 'WC_VERSION' ) ? WC_VERSION : 'unknown',
				'wpVersion'        => get_bloginfo( 'version' ),
				'phpVersion'       => PHP_VERSION,
				'ordersSinceLast'  => $this->orders_since( $since ),
				'stuckWebhookQueue' => Bridgead_Queue::size(),
				'sentAt'           => gmdate( 'c' ),
			)
		);

		if ( $result['ok'] ) {
			update_option( 'bridgead_last_heartbeat', time(), false );
		}
	}

	/**
	 * POST /api/track/digest — תקציר כל ההזמנות המשויכות בחלון האחרון.
	 */
	public function digest() {
		$api = Bridgead_Api::instance();
		if ( ! $api->is_configured() ) {
			return;
		}

		$settings = get_option( 'bridgead_settings', array() );
		$days     = isset( $settings['digest_lookback'] ) ? max( 1, (int) $settings['digest_lookback'] ) : 7;
		$since    = time() - $days * DAY_IN_SECONDS;

		$orders = wc_get_orders(
			array(
				'date_created' => '>' . $since,
				'limit'        => 2000,
				'orderby'      => 'date',
				'order'        => 'ASC',
				'return'       => 'objects',
			)
		);

		$rows  = array();
		$gross = 0.0;
		foreach ( $orders as $order ) {
			$ref     = (string) $order->get_meta( '_bridgead_ref' );
			$coupons = $order->get_coupon_codes();
			if ( '' === $ref && empty( $coupons ) ) {
				continue;
			}
			$total = (float) $order->get_total();
			$gross += $total;
			$row   = array(
				'externalOrderId' => (string) $order->get_id(),
				'orderPlacedAt'   => $order->get_date_created() ? $order->get_date_created()->format( 'c' ) : gmdate( 'c' ),
				'grandTotal'      => $total,
				'status'          => $order->get_status(),
				'couponCodes'     => array_values( array_map( 'strtoupper', $coupons ) ),
			);
			if ( '' !== $ref ) {
				$row['refCode'] = $ref;
			}
			$rows[] = $row;
		}

		$api->post(
			'/api/track/digest',
			array(
				'periodStart' => gmdate( 'c', $since ),
				'periodEnd'   => gmdate( 'c' ),
				'orders'      => $rows,
				'totals'      => array(
					'orderCount'  => count( $rows ),
					'grossAmount' => round( $gross, 2 ),
				),
			),
			array( 'timeout' => 30 )
		);
	}

	private function orders_since( $timestamp ) {
		if ( ! $timestamp ) {
			return 0;
		}
		return count(
			wc_get_orders(
				array(
					'date_created' => '>' . (int) $timestamp,
					'meta_key'     => '_bridgead_reported',
					'limit'        => -1,
					'return'       => 'ids',
				)
			)
		);
	}
}
