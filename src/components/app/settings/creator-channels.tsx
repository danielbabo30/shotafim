import { SectionCard } from "@/components/app/settings/form-ui";
import { SocialConnectGrid } from "@/components/app/social-connect-grid";
import type { SocialConnectionVM } from "@/lib/social-connections";

/**
 * ערוצי הסושיאל של היוצר במסך ההגדרות — נועד למשיכת נתוני הערוץ מהפלטפורמה (עוקבים,
 * צפיות, מעורבות), לא להתחברות למערכת. כל חיבור דורש אישור הסכמה מראש (נשמר ב-DB).
 * מחובר → כפתור "נתק". לא מחובר → תיבת הסכמה + כפתור חיבור (או "בקרוב" לפלטפורמה בלי אינטגרציה).
 */
export function CreatorChannels({ connections }: { connections: SocialConnectionVM[] }) {
  return (
    <SectionCard
      title="ערוצי סושיאל"
      description="חבר את הערוצים שלך כדי שהנתונים (עוקבים, צפיות, מעורבות) יסתנכרנו אוטומטית מהפלטפורמה ויוצגו כ״מאומת״ למפרסמים. אין הזנה ידנית."
    >
      <SocialConnectGrid connections={connections} />
    </SectionCard>
  );
}
