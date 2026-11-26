<?php
// TEST ONLY helper: /?e2e_tool=<name>&k=e2e&... (never ship)
add_action('init', function(){
  if (empty($_GET['e2e_tool']) || ($_GET['k'] ?? '') !== 'e2e') return;
  header('Content-Type: text/plain');
  switch ($_GET['e2e_tool']) {
    case 'coupon':
      $c = new WC_Coupon(); $c->set_code($_GET['code']); $c->set_discount_type('percent'); $c->set_amount(10); $c->save(); echo "coupon ok\n"; break;
    case 'refund_partial':
      $r = wc_create_refund(['order_id'=>(int)$_GET['id'],'amount'=>(float)$_GET['amount'],'reason'=>'e2e partial']);
      echo is_wp_error($r) ? $r->get_error_message() : "refund ".$r->get_id()."\n"; break;
    case 'refund_full':
      $o = wc_get_order((int)$_GET['id']); $r = wc_create_refund(['order_id'=>$o->get_id(),'amount'=>$o->get_total(),'reason'=>'e2e full']);
      echo is_wp_error($r)?$r->get_error_message():"refund ".$r->get_id()."\n"; $o = wc_get_order($o->get_id()); echo $o->get_status()."\n"; break;
    case 'status':
      $o = wc_get_order((int)$_GET['id']); $o->update_status($_GET['to']); echo $o->get_status()."\n"; break;
    case 'deact_ping': $r = Bridgead_Api::instance()->post('/api/plugin/deactivated',['deactivatedAt'=>gmdate('c'),'reason'=>'e2e']); echo json_encode($r)."\n"; break;
    case 'click_now': $_GET['bgad_ref']=$_GET['ref']; (new Bridgead_Tracker())->capture_click(); echo "ok\n"; break;
    case 'state': echo json_encode([Bridgead_Api::instance()->connection_state(), 'offset'=>Bridgead_Api::instance()->clock_offset()])."\n"; break;
    case 'hbraw': $c=Bridgead_Api::instance()->credentials(); $b=wp_json_encode(['pluginVersion'=>'x','wooVersion'=>'1','ordersSinceLast'=>0,'stuckWebhookQueue'=>0,'sentAt'=>gmdate('c')]); $t=(string)time(); $r=wp_remote_post(Bridgead_Api::instance()->base_url().'/api/plugin/heartbeat',['timeout'=>30,'headers'=>['Content-Type'=>'application/json','X-BridgeAd-Site'=>$c['site_id'],'X-BridgeAd-Timestamp'=>$t,'X-BridgeAd-Signature'=>'sha256='.hash_hmac('sha256',$t.'.'.$b,$c['api_key'])],'body'=>$b]); echo is_wp_error($r)?$r->get_error_message():wp_remote_retrieve_response_code($r).' '.substr(wp_remote_retrieve_body($r),0,1500); break;
    case 'creds': echo json_encode(Bridgead_Api::instance()->credentials()); break;
    case 'meta': $o=wc_get_order((int)$_GET['id']); echo $o->get_status().' ref='.$o->get_meta('_bridgead_ref').' reported='.$o->get_meta('_bridgead_reported').' coupons='.json_encode($o->get_coupon_codes())."\n"; break;
    case 'features': foreach(['custom_order_tables','cart_checkout_blocks'] as $f){ $r=\Automattic\WooCommerce\Utilities\FeaturesUtil::get_compatible_plugins_for_feature($f,true); echo $f.': '.json_encode(['compatible'=>in_array('bridgead-woo/bridgead-woo.php',$r['compatible']),'incompatible'=>in_array('bridgead-woo/bridgead-woo.php',$r['incompatible']),'uncertain'=>in_array('bridgead-woo/bridgead-woo.php',$r['uncertain'])])."\n"; } break;
    case 'queue': echo json_encode(array_map(function($i){return [$i['path'],$i['tries'],$i['next_at']-time(),$i['last_err']??''];}, Bridgead_Queue::all()))."\n"; break;
    case 'cron_run': Bridgead_Queue::flush(); echo "flushed size=".Bridgead_Queue::size()."\n"; break;
    case 'hb': $r = Bridgead_Api::instance()->send_heartbeat(0); unset($r['body']['privacyKey']); echo json_encode($r)."\n"; break;
    case 'digest': (new Bridgead_Cron())->digest(); echo "digest called\n"; break;
    case 'wc_off': $a=get_option('active_plugins'); update_option('active_plugins',array_values(array_diff($a,['woocommerce/woocommerce.php']))); echo json_encode(get_option('active_plugins')); break;
    case 'wc_on': $a=get_option('active_plugins'); $a[]='woocommerce/woocommerce.php'; update_option('active_plugins',array_values(array_unique($a))); echo json_encode(get_option('active_plugins')); break;
    case 'mksub': if(!username_exists('e2esub')) wp_create_user('e2esub','e2esubpass','e2esub@example.com'); echo 'ok'; break;
    case 'lsplug': echo json_encode(scandir(WP_PLUGIN_DIR)); echo json_encode(is_dir(WP_PLUGIN_DIR.'/bridgead-woo') ? scandir(WP_PLUGIN_DIR.'/bridgead-woo') : 'nodir'); break;
    case 'rmplug': require_once ABSPATH.'wp-admin/includes/file.php'; WP_Filesystem(); global $wp_filesystem; echo var_export($wp_filesystem->delete(WP_PLUGIN_DIR.'/bridgead-woo', true), true); break;
    case 'opts': foreach(['bridgead_settings','bridgead_privacy_key','bridgead_queue','bridgead_last_heartbeat'] as $o) echo $o.'='.(get_option($o)===false?'(absent)':'present')."\n"; echo 'cron='.json_encode(array_keys(array_filter(_get_cron_array() ?: [], function($v){return array_filter(array_keys($v),function($h){return strpos($h,'bridgead')===0;});})))."\n"; break;
  }
  exit;
}, 20);
add_action('init', function(){ if (($_GET['e2e_tool']??'')==='mksub' && ($_GET['k']??'')==='e2e') { if(!username_exists('e2esub')) wp_create_user('e2esub','e2esubpass','e2esub@example.com'); echo 'ok'; exit; } }, 20);
