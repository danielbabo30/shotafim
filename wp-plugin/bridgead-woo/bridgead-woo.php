<?php
/**
 * Plugin Name:       BridgeAd — מעקב שותפויות
 * Plugin URI:        https://app.bridgead.co.il/dashboard/plugin
 * Description:        מחבר את חנות ה-WooCommerce שלך ל-BridgeAd: דוגם קליקים ורכישות דרך קישורי השיוך והקופונים של היוצרים, ומחשב את העמלה שמגיעה לכל יוצר.
 * Version:           0.1.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * Author:            BridgeAd
 * Author URI:        https://bridgead.co.il
 * Text Domain:       bridgead-woo
 * Domain Path:       /languages
 * License:           GPL-2.0-or-later
 *
 * @package BridgeAd
 */

defined( 'ABSPATH' ) || exit;

define( 'BRIDGEAD_VERSION', '0.1.0' );
define( 'BRIDGEAD_FILE', __FILE__ );
define( 'BRIDGEAD_DIR', plugin_dir_path( __FILE__ ) );
define( 'BRIDGEAD_URL', plugin_dir_url( __FILE__ ) );

/**
 * כתובת ה-API של BridgeAd. ניתן לעקוף ב-wp-config.php:
 *   define( 'BRIDGEAD_API_BASE', 'https://staging.bridgead.co.il' );
 * או דרך הפילטר `bridgead_api_base`.
 */
if ( ! defined( 'BRIDGEAD_API_BASE' ) ) {
	define( 'BRIDGEAD_API_BASE', 'https://bridgead.co.il' );
}

require_once BRIDGEAD_DIR . 'includes/class-bridgead-api.php';
require_once BRIDGEAD_DIR . 'includes/class-bridgead-queue.php';
require_once BRIDGEAD_DIR . 'includes/class-bridgead-tracker.php';
require_once BRIDGEAD_DIR . 'includes/class-bridgead-orders.php';
require_once BRIDGEAD_DIR . 'includes/class-bridgead-cron.php';
require_once BRIDGEAD_DIR . 'includes/class-bridgead-settings.php';
require_once BRIDGEAD_DIR . 'includes/class-bridgead.php';

/**
 * אתחול — רק אם WooCommerce פעיל.
 */
function bridgead_bootstrap() {
	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', 'bridgead_missing_woocommerce_notice' );
		return;
	}
	Bridgead::instance();
}
add_action( 'plugins_loaded', 'bridgead_bootstrap' );

/**
 * הודעת שגיאה כש-WooCommerce לא מותקן.
 */
function bridgead_missing_woocommerce_notice() {
	echo '<div class="notice notice-error"><p>';
	echo esc_html__( 'התוסף "BridgeAd — מעקב שותפויות" דורש ש-WooCommerce יהיה מותקן ופעיל.', 'bridgead-woo' );
	echo '</p></div>';
}

/**
 * הפעלה — קובע ברירות מחדל ומתזמן את משימות ה-cron.
 */
function bridgead_activate() {
	Bridgead_Cron::schedule();
	if ( false === get_option( 'bridgead_settings' ) ) {
		add_option(
			'bridgead_settings',
			array(
				'site_id'          => '',
				'api_key'          => '',
				'cookie_days'      => 90,
				'digest_lookback'  => 7,
				'last_verified_at' => 0,
			)
		);
	}
	add_option( 'bridgead_queue', array() );
}
register_activation_hook( __FILE__, 'bridgead_activate' );

/**
 * כיבוי — שולח ping סופי ל-BridgeAd ומנקה את ה-cron.
 * best-effort: timeout קצר, לא חוסם את המשתמש אם ה-API לא זמין.
 */
function bridgead_deactivate() {
	Bridgead_Cron::unschedule();

	if ( Bridgead_Api::instance()->is_configured() ) {
		Bridgead_Api::instance()->post(
			'/api/plugin/deactivated',
			array(
				'deactivatedAt' => gmdate( 'c' ),
				'reason'        => 'plugin_deactivated',
			),
			array( 'timeout' => 4, 'blocking' => true )
		);
	}
}
register_deactivation_hook( __FILE__, 'bridgead_deactivate' );
