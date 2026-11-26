<?php
// TEST ONLY: self-signed cert for localhost dev server + API base + fault injection via /mnt/e2e/mode.txt
function e2e_mode(){ $f='/mnt/e2e/mode.txt'; return file_exists($f)? trim(file_get_contents($f)) : ''; }
add_filter('http_request_args', function($a,$url){
  $a['sslverify']=false;
  if (strpos($url,'localhost:3000')!==false || strpos($url,'localhost:3999')!==false) {
    if (e2e_mode()==='badsig' && isset($a['headers']['X-BridgeAd-Signature'])) $a['headers']['X-BridgeAd-Signature']='sha256='.str_repeat('0',64);
    if (e2e_mode()==='skew' && isset($a['headers']['X-BridgeAd-Timestamp'])) $a['headers']['X-BridgeAd-Timestamp']=(string)(time()-3600);
  }
  // wrongclock: מדמה שעון-מארח שמפגר שעה (חתימה מחושבת מחדש; תשובת serverTime מוזזת בהתאם)
  if (e2e_mode()==='wrongclock' && isset($a['headers']['X-BridgeAd-Timestamp']) && strpos($url,'localhost:3000')!==false) {
    $st=get_option('bridgead_settings'); $ts=(string)(((int)$a['headers']['X-BridgeAd-Timestamp'])-3600);
    $a['headers']['X-BridgeAd-Timestamp']=$ts;
    $a['headers']['X-BridgeAd-Signature']='sha256='.hash_hmac('sha256',$ts.'.'.$a['body'],$st['api_key']);
  }
  return $a; }, 99, 2);
add_filter('http_response', function($r,$a,$url){
  if (e2e_mode()==='wrongclock' && !is_wp_error($r) && (int)wp_remote_retrieve_response_code($r)===401) {
    $j=json_decode(wp_remote_retrieve_body($r),true);
    if (is_array($j) && isset($j['serverTime'])) { $j['serverTime']+=3600; $r['body']=wp_json_encode($j); }
  }
  return $r; }, 99, 3);
add_filter('bridgead_api_base', function(){ return e2e_mode()==='down' ? 'https://localhost:3999' : 'https://localhost:3000'; });
