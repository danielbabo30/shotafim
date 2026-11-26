<?php
require_once '/wordpress/wp-load.php';
update_option('woocommerce_cod_settings', ['enabled'=>'yes','title'=>'COD','enable_for_methods'=>[],'enable_for_virtual'=>'yes']);
update_option('woocommerce_cheque_settings', ['enabled'=>'yes','title'=>'Cheque']);
update_option('woocommerce_currency','ILS');
update_option('woocommerce_default_country','IL');
update_option('woocommerce_calc_taxes','no');
update_option('woocommerce_onboarding_profile', ['skipped'=>true]);
$p = new WC_Product_Simple();
$p->set_name('E2E Test Mug'); $p->set_slug('e2e-mug'); $p->set_regular_price('100'); $p->set_sku('E2E-MUG'); $p->set_status('publish'); $p->save();
$p2 = new WC_Product_Simple();
$p2->set_name('E2E Test Cap'); $p2->set_slug('e2e-cap'); $p2->set_regular_price('50'); $p2->set_sku('E2E-CAP'); $p2->set_status('publish'); $p2->save();
$c = new WC_Coupon(); $c->set_code('E2EWP10'); $c->set_discount_type('percent'); $c->set_amount(10); $c->save();
update_option('permalink_structure','/%postname%/'); flush_rewrite_rules();
echo "setup done\n";
