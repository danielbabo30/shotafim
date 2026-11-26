<?php
/**
 * הסרה מלאה — מנקה אפשרויות ותזמונים. נתוני ההזמנות (order meta) נשארים בחנות.
 *
 * @package BridgeAd
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'bridgead_settings' );
delete_option( 'bridgead_queue' );
delete_option( 'bridgead_hash_salt' );
delete_option( 'bridgead_privacy_key' );
delete_option( 'bridgead_last_heartbeat' );
delete_option( 'bridgead_clock_offset' );
delete_option( 'bridgead_conn_state' );
delete_transient( 'bridgead_flush_lock' );

foreach ( array( 'bridgead_heartbeat', 'bridgead_digest', 'bridgead_flush_queue', 'bridgead_flush_now' ) as $hook ) {
	wp_clear_scheduled_hook( $hook );
}
