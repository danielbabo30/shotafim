<?php
/**
 * Plugin Name:       BridgeAd — מעקב שותפויות
 * Plugin URI:        https://app.bridgead.co.il/dashboard/plugin
 * Description:        מחבר את חנות ה-WooCommerce שלך ל-BridgeAd: דוגם קליקים ורכישות דרך קישורי השיוך והקופונים של היוצרים, ומחשב את העמלה שמגיעה לכל יוצר.
 * Version:           0.2.2
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            BridgeAd
 * Author URI:        https://bridgead.co.il
 * Text Domain:       bridgead-woo
 * Domain Path:       /languages
 * License:           GPL-2.0-or-later
 *
 * @package BridgeAd
 */

defined( 'ABSPATH' ) || exit;

define( 'BRIDGEAD_VERSION', '0.2.2' );
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
 * תאימות HPOS (custom_order_tables) ו-Cart/Checkout Blocks. התוסף משתמש רק ב-CRUD API של
 * WC_Order (get_meta/update_meta_data/save, wc_get_orders) ובהוקים של Store API — ללא גישה ישירה ל-postmeta.
 */
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', BRIDGEAD_FILE, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', BRIDGEAD_FILE, true );
		}
	}
);

/**
 * אתחול — רק אם WooCommerce פעיל.
 */
function bridgead_bootstrap() {
	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', 'bridgead_missing_woocommerce_notice' );
		return;
	}
	// קישור "הגדרות" בשורת הפעולות במסך התוספים (רק כש-WooCommerce פעיל ולמי שיש הרשאה למסך).
	add_filter( 'plugin_action_links_' . plugin_basename( BRIDGEAD_FILE ), 'bridgead_action_links' );
	Bridgead::instance();
}
add_action( 'plugins_loaded', 'bridgead_bootstrap' );

/**
 * @param array $links
 * @return array
 */
function bridgead_action_links( $links ) {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return $links;
	}
	array_unshift(
		$links,
		'<a href="' . esc_url( admin_url( 'admin.php?page=bridgead-woo' ) ) . '">' . esc_html__( 'הגדרות', 'bridgead-woo' ) . '</a>'
	);
	return $links;
}

/**
 * ההודעה למשתמש כש-WooCommerce לא פעיל.
 */
function bridgead_missing_woocommerce_message() {
	return __( 'תוסף זה מבוסס ווקומרס, יהיה ניתן להתקין אותו לאחר הפעלה של ווקומרס.', 'bridgead-woo' );
}

/**
 * הודעת מנהל כש-WooCommerce הפסיק להיות פעיל (למשל אחרי כיבויו) — התוסף לא טוען את הפונקציונליות.
 */
function bridgead_missing_woocommerce_notice() {
	echo '<div class="notice notice-error"><p>';
	echo esc_html( bridgead_missing_woocommerce_message() );
	echo '</p></div>';
}

/**
 * הפעלה — קובע ברירות מחדל ומתזמן את משימות ה-cron.
 */
function bridgead_activate() {
	// בלי WooCommerce פעיל — לא מפעילים את התוסף, ומציגים הודעה ברורה (בעברית) במקום שגיאה כללית.
	if ( ! class_exists( 'WooCommerce' ) ) {
		deactivate_plugins( plugin_basename( BRIDGEAD_FILE ) );
		wp_die(
			esc_html( bridgead_missing_woocommerce_message() ),
			esc_html__( 'BridgeAd — נדרש ווקומרס', 'bridgead-woo' ),
			array(
				'response'       => 200,
				'back_link'      => false,
				'text_direction' => 'rtl',
				'link_url'       => admin_url( 'plugins.php' ),
				'link_text'      => 'חזרה לתוספים',
			)
		);
	}

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

	// B-1: אחרי הפעלה מחדש — heartbeat מיידי (קצר) כדי שהשרת יחזיר את האתר ל-ACTIVE בלי לחכות 6 שעות.
	// נכשל? ה-cron (heartbeat בעוד ~5 דק') ימשיך.
	if ( Bridgead_Api::instance()->is_configured() ) {
		Bridgead_Api::instance()->send_heartbeat( 0, array( 'timeout' => 5 ) );
	}
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
