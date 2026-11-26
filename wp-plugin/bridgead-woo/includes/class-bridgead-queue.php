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

	const LOCK_TRANSIENT = 'bridgead_flush_lock';
	const FLUSH_BUDGET   = 25; // שניות — מגבלת זמן לריצה אחת (השאר ממשיך בריצה הבאה)

	/**
	 * מנסה לשלוח את כל הפריטים שהגיע זמנם. נקרא מ-cron / מ-shutdown אחרי קליק.
	 * נעילה קצרה מונעת ריצות מקבילות ששולחות כפול ודורסות את ה-option.
	 */
	public static function flush() {
		if ( empty( self::all() ) ) {
			return;
		}
		if ( get_transient( self::LOCK_TRANSIENT ) ) {
			return;
		}
		set_transient( self::LOCK_TRANSIENT, 1, 60 );

		try {
			self::flush_locked();
		} finally {
			delete_transient( self::LOCK_TRANSIENT );
		}
	}

	private static function flush_locked() {
		$api     = Bridgead_Api::instance();
		$now     = time();
		$started = microtime( true );
		$kept    = array();
		$queue   = self::all();

		foreach ( $queue as $idx => $item ) {
			if ( ! empty( $item['next_at'] ) && $item['next_at'] > $now ) {
				$kept[] = $item; // עדיין ב-backoff
				continue;
			}
			if ( microtime( true ) - $started > self::FLUSH_BUDGET ) {
				$kept[] = $item; // נגמר תקציב הזמן — בריצה הבאה
				continue;
			}

			$result = $api->post( $item['path'], $item['payload'] );

			if ( $result['ok'] ) {
				continue; // הצליח — מסירים מהתור
			}

			if ( $api->is_disconnected() ) {
				// החנות נותקה בצד BridgeAd — עוצרים; משאירים את כל מה שנותר בתור.
				$kept = array_merge( $kept, array_slice( $queue, $idx ) );
				break;
			}

			if ( Bridgead_Api::is_permanent( $result ) ) {
				error_log( sprintf( 'BridgeAd: dropping event %s — permanent failure (%d %s)', $item['path'], (int) $result['code'], $result['reason'] ) );
				continue;
			}

			$item['tries']    = (int) $item['tries'] + 1;
			$item['last_err'] = $result['error'];

			if ( $item['tries'] >= self::MAX_TRIES ) {
				// מוותרים — רושמים ללוג ומסתמכים על ה-digest הלילי להשלמה
				error_log( sprintf( 'BridgeAd: dropping event %s after %d tries (%s)', $item['path'], $item['tries'], $result['error'] ) );
				continue;
			}

			// exponential backoff: 1, 2, 4, 8 ... דקות, מוגבל לשעה
			$delay           = min( 3600, 60 * pow( 2, $item['tries'] - 1 ) );
			$item['next_at'] = $now + $delay;
			$kept[]          = $item;
		}

		// מיזוג: פריטים שנוספו לתור בזמן הריצה (ע"י בקשות מקבילות) נשמרים.
		$known = array();
		foreach ( $queue as $q ) {
			$known[ $q['key'] ] = true;
		}
		foreach ( self::all() as $q ) {
			if ( ! isset( $known[ $q['key'] ] ) ) {
				$kept[] = $q;
			}
		}

		update_option( self::OPTION, $kept, false );
	}

	public static function clear() {
		update_option( self::OPTION, array(), false );
	}
}
