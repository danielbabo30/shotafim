import type { NavIconKey } from "@/lib/app-nav";
import {
  GridIcon,
  StorefrontIcon,
  MegaphoneIcon,
  MailIcon,
  DocumentIcon,
  ChatIcon,
  ChartBarIcon,
  SearchIcon,
  WalletIcon,
  ScreenIcon,
  CalendarIcon,
  VerifiedIcon,
  GavelIcon,
  SettingsIcon,
  HelpIcon,
  PlusIcon,
} from "@/components/marketing/icons";

const MAP: Record<NavIconKey, (props: { className?: string }) => React.JSX.Element> = {
  dashboard: GridIcon,
  marketplace: StorefrontIcon,
  campaign: MegaphoneIcon,
  inbox: MailIcon,
  contract: DocumentIcon,
  chat: ChatIcon,
  chart: ChartBarIcon,
  search: SearchIcon,
  wallet: WalletIcon,
  screen: ScreenIcon,
  calendar: CalendarIcon,
  verified: VerifiedIcon,
  gavel: GavelIcon,
  settings: SettingsIcon,
  help: HelpIcon,
  plus: PlusIcon,
};

/** אייקון ניווט לפי מפתח — גשר בין קונפיג הניווט (מחרוזות) לרכיבי האייקונים */
export function NavIcon({ name, className }: { name: NavIconKey; className?: string }) {
  const Icon = MAP[name];
  return <Icon className={className} />;
}
