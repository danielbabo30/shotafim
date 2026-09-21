<?php
/**
 * מאתחל מרכזי — טוען את כל הרכיבים פעם אחת.
 *
 * @package BridgeAd
 */

defined( 'ABSPATH' ) || exit;

class Bridgead {

	/**
	 * @var Bridgead|null
	 */
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		new Bridgead_Tracker();
		new Bridgead_Orders();
		new Bridgead_Cron();

		if ( is_admin() ) {
			new Bridgead_Settings();
		}

		// משלים תזמון חסר (למשל אחרי שדרוג גרסה).
		Bridgead_Cron::schedule();

		add_action( 'admin_bar_menu', array( $this, 'admin_bar' ), 90 );
	}

	/**
	 * חיווי מהיר בסרגל הניהול.
	 */
	public function admin_bar( $bar ) {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}
		$configured = Bridgead_Api::instance()->is_configured();
		$bar->add_node(
			array(
				'id'    => 'bridgead',
				'title' => 'BridgeAd' . ( $configured ? '' : ' ⚠' ),
				'href'  => admin_url( 'admin.php?page=' . Bridgead_Settings::SLUG ),
			)
		);
	}
}
