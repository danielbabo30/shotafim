<?php
/**
 * מסך ההגדרות של התוסף: הזנת קוד צימוד (siteId.apiKey), בדיקת חיבור ותצוגת תור השליחה.
 *
 * @package BridgeAd
 */

defined( 'ABSPATH' ) || exit;

class Bridgead_Settings {

	const SLUG  = 'bridgead-woo';
	const NONCE = 'bridgead_settings_nonce';

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'handle_save' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
		add_action( 'wp_ajax_bridgead_verify', array( $this, 'ajax_verify' ) );
	}

	public function menu() {
		add_submenu_page(
			'woocommerce',
			__( 'BridgeAd — מעקב שותפויות', 'bridgead-woo' ),
			__( 'BridgeAd', 'bridgead-woo' ),
			'manage_woocommerce',
			self::SLUG,
			array( $this, 'render' )
		);
	}

	public function assets( $hook ) {
		if ( 'woocommerce_page_' . self::SLUG !== $hook ) {
			return;
		}
		wp_enqueue_style( 'bridgead-admin', BRIDGEAD_URL . 'assets/admin.css', array(), BRIDGEAD_VERSION );
		wp_enqueue_script( 'bridgead-admin', BRIDGEAD_URL . 'assets/admin.js', array( 'jquery' ), BRIDGEAD_VERSION, true );
		wp_localize_script(
			'bridgead-admin',
			'BridgeAdAdmin',
			array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'nonce'   => wp_create_nonce( 'bridgead_verify' ),
				'i18n'    => array(
					'checking'  => __( 'בודק חיבור…', 'bridgead-woo' ),
					'connected' => __( 'מחובר ל-BridgeAd', 'bridgead-woo' ),
					'failed'    => __( 'החיבור נכשל', 'bridgead-woo' ),
				),
			)
		);
	}

	public function handle_save() {
		if ( ! isset( $_POST['bridgead_save'] ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}
		check_admin_referer( self::NONCE );

		$settings = get_option( 'bridgead_settings', array() );

		if ( isset( $_POST['bridgead_pairing'] ) ) {
			$raw = trim( sanitize_text_field( wp_unslash( $_POST['bridgead_pairing'] ) ) );
			if ( '' !== $raw && false !== strpos( $raw, '.' ) ) {
				list( $site_id, $api_key ) = explode( '.', $raw, 2 );
				$settings['site_id'] = preg_replace( '/[^A-Za-z0-9_-]/', '', $site_id );
				$settings['api_key'] = preg_replace( '/[^A-Za-z0-9]/', '', $api_key );
			} elseif ( '' === $raw ) {
				$settings['site_id'] = '';
				$settings['api_key'] = '';
			}
		}

		$settings['cookie_days']     = isset( $_POST['bridgead_cookie_days'] )
			? max( 1, min( 90, absint( $_POST['bridgead_cookie_days'] ) ) )
			: 90;
		$settings['digest_lookback'] = isset( $_POST['bridgead_digest_lookback'] )
			? max( 1, min( 60, absint( $_POST['bridgead_digest_lookback'] ) ) )
			: 7;

		update_option( 'bridgead_settings', $settings );

		wp_safe_redirect( add_query_arg( array( 'page' => self::SLUG, 'saved' => '1' ), admin_url( 'admin.php' ) ) );
		exit;
	}

	/**
	 * בדיקת חיבור — שולח heartbeat (אין endpoint verify נפרד) ומחזיר את הסטטוס.
	 */
	public function ajax_verify() {
		check_ajax_referer( 'bridgead_verify' );
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_send_json_error( array( 'message' => __( 'אין הרשאה.', 'bridgead-woo' ) ), 403 );
		}

		if ( ! Bridgead_Api::instance()->is_configured() ) {
			wp_send_json_error( array( 'message' => __( 'לא הוזן קוד צימוד.', 'bridgead-woo' ) ) );
		}

		$result = Bridgead_Api::instance()->post(
			'/api/plugin/heartbeat',
			array(
				'pluginVersion'     => BRIDGEAD_VERSION,
				'wooVersion'        => defined( 'WC_VERSION' ) ? WC_VERSION : 'unknown',
				'wpVersion'         => get_bloginfo( 'version' ),
				'phpVersion'        => PHP_VERSION,
				'ordersSinceLast'   => 0,
				'stuckWebhookQueue' => Bridgead_Queue::size(),
				'sentAt'            => gmdate( 'c' ),
			)
		);

		if ( ! $result['ok'] ) {
			wp_send_json_error( array( 'message' => $result['error'] ) );
		}

		$settings                    = get_option( 'bridgead_settings', array() );
		$settings['last_verified_at'] = time();
		update_option( 'bridgead_settings', $settings );

		wp_send_json_success( $result['body'] );
	}

	public function render() {
		$settings   = get_option( 'bridgead_settings', array() );
		$site_id    = isset( $settings['site_id'] ) ? $settings['site_id'] : '';
		$configured = Bridgead_Api::instance()->is_configured();
		$verified   = ! empty( $settings['last_verified_at'] );
		?>
		<div class="wrap bridgead-wrap" dir="rtl">
			<h1><?php esc_html_e( 'BridgeAd — מעקב שותפויות', 'bridgead-woo' ); ?></h1>

			<?php if ( isset( $_GET['saved'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'ההגדרות נשמרו.', 'bridgead-woo' ); ?></p></div>
			<?php endif; ?>

			<div class="bridgead-status <?php echo $verified ? 'is-ok' : 'is-idle'; ?>" id="bridgead-status">
				<span class="dot"></span>
				<span class="label">
					<?php
					echo $verified
						? esc_html__( 'מחובר ל-BridgeAd', 'bridgead-woo' )
						: esc_html__( 'טרם אומת חיבור', 'bridgead-woo' );
					?>
				</span>
				<button type="button" class="button" id="bridgead-verify" <?php disabled( ! $configured ); ?>>
					<?php esc_html_e( 'בדיקת חיבור', 'bridgead-woo' ); ?>
				</button>
			</div>

			<form method="post" action="">
				<?php wp_nonce_field( self::NONCE ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row">
							<label for="bridgead_pairing"><?php esc_html_e( 'קוד צימוד', 'bridgead-woo' ); ?></label>
						</th>
						<td>
							<input type="text" name="bridgead_pairing" id="bridgead_pairing"
								class="regular-text ltr" dir="ltr" autocomplete="off"
								value=""
								placeholder="<?php echo esc_attr( $site_id ? $site_id . '.••••••••••••' : 'siteId.apiKey' ); ?>" />
							<p class="description">
								<?php
								printf(
									/* translators: %s: link to the BridgeAd dashboard */
									esc_html__( 'העתיקו מהאזור האישי ב-BridgeAd, במסך %s. הזנה מחדש דורסת את הקיים.', 'bridgead-woo' ),
									'<a href="https://bridgead.co.il/dashboard/plugin" target="_blank" rel="noopener">' . esc_html__( 'התקנת תוסף המעקב', 'bridgead-woo' ) . '</a>'
								);
								?>
							</p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="bridgead_cookie_days"><?php esc_html_e( 'תוקף cookie השיוך (ימים)', 'bridgead-woo' ); ?></label>
						</th>
						<td>
							<input type="number" min="1" max="90" name="bridgead_cookie_days" id="bridgead_cookie_days"
								value="<?php echo esc_attr( isset( $settings['cookie_days'] ) ? $settings['cookie_days'] : 90 ); ?>" />
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="bridgead_digest_lookback"><?php esc_html_e( 'חלון ה-digest הלילי (ימים)', 'bridgead-woo' ); ?></label>
						</th>
						<td>
							<input type="number" min="1" max="60" name="bridgead_digest_lookback" id="bridgead_digest_lookback"
								value="<?php echo esc_attr( isset( $settings['digest_lookback'] ) ? $settings['digest_lookback'] : 7 ); ?>" />
						</td>
					</tr>
				</table>
				<p class="submit">
					<button type="submit" name="bridgead_save" class="button button-primary"><?php esc_html_e( 'שמירה', 'bridgead-woo' ); ?></button>
				</p>
			</form>

			<div id="bridgead-summary" class="bridgead-summary" hidden>
				<h2><?php esc_html_e( 'סטטוס האתר', 'bridgead-woo' ); ?></h2>
				<div class="bridgead-site-status"></div>
			</div>

			<p class="bridgead-queue">
				<?php
				printf(
					/* translators: %d: number of queued events */
					esc_html__( 'אירועים בתור השליחה: %d', 'bridgead-woo' ),
					(int) Bridgead_Queue::size()
				);
				?>
				&nbsp;·&nbsp;
				<?php esc_html_e( 'שרת:', 'bridgead-woo' ); ?>
				<code class="bridgead-code"><?php echo esc_html( Bridgead_Api::instance()->base_url() ); ?></code>
				<?php if ( defined( 'BRIDGEAD_API_BASE' ) && 'https://bridgead.co.il' !== BRIDGEAD_API_BASE ) : ?>
					<em>(<?php esc_html_e( 'נדרס ב-wp-config', 'bridgead-woo' ); ?>)</em>
				<?php endif; ?>
			</p>
		</div>
		<?php
	}
}
