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
