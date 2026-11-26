<?php
// הרצה: php privacy-hash-harness.php <privacyKey> <date> <ip> <email> <ua>  → JSON.
// מדמה את מינימום פונקציות WP כדי לטעון את Bridgead_Api ללא וורדפרס.
define( 'ABSPATH', __DIR__ );
define( 'BRIDGEAD_VERSION', 'test' );
$GLOBALS['opts'] = array(
	'bridgead_settings'    => array( 'site_id' => 'site1', 'api_key' => 'APIKEYAPIKEY' ),
	'bridgead_privacy_key' => $argv[1],
);
function get_option( $k, $d = false ) { return $GLOBALS['opts'][ $k ] ?? $d; }
function untrailingslashit( $s ) { return rtrim( $s, '/' ); }
require __DIR__ . '/../bridgead-woo/includes/class-bridgead-api.php';
$api = Bridgead_Api::instance();
echo json_encode( array(
	'version'  => $api->hash_version(),
	'trunc'    => Bridgead_Api::truncate_ip( $argv[3] ),
	'ip'       => $api->ip_hash( $argv[3] ),
	'ua'       => $api->ua_hash( $argv[5] ),
	'customer' => $api->customer_hash( $argv[4] ),
) );
