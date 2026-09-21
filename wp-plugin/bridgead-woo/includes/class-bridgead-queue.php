<?php
/**
 * תור retry מקומי לאירועים שנכשלו בשליחה.
 * נשמר ב-option `bridgead_queue`; מתנקז ב-WP-Cron כל 5 דקות (Bridgead_Cron).
 *
 * @package BridgeAd
 */

defined( 'ABSPATH' ) || exit;

class Bridgead_Queue {

	const OPTION    = 'bridgead_queue';
	const MAX_ITEMS = 500;
	const MAX_TRIES = 8;

	/**
	 * מוסיף אירוע לתור (או מדלג אם ה-idempotency key כבר קיים).
	 */
	public static function add( $path, $payload, $idempotency_key ) {
		$queue = self::all();

		foreach ( $queue as $item ) {
			if ( isset( $item['key'] ) && $item['key'] === $idempotency_key ) {
				return; // כבר בתור
			}
		}

		if ( count( $queue ) >= self::MAX_ITEMS ) {
			array_shift( $queue ); // מפילים את הישן ביותר כדי לא לפוצץ את ה-option
		}

		$queue[] = array(
			'key'      => $idempotency_key,
			'path'     => $path,
			'payload'  => $payload,
			'tries'    => 0,
			'added_at' => time(),
			'next_at'  => time(),
		);

		update_option( self::OPTION, $queue, false );
	}

	/**
	 * @return array
	 */
	public static function all() {
		$queue = get_option( self::OPTION, array() );
		return is_array( $queue ) ? $queue : array();
	}

	public static function size() {
		return count( self::all() );
	}

	/**
	 * מנסה לשלוח את כל הפריטים שהגיע זמנם. נקרא מ-cron.
	 */
	public static function flush() {
		$queue = self::all();
		if ( empty( $queue ) ) {
			return;
		}

		$api  = Bridgead_Api::instance();
		$now  = time();
		$kept = array();

		foreach ( $queue as $item ) {
			if ( ! empty( $item['next_at'] ) && $item['next_at'] > $now ) {
				$kept[] = $item; // עדיין ב-backoff
				continue;
			}

			$result = $api->post( $item['path'], $item['payload'] );

			if ( $result['ok'] ) {
				continue; // הצליח — מסירים מהתור
			}

			$item['tries']   = (int) $item['tries'] + 1;
			$item['last_err'] = $result['error'];

			if ( $item['tries'] >= self::MAX_TRIES ) {
				// מוותרים — רושמים ללוג ומסתמכים על ה-digest הלילי להשלמה
				error_log( sprintf( 'BridgeAd: dropping event %s after %d tries (%s)', $item['path'], $item['tries'], $result['error'] ) );
				continue;
			}

			// exponential backoff: 1, 2, 4, 8 ... דקות, מוגבל לשעה
			$delay          = min( 3600, 60 * pow( 2, $item['tries'] - 1 ) );
			$item['next_at'] = $now + $delay;
			$kept[]          = $item;
		}

		update_option( self::OPTION, $kept, false );
	}

	public static function clear() {
		update_option( self::OPTION, array(), false );
	}
}
