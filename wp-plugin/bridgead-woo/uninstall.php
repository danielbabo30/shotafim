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
delete_option( 'bridgead_last_heartbeat' );

foreach ( array( 'bridgead_heartbeat', 'bridgead_digest', 'bridgead_flush_queue' ) as $hook ) {
	wp_clear_scheduled_hook( $hook );
}
