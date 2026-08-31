/**
 * אייקוני קו לרכיבי השיווק. viewBox 24×24, stroke = currentColor.
 * האייקונים קבועים בקוד (החלטת עיצוב) — לא נערכים מ-CMS.
 */

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function VerifiedIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2.5l2.6 1.9 3.2-.1 1 3 2.6 1.8-1 3 1 3-2.6 1.8-1 3-3.2-.1L12 21.5l-2.6-1.9-3.2.1-1-3L2.6 15l1-3-1-3 2.6-1.8 1-3 3.2.1z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function StorefrontIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9l1-5h14l1 5" />
      <path d="M4 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
      <path d="M5 11v9h14v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function MegaphoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 10v4a1 1 0 001 1h2l3 4V5L7 9H5a1 1 0 00-1 1z" />
      <path d="M14 7a5 5 0 010 10" />
      <path d="M17 4a9 9 0 010 16" />
    </svg>
  );
}

export function GridIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

/** חץ לכיוון ההתקדמות ב-RTL (שמאלה) */
export function ArrowIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function InventoryIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

export function PriceTagIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 12l-8 8-8-8V4h8l8 8z" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
      <path d="M12 15v2" />
    </svg>
  );
}

export function UploadFileIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 18v-6M9.5 14.5L12 12l2.5 2.5" />
    </svg>
  );
}

export function ReceiptIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

export function WarningIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5L21 19H3z" />
      <path d="M12 10v4M12 17v.5" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L17 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
    </svg>
  );
}

export function LocationIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.5" />
    </svg>
  );
}

export function ListIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />
    </svg>
  );
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
      <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
    </svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M21 12a8 8 0 01-11.5 7.2L4 20l1-4.5A8 8 0 1121 12z" />
    </svg>
  );
}

export function ThumbUpIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3z" />
      <path d="M7 11l4-8a2 2 0 013 1.8V9h5a2 2 0 012 2.3l-1.2 7A2 2 0 0119.8 20H7" />
    </svg>
  );
}

export function ThumbDownIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M17 13V4h3a1 1 0 011 1v7a1 1 0 01-1 1h-3z" />
      <path d="M17 13l-4 8a2 2 0 01-3-1.8V15H5a2 2 0 01-2-2.3l1.2-7A2 2 0 016.2 4H17" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function RocketIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 15c-1.5 1-2 5-2 5s4-.5 5-2" />
      <path d="M9 12a10 10 0 016-9 10 10 0 014 4 10 10 0 01-9 6l-3-1z" />
      <circle cx="14" cy="9" r="1.4" />
    </svg>
  );
}

export function WalletIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 7a2 2 0 012-2h12a2 2 0 012 2v0H5a2 2 0 00-2 2z" />
      <path d="M3 9a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M16 13h.01" />
    </svg>
  );
}

export function PlayCircleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9l5 3-5 3z" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 8a2 2 0 012-2h1.5l1-2h7l1 2H20a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}

export function SwapIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M17 4l4 4-4 4M21 8H8" />
      <path d="M7 20l-4-4 4-4M3 16h13" />
    </svg>
  );
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
      <path d="M10 21v-3h4v3" />
    </svg>
  );
}

export function MicIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0012 0M12 17v4M9 21h6" />
    </svg>
  );
}

export function BusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="3" width="16" height="14" rx="2" />
      <path d="M4 11h16M8 3v8M16 3v8" />
      <path d="M7 21v-2M17 21v-2" />
      <path d="M7.5 17h.01M16.5 17h.01" />
    </svg>
  );
}

export function BillboardIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="11" rx="1.5" />
      <path d="M9 15l-1 5M15 15l1 5M7 20h10" />
    </svg>
  );
}

export function DevicesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2" y="5" width="13" height="10" rx="1.5" />
      <path d="M5 19h7M8 15v4" />
      <rect x="16" y="9" width="6" height="11" rx="1.5" />
    </svg>
  );
}

export function HelpIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 015 0c0 1.7-2.5 2-2.5 4M12 17v.5" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2z" />
      <path d="M10 20a2 2 0 004 0" />
    </svg>
  );
}

export function VideoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="6" width="12" height="12" rx="2" />
      <path d="M15 10l6-3v10l-6-3z" />
    </svg>
  );
}

export function ScreenIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function TrendUpIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 17l6-6 4 4 6-7" />
      <path d="M16 8h4v4" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M7 14h4v3H7z" />
    </svg>
  );
}

export function ChartBarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function BankIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9l8-5 8 5" />
      <path d="M5 9v9M10 9v9M14 9v9M19 9v9" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function GavelIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 4l6 6M12 7l-5 5M15 10l-5 5" />
      <path d="M7 12l-4 4a1.5 1.5 0 002 2l4-4" />
      <path d="M13 20h8" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4v11M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function ArrowDownIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function ArrowUpIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

/** שברון לכיוון "פנימה" ב-RTL (שמאלה) — לשורות רשימה שמובילות למסך פירוט */
export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14 6l-6 6 6 6" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function RulerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 8l13-5 5 13-13 5z" />
      <path d="M8 6.5l1.5 4M12 5l2 5.5M6.5 11l4 1.5" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 20s-7-4.5-9.5-9A5 5 0 0112 5a5 5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.5a3.5 3.5 0 010 6.7M17.5 20c0-2.6-1-4.9-2.6-6.3" />
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h11M18 7h2M4 17h2M9 17h11" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="7" cy="17" r="2" />
    </svg>
  );
}

/** מהדק נייר — כפתור צירוף קובץ ב-composer */
export function PaperclipIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M21 11.5l-8.5 8.5a5.5 5.5 0 01-7.8-7.8l9-9a3.7 3.7 0 015.2 5.2l-9 9a1.8 1.8 0 01-2.6-2.6l8.1-8.1" />
    </svg>
  );
}

/** מטוס נייר — כפתור שליחה */
export function SendIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M21 4L3 11l7 3 3 7z" />
      <path d="M21 4l-11 10" />
    </svg>
  );
}

export function MoreVerticalIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

/** שני סימני וי — אישור קריאה של הודעה יוצאת */
export function DoubleCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M1.5 13l4 4 8-8" />
      <path d="M10.5 13l1 1 8-8" />
    </svg>
  );
}

/** עט על ריבוע — כתיבת הודעה חדשה */
export function PenSquareIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M11 4H5a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-6" />
      <path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z" />
    </svg>
  );
}
