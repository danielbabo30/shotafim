import "server-only";
import { cache } from "react";

/**
 * נתוני מרכז ההודעות של האזור האישי — רשימת שיחות + ה-thread המלא של כל אחת.
 *
 * ⚠️ PLACEHOLDER — המודלים Conversation / ConversationParticipant / Message כבר
 * קיימים בסכמת Prisma, אבל אין להם seed וקמפיינים/חוזים עדיין לא נבנו. כרגע
 * מוחזרות שיחות-דמה קבועות כדי לבנות ולבדוק את ה-UI (כמו dashboard-brand.ts /
 * reports.ts). כשהמודלים יחוברו — להחליף את גוף getMessagesData בשאילתות Prisma
 * המסוננות למשתמש המחובר (conversations → participants → messages, ordered),
 * חתימת הפונקציה והטיפוסים אמורים להישאר.
 */

export type ConversationContextKind = "contract" | "campaign" | "application";

export type ConversationContext = {
  kind: ConversationContextKind;
  /** תווית ההקשר להצגה — שם הקמפיין / החוזה */
  label: string;
  /** קישור לחדר העבודה של החוזה (רק kind === "contract") */
  workspaceHref?: string;
  /** סכום נעול בנאמנות, ש״ח (רק kind === "contract") */
  escrowAmountILS?: number;
};

export type MessageAttachmentKind = "video" | "image" | "document";

export type MessageAttachment = {
  kind: MessageAttachmentKind;
  /** שם הקובץ — "סקיצה_גרסה_2.mp4" */
  name: string;
  /** שורת מטא — "48MB • וידאו" */
  meta: string;
  href?: string;
};

/** פריט בזרם ה-thread — הודעת מערכת, מפריד תאריך, או הודעה */
export type ThreadEntry =
  | { type: "system"; id: string; text: string }
  | { type: "day"; id: string; label: string }
  | {
      type: "message";
      id: string;
      /** in = הצד השני · out = המשתמש המחובר */
      direction: "in" | "out";
      body?: string;
      attachment?: MessageAttachment;
      /** חותמת שעה מפורמטת — "14:32" */
      time: string;
      /** אישור קריאה — רלוונטי רק ל-direction === "out" */
      read?: boolean;
    };

export type ConversationSummary = {
  id: string;
  /** שם הצד השני */
  name: string;
  /** כינוי משני — "@daniel_foodie" */
  handle?: string;
  avatarUrl?: string;
  online?: boolean;
  context?: ConversationContext;
  /** תצוגה מקדימה של ההודעה האחרונה */
  preview: string;
  /** "14:32" / "אתמול" / "12.05" */
  timeLabel: string;
  unread?: boolean;
  /** ב-placeholder כל ה-thread נטען מראש */
  entries: ThreadEntry[];
};

export type MessagesData = {
  conversations: ConversationSummary[];
};

/** מפתחות סינון רשימת השיחות */
export type MessageFilterKey = "all" | "contracts" | "quotes";

const PLACEHOLDER: MessagesData = {
  conversations: [
    {
      id: "conv-daniel",
      name: "דניאל פודי",
      handle: "@daniel_foodie",
      online: true,
      context: {
        kind: "contract",
        label: "השקת תפריט קיץ",
        workspaceHref: "/dashboard/contracts",
        escrowAmountILS: 3500,
      },
      preview: "שלחתי את הסקיצה השנייה לעיונך, מחכה לפידבק!",
      timeLabel: "14:32",
      unread: true,
      entries: [
        {
          type: "system",
          id: "sys-1",
          text: "התקציב בסך ₪3,500 ננעל בהצלחה בנאמנות BridgeAd.",
        },
        { type: "day", id: "day-1", label: "היום" },
        {
          type: "message",
          id: "m-1",
          direction: "in",
          body: "היי! צילמתי את הסרטון לפי הבריף ששלחתם, יצא מדהים. אני שולחת את הסקיצה הראשונה עכשיו.",
          time: "14:15",
        },
        {
          type: "message",
          id: "m-2",
          direction: "in",
          attachment: {
            kind: "video",
            name: "סקיצה_גרסה_2.mp4",
            meta: "48MB • וידאו",
          },
          time: "14:32",
        },
        {
          type: "message",
          id: "m-3",
          direction: "out",
          body: "תודה דניאל! אני אעבור על זה מיד עם הצוות ואחזור אליך עם פידבק מהיר.",
          time: "14:35",
          read: true,
        },
      ],
    },
    {
      id: "conv-studio",
      name: "Studio Tel Aviv",
      context: { kind: "campaign", label: "קמפיין חגים" },
      preview: "נראה מעולה, נתקדם עם זה.",
      timeLabel: "אתמול",
      entries: [
        { type: "day", id: "day-s1", label: "אתמול" },
        {
          type: "message",
          id: "ms-1",
          direction: "out",
          body: "שלחנו הצעת מחיר מעודכנת לקמפיין החגים — מחכים לאישורכם.",
          time: "11:20",
          read: true,
        },
        {
          type: "message",
          id: "ms-2",
          direction: "in",
          body: "נראה מעולה, נתקדם עם זה.",
          time: "17:04",
        },
      ],
    },
    {
      id: "conv-ronny",
      name: "Ronny_Vlogs",
      handle: "@ronny.vlogs",
      online: false,
      preview: "תודה רבה!",
      timeLabel: "12.05",
      entries: [
        { type: "day", id: "day-r1", label: "12 במאי" },
        {
          type: "message",
          id: "mr-1",
          direction: "out",
          body: "העברנו את התשלום, נעים לעבוד איתך 🙌",
          time: "09:12",
          read: true,
        },
        { type: "message", id: "mr-2", direction: "in", body: "תודה רבה!", time: "09:30" },
      ],
    },
  ],
};

export const getMessagesData = cache(async (userId: string): Promise<MessagesData> => {
  void userId; // TODO: שאילתות Prisma (Conversation → participants → messages) מסוננות למשתמש הזה
  return PLACEHOLDER;
});
