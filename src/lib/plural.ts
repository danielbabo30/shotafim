/**
 * ריבוי בעברית: "הצעה אחת" / "2 הצעות".
 * one — צורת היחיד עם "אחת/אחד" (למשל "הצעה אחת"); many — צורת הרבים בלי המספר (למשל "הצעות").
 */
export function pluralHe(n: number, one: string, many: string): string {
  return n === 1 ? one : `${n} ${many}`;
}
