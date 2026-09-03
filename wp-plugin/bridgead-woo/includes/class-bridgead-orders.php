<?php
/**
 * מעקב רכישות — שולח ל-BridgeAd כל הזמנה ששולמה שנושאת ref או קוד קופון,
 * ומעדכן סטטוס בעת החזר / ביטול. תואם למסמך "BridgeAd Tracking API".
 *
 * @package BridgeAd
 */

defined( 'ABSPATH' ) || exit;

class Bridgead_Orders {

	public function __construct() {
		add_action( 'woocommerce_payment_complete', array( $this, 'on_paid' ), 20, 1 );
		add_action( 'woocommerce_order_status_completed', array( $this, 'on_paid' ), 20, 1 );
		add_action( 'woocommerce_order_status_changed', array( $this, 'on_status_changed' ), 20, 4 );
		add_action( 'woocommerce_order_refunded', array( $this, 'on_partial_refund' ), 20, 2 );
	}

	/**
	 * האם ההזמנה רלוונטית ל-BridgeAd (יש ref או קוד קופון).
	 */
	private function is_attributable( WC_Order $order ) {
		return '' !== (string) $order->get_meta( '_bridgead_ref' ) || ! empty( $order->get_coupon_codes() );
	}

	/**
	 * הזמנה ששולמה → /api/track/order.
	 *
	 * @param int $order_id
	 */
	public function on_paid( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order || ! $this->is_attributable( $order ) || $order->get_meta( '_bridgead_reported' ) ) {
			return;
		}

		$email = strtolower( trim( (string) $order->get_billing_email() ) );

		$payload = array(
			'externalOrderId' => (string) $order->get_id(),
			'orderPlacedAt'   => $order->get_date_created() ? $order->get_date_created()->format( 'c' ) : gmdate( 'c' ),
			'currency'        => $order->get_currency(),
			'orderStatus'     => $order->get_status(),
			'amounts'         => array(
				'itemsSubtotal' => (float) $order->get_subtotal(),
				'discountTotal' => (float) $order->get_total_discount(),
				'taxTotal'      => (float) $order->get_total_tax(),
				'shippingTotal' => (float) $order->get_shipping_total(),
				'grandTotal'    => (float) $order->get_total(),
			),
			'lineItems'       => $this->line_items( $order ),
			'couponCodes'     => array_values( array_map( 'strtoupper', $order->get_coupon_codes() ) ),
			'customerHash'    => '' === $email ? '' : hash( 'sha256', $email . Bridgead_Api::instance()->site_pepper() ),
			'isNewCustomer'   => $this->is_new_customer( $email, $order->get_id() ),
		);

		$ref = (string) $order->get_meta( '_bridgead_ref' );
		if ( '' !== $ref ) {
			$payload['refCode'] = $ref;
		}

		Bridgead_Api::instance()->enqueue_or_send(
			'/api/track/order',
			$payload,
			'order:' . $order->get_id()
		);

		$order->update_meta_data( '_bridgead_reported', 1 );
		$order->save();
	}

	/**
	 * כל מעבר סטטוס אחרי שההזמנה כבר דווחה → /api/track/order-status.
	 *
	 * @param int      $order_id
	 * @param string   $from
	 * @param string   $to
	 * @param WC_Order $order
	 */
	public function on_status_changed( $order_id, $from, $to, $order ) {
		if ( ! $order || ! $order->get_meta( '_bridgead_reported' ) ) {
			return;
		}

		$map = array(
			'completed' => 'completed',
			'refunded'  => 'refunded',
			'cancelled' => 'cancelled',
			'failed'    => 'failed',
			'on-hold'   => 'on-hold',
		);
		if ( ! isset( $map[ $to ] ) ) {
			return;
		}

		Bridgead_Api::instance()->enqueue_or_send(
			'/api/track/order-status',
			array(
				'externalOrderId' => (string) $order_id,
				'newStatus'       => $map[ $to ],
				'occurredAt'      => gmdate( 'c' ),
			),
			'order-status:' . $order_id . ':' . $to
		);
	}

	/**
	 * החזר חלקי.
	 *
	 * @param int $order_id
	 * @param int $refund_id
	 */
	public function on_partial_refund( $order_id, $refund_id ) {
		$order  = wc_get_order( $order_id );
		$refund = wc_get_order( $refund_id );
		if ( ! $order || ! $refund || ! $order->get_meta( '_bridgead_reported' ) ) {
			return;
		}
		// החזר מלא מטופל דרך on_status_changed('refunded')
		if ( 'refunded' === $order->get_status() ) {
			return;
		}

		Bridgead_Api::instance()->enqueue_or_send(
			'/api/track/order-status',
			array(
				'externalOrderId' => (string) $order_id,
				'newStatus'       => 'partially-refunded',
				'refundedAmount'  => abs( (float) $refund->get_total() ),
				'occurredAt'      => gmdate( 'c' ),
			),
			'order-status:' . $order_id . ':partial:' . $refund_id
		);
	}

	private function line_items( WC_Order $order ) {
		$landing = (string) $order->get_meta( '_bridgead_landing' );
		$items   = array();

		foreach ( $order->get_items() as $item ) {
			/** @var WC_Order_Item_Product $item */
			$product   = $item->get_product();
			$subtotal  = (float) $item->get_subtotal();
			$total     = (float) $item->get_total();
			$permalink = $product ? get_permalink( $product->get_id() ) : '';

			$items[] = array(
				'sku'               => $product ? (string) $product->get_sku() : '',
				'productId'         => $product ? (string) $product->get_id() : '',
				'name'              => $item->get_name(),
				'quantity'          => (int) $item->get_quantity(),
				'lineSubtotal'      => $subtotal,
				'lineDiscount'      => max( 0, $subtotal - $total ),
				'isReferredProduct' => $this->is_referred( $permalink, $product, $landing ),
			);
		}
		return $items;
	}

	/**
	 * האם המוצר הוא זה שהלינק הפנה אליו — השוואה מול ה-landing URL של הקליק.
	 */
	private function is_referred( $permalink, $product, $landing ) {
		if ( '' === $landing || ! $product ) {
			return false;
		}
		$slug = $product->get_slug();
		$id   = (string) $product->get_id();
		if ( '' !== $slug && false !== strpos( $landing, '/' . $slug ) ) {
			return true;
		}
		if ( false !== strpos( $landing, 'p=' . $id ) || false !== strpos( $landing, 'product_id=' . $id ) ) {
			return true;
		}
		return $permalink && 0 === strpos( $landing, untrailingslashit( $permalink ) );
	}

	/**
	 * לקוח חדש = אין לו הזמנה שהושלמה/בתהליך קודמת.
	 */
	private function is_new_customer( $email, $exclude_id ) {
		if ( '' === $email ) {
			return true;
		}
		$prior = wc_get_orders(
			array(
				'billing_email' => $email,
				'exclude'       => array( $exclude_id ),
				'limit'         => 1,
				'return'        => 'ids',
				'status'        => array( 'wc-completed', 'wc-processing', 'wc-refunded' ),
			)
		);
		return empty( $prior );
	}
}
