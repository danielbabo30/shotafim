"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { authFieldClass, authLabelClass } from "@/components/auth/form-styles";
import { SOCIAL_NETWORKS, type SocialNetwork } from "@/components/auth/social-networks";
import { completeRegistration } from "@/lib/actions/registration-actions";
import type { CityOption } from "@/lib/cities";
import {
  StorefrontIcon,
  CameraIcon,
  LocationIcon,
  GlobeIcon,
  PlusIcon,
  ArrowIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  CloseIcon,
  UserIcon,
  ShareIcon,
  ScreenIcon,
  BankIcon,
  PriceTagIcon,
  BuildingIcon,
  BusIcon,
  BillboardIcon,
  MailIcon,
  MicIcon,
} from "@/components/marketing/icons";

export type ProfileTab = "brand" | "creator" | "space";
export type CategoryOption = { slug: string; name: string };

type IconCmp = (p: { className?: string }) => React.ReactElement;
type Errors = Record<string, string>;

const TAB_META: Record<
  ProfileTab,
  { tabLabel: string; navLabel: string; title: string; subtitle: string; Icon: IconCmp }
> = {
  brand: {
    tabLabel: "פרטי העסק",
    navLabel: "פרטי העסק",
    title: "בוא נגדיר את הפרופיל שלך",
    subtitle: "מלא את פרטי הפעילות והתשלום כדי שתוכל לפרסם בריפים ולקבל הצעות מאומתות.",
    Icon: StorefrontIcon,
  },
  creator: {
    tabLabel: "הגדרות יוצר תוכן",
    navLabel: "הגדרת יוצר תוכן",
    title: "בוא נגדיר את פרופיל היוצר שלך",
    subtitle:
      "חבר את ערוצי הסושיאל, מלא את פרטי הזיהוי לצורכי מס וקבל פניות לקמפיינים ממומנים עם תקציב מובטח בנאמנות.",
    Icon: CameraIcon,
  },
  space: {
    tabLabel: "שטחי פרסום ומדיה",
    navLabel: "שטחי פרסום ומדיה",
    title: "הגדרת פרופיל בעל שטחי פרסום ומדיה",
    subtitle: "הזן את פרטי חברת המדיה והעלה את נכס הפרסום הראשון שלך.",
    Icon: ScreenIcon,
  },
};

const ENTITY_TYPE_OPTIONS = [
  { value: "LTD", label: "חברה בע״מ" },
  { value: "LICENSED_DEALER", label: "עוסק מורשה" },
  { value: "EXEMPT_DEALER", label: "עוסק פטור" },
  { value: "PARTNERSHIP", label: "שותפות" },
];

const TAX_STATUS_OPTIONS = [
  { value: "EXEMPT_DEALER", label: "עוסק פטור" },
  { value: "LICENSED_DEALER", label: "עוסק מורשה" },
  { value: "COMPANY", label: "חברה בע״מ" },
  { value: "INDIVIDUAL_WITHHOLDING", label: "יחיד — ניכוי מס במקור" },
];

const PRICING_MODEL_OPTIONS = [
  { value: "WEEKLY", label: "לפי שבוע" },
  { value: "MONTHLY", label: "לפי חודש" },
  { value: "DAILY", label: "לפי יום" },
  { value: "PER_CPM", label: "לפי חשיפות (CPM)" },
  { value: "PER_BROADCAST", label: "לפי שידור" },
];

const PROOF_OPTIONS = [
  { value: "PHOTO_CONFIRMATION", label: "צילום שטח (Photo Proof)" },
  { value: "ANALYTICS_REPORT", label: "דוח אנליטיקה" },
  { value: "SYSTEM_LOG", label: "לוג מערכת" },
];

type BusinessModel = "ONLINE" | "PHYSICAL" | "HYBRID";
const OP_MODELS: { value: BusinessModel; label: string }[] = [
  { value: "ONLINE", label: "אונליין בלבד" },
  { value: "PHYSICAL", label: "פיזי (חנויות)" },
  { value: "HYBRID", label: "משולב (היברידי)" },
];

const MEDIA_TYPES: { value: string; label: string; Icon: IconCmp }[] = [
  { value: "DIGITAL_BILLBOARD", label: "מסך דיגיטלי / LED", Icon: ScreenIcon },
  { value: "STATIC_BILLBOARD", label: "שלט חוצות סטטי", Icon: BillboardIcon },
  { value: "TRANSIT", label: "פרסום בתחבורה", Icon: BusIcon },
  { value: "NEWSLETTER", label: "ניוזלטר / דיוור", Icon: MailIcon },
  { value: "PODCAST_SPONSORSHIP", label: "חסות בפודקאסט", Icon: MicIcon },
];

/**
 * שלב 3 בהרשמה — הגדרת פרופיל. אשף עם לשונית לכל תפקיד שנבחר בשלב 2 (נקרא מה-DB).
 * שליחה בלשונית האחרונה → server action completeRegistration (טרנזקציה).
 */
export function ProfileSetupForm({
  roles,
  cities,
  brandCategories,
  creatorCategories,
}: {
  roles: ProfileTab[];
  cities: CityOption[];
  brandCategories: CategoryOption[];
  creatorCategories: CategoryOption[];
}) {
  const tabs: ProfileTab[] = roles.length ? roles : ["brand"];
  const [active, setActive] = useState(0);
  const [state, formAction, pending] = useActionState(completeRegistration, null);
  const formRef = useRef<HTMLFormElement>(null);

  const activeKey = tabs[active];
  const meta = TAB_META[activeKey];
  const isFirst = active === 0;
  const isLast = active === tabs.length - 1;

  const fieldErrors: Errors = state?.fieldErrors ?? {};
  const errorPrefixes = new Set(Object.keys(fieldErrors).map((k) => k.split(".")[0]));

  // שליחה ידנית (בלי `action` על ה-<form>) — כדי ש-React 19 לא יאפס את השדות אחרי כישלון ולידציה
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLast) return;
    startTransition(() => formAction(new FormData(e.currentTarget)));
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      <header className="space-y-3 text-center">
        <h1 className="text-on-surface text-2xl font-semibold sm:text-3xl">{meta.title}</h1>
        <p className="text-on-surface-variant mx-auto max-w-2xl text-lg leading-relaxed">
          {meta.subtitle}
        </p>
      </header>

      {tabs.length > 1 && (
        <div className="border-outline-variant bg-surface-low mx-auto flex w-full max-w-2xl flex-wrap gap-2 rounded-xl border p-1.5">
          {tabs.map((key, i) => {
            const m = TAB_META[key];
            const on = i === active;
            const done = i < active;
            const hasError = errorPrefixes.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-semibold transition-all",
                  on
                    ? "bg-surface-lowest text-primary shadow-ambient-sm"
                    : "text-on-surface-variant opacity-70 hover:opacity-100",
                )}
              >
                {hasError ? (
                  <span className="bg-error size-2 rounded-full" aria-hidden />
                ) : done ? (
                  <CheckCircleIcon className="text-success size-5" />
                ) : (
                  <m.Icon className="size-5" />
                )}
                <span>
                  {i + 1}. {m.tabLabel}
                  {on ? " (פעיל)" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {state?.formError && (
        <p className="border-error/40 bg-error-container text-on-error-container rounded-lg border p-3 text-center text-sm font-semibold">
          {state.formError}
        </p>
      )}

      <div className={cn(activeKey !== "brand" && "hidden")}>
        {tabs.includes("brand") && (
          <BrandProfileFields cities={cities} categories={brandCategories} errors={fieldErrors} />
        )}
      </div>
      <div className={cn(activeKey !== "creator" && "hidden")}>
        {tabs.includes("creator") && (
          <CreatorProfileFields categories={creatorCategories} errors={fieldErrors} />
        )}
      </div>
      <div className={cn(activeKey !== "space" && "hidden")}>
        {tabs.includes("space") && <SpaceProfileFields cities={cities} errors={fieldErrors} />}
      </div>

      <div className="border-outline-variant bg-surface-lowest shadow-ambient-lg fixed inset-x-0 bottom-0 z-50 border-t p-4">
        <div className="mx-auto flex max-w-4xl flex-row-reverse items-center justify-between gap-4">
          <div className="flex flex-1 gap-3 sm:flex-none">
            {isLast ? (
              <button
                type="submit"
                disabled={pending}
                className="bg-primary text-on-primary shadow-ambient-lg hover:bg-primary-hover flex h-12 flex-1 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold transition-colors disabled:opacity-60 sm:flex-none"
              >
                {pending ? "שומר…" : "השלם הרשמה וכניסה למערכת"}
                {!pending && <ArrowIcon className="size-5" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActive((i) => i + 1)}
                className="bg-primary text-on-primary shadow-ambient-lg hover:bg-primary-hover flex h-12 flex-1 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold transition-colors sm:flex-none"
              >
                שמור ועבור ל{TAB_META[tabs[active + 1]].navLabel}
                <ArrowIcon className="size-5" />
              </button>
            )}
          </div>
          {isFirst ? (
            <Link
              href="/register/roles"
              className="border-outline text-on-surface-variant hover:bg-surface-container flex h-12 items-center justify-center rounded-lg border px-6 text-sm font-semibold transition-colors"
            >
              חזרה לבחירת תפקידים
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setActive((i) => i - 1)}
              className="border-outline text-on-surface-variant hover:bg-surface-container flex h-12 items-center justify-center rounded-lg border px-6 text-sm font-semibold transition-colors"
            >
              חזרה ל{TAB_META[tabs[active - 1]].navLabel}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

/* ───────────────────────── לשונית מפרסם ───────────────────────── */

function BrandProfileFields({
  cities,
  categories,
  errors,
}: {
  cities: CityOption[];
  categories: CategoryOption[];
  errors: Errors;
}) {
  const [businessModel, setBusinessModel] = useState<BusinessModel>("PHYSICAL");
  const [branchCount, setBranchCount] = useState(1);
  const showBranches = businessModel !== "ONLINE";
  const cityOpts = cities.map((c) => ({ value: c.id, label: c.nameHe }));

  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient overflow-hidden rounded-lg border">
      <div className="space-y-10 p-6 md:p-8">
        <section className="space-y-4">
          <SectionHeading icon={StorefrontIcon}>פרטי העסק</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label="שם המותג (לתצוגה)" error={errors["brand.name"]}>
              <input
                name="brand.name"
                type="text"
                placeholder="לדוגמה: אופנת ישראל"
                className={authFieldClass}
              />
            </Field>
            <Field label="שם תאגיד / ישות משפטית" error={errors["brand.legalName"]}>
              <input
                name="brand.legalName"
                type="text"
                placeholder="ישראל אופנה בע״מ"
                className={authFieldClass}
              />
            </Field>
            <Field label="ח.פ. / עוסק מורשה" error={errors["brand.companyId"]}>
              <input
                name="brand.companyId"
                type="text"
                inputMode="numeric"
                placeholder="8–9 ספרות"
                className={authFieldClass}
              />
            </Field>
            <Field label="סוג התאגדות" error={errors["brand.entityType"]}>
              <SelectField name="brand.entityType" options={ENTITY_TYPE_OPTIONS} />
            </Field>
            <Field label="קטגוריית פעילות" error={errors["brand.category"]}>
              <SelectField
                name="brand.category"
                options={categories.map((c) => ({ value: c.slug, label: c.name }))}
              />
            </Field>
            <Field label="אימייל להנהלת חשבונות" error={errors["brand.billingEmail"]}>
              <input
                name="brand.billingEmail"
                type="email"
                dir="ltr"
                placeholder="billing@example.com"
                className={cn(authFieldClass, "text-start")}
              />
            </Field>
            <Field label="שם איש קשר" error={errors["brand.contactName"]}>
              <input
                name="brand.contactName"
                type="text"
                placeholder="שם מלא"
                className={authFieldClass}
              />
            </Field>
            <Field label="טלפון איש קשר" error={errors["brand.contactPhone"]}>
              <input
                name="brand.contactPhone"
                type="tel"
                dir="ltr"
                placeholder="050-0000000"
                className={cn(authFieldClass, "text-start")}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="כתובת למשלוח חשבוניות" error={errors["brand.billingAddress"]}>
                <input
                  name="brand.billingAddress"
                  type="text"
                  placeholder="רחוב, עיר, מיקוד"
                  className={authFieldClass}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="תיאור פעילות העסק" error={errors["brand.description"]}>
                <textarea
                  name="brand.description"
                  rows={3}
                  placeholder="מה העסק מוכר, קהל היעד, וטון המותג"
                  className={authFieldClass}
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading icon={LocationIcon}>מודל פעילות וסניפים</SectionHeading>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {OP_MODELS.map((m) => (
              <label key={m.value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="brand.businessModel"
                  value={m.value}
                  checked={businessModel === m.value}
                  onChange={() => setBusinessModel(m.value)}
                  className="text-primary focus:ring-primary border-outline"
                />
                <span
                  className={cn(
                    "text-sm",
                    businessModel === m.value ? "text-primary font-semibold" : "text-on-surface",
                  )}
                >
                  {m.label}
                </span>
              </label>
            ))}
          </div>

          {showBranches ? (
            <div className="border-outline-variant bg-surface-low space-y-5 rounded-md border p-5">
              {Array.from({ length: branchCount }, (_, i) => (
                <div key={i} className="space-y-4">
                  {i > 0 && <div className="border-outline-variant/50 border-t" />}
                  <h3 className="text-on-surface-variant flex items-center gap-2 text-xs font-semibold">
                    <LocationIcon className="size-4" />
                    סניף {i + 1}
                    {i === 0 && " (ראשי)"}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field
                      label="עיר"
                      small
                      error={i === 0 ? errors["brand.locations.0.cityId"] : undefined}
                    >
                      <SelectField name="brand.locationCityId" options={cityOpts} small />
                    </Field>
                    <div className="md:col-span-2">
                      <Field
                        label="כתובת מלאה"
                        small
                        error={i === 0 ? errors["brand.locations.0.address"] : undefined}
                      >
                        <input
                          name="brand.locationAddress"
                          type="text"
                          placeholder="רחוב ומספר בית"
                          className={cn(authFieldClass, "px-3 py-2.5 text-sm")}
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-3">
                      <Field label="כינוי הסניף (לא חובה)" small>
                        <input
                          name="brand.locationName"
                          type="text"
                          placeholder="לדוגמה: סניף דיזנגוף סנטר"
                          className={cn(authFieldClass, "px-3 py-2.5 text-sm")}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setBranchCount((c) => c + 1)}
                className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-semibold transition-colors"
              >
                <PlusIcon className="size-4" />
                הוסף סניף נוסף לרשת
              </button>
            </div>
          ) : (
            /* אונליין בלבד — סניף וירטואלי אחד כדי לעמוד בדרישת המודל */
            <input type="hidden" name="brand.locationCityId" value={cities[0]?.id ?? ""} />
          )}
          {!showBranches && (
            <>
              <input type="hidden" name="brand.locationAddress" value="פעילות מקוונת" />
              <input type="hidden" name="brand.locationName" value="אונליין" />
            </>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeading icon={GlobeIcon}>נוכחות דיגיטלית</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label="אתר אינטרנט" error={errors["brand.websiteUrl"]}>
              <InputWithPrefix
                name="brand.websiteUrl"
                dir="ltr"
                placeholder="https://www.yourbrand.co.il"
                type="url"
              >
                <GlobeIcon className="text-outline size-5" />
              </InputWithPrefix>
            </Field>
            <Field label="אינסטגרם">
              <InputWithPrefix name="brand.instagram" dir="ltr" placeholder="brand_ig" type="text">
                <span className="text-outline">@</span>
              </InputWithPrefix>
            </Field>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ───────────────────────── לשונית יוצר תוכן ───────────────────────── */

function CreatorProfileFields({
  categories,
  errors,
}: {
  categories: CategoryOption[];
  errors: Errors;
}) {
  const [topics, setTopics] = useState<Set<string>>(new Set());
  const [channels, setChannels] = useState<string[]>(["YOUTUBE"]);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleTopic = (slug: string) =>
    setTopics((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const addChannel = (id: string) => {
    setChannels((prev) => [...prev, id]);
    setMenuOpen(false);
  };
  const removeChannel = (id: string) => setChannels((prev) => prev.filter((c) => c !== id));

  const selectedNetworks = channels
    .map((id) => SOCIAL_NETWORKS.find((n) => n.id === id))
    .filter((n): n is SocialNetwork => Boolean(n));
  const availableNetworks = SOCIAL_NETWORKS.filter((n) => !channels.includes(n.id));

  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient overflow-hidden rounded-lg border">
      <div className="space-y-10 p-6 md:p-8">
        <section className="space-y-6">
          <SectionHeading icon={UserIcon}>זהות ציבורית ותחומי תוכן</SectionHeading>

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label="שם במה" error={errors["creator.displayName"]}>
              <input
                name="creator.displayName"
                type="text"
                placeholder="לדוגמה: Daniel Foodie"
                className={authFieldClass}
              />
            </Field>
            <Field label="שם מלא לפי ת.ז" error={errors["creator.legalFullName"]}>
              <input name="creator.legalFullName" type="text" className={authFieldClass} />
            </Field>
            <Field label="מספר ת.ז / ע.מ" error={errors["creator.idNumber"]}>
              <input
                name="creator.idNumber"
                type="text"
                inputMode="numeric"
                placeholder="8–9 ספרות"
                className={authFieldClass}
              />
            </Field>
            <Field label="מעמד לצורכי מס" error={errors["creator.taxStatus"]}>
              <SelectField name="creator.taxStatus" options={TAX_STATUS_OPTIONS} />
            </Field>
            <div className="md:col-span-2">
              <Field label="כתובת מגורים מלאה לצורכי מס">
                <input
                  name="creator.billingAddress"
                  type="text"
                  placeholder="רחוב, עיר, מיקוד"
                  className={authFieldClass}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="ביו קצר" error={errors["creator.bio"]}>
                <textarea
                  name="creator.bio"
                  rows={3}
                  placeholder="כמה משפטים על התוכן שלך, הסגנון והקהל"
                  className={authFieldClass}
                />
              </Field>
            </div>
          </div>

          <div>
            <span className={authLabelClass}>תחומי תוכן (בחר מרובים)</span>
            {topics.size === 0 && errors["creator.categories"] && (
              <p className="text-error mt-1 text-xs font-medium">{errors["creator.categories"]}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = topics.has(c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTopic(c.slug)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                      on
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container",
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            {[...topics].map((slug) => (
              <input key={slug} type="hidden" name="creator.category" value={slug} />
            ))}
          </div>

          <Field label="קישור לתיק עבודות / מדיה-קיט חיצוני (אופציונלי)">
            <input
              name="creator.portfolioUrl"
              type="url"
              dir="ltr"
              placeholder="https://drive.google.com/... או קישור לאתר אישי"
              className={cn(authFieldClass, "text-start")}
            />
          </Field>
        </section>

        <section className="space-y-4">
          <SectionHeading icon={ShareIcon}>חיבור ערוצי סושיאל</SectionHeading>
          {channels.length === 0 && errors["creator.channels"] && (
            <p className="text-error text-xs font-medium">{errors["creator.channels"]}</p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {selectedNetworks.map((net) => (
              <ChannelCard key={net.id} network={net} onRemove={() => removeChannel(net.id)} />
            ))}
          </div>

          {availableNetworks.length > 0 && (
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-semibold transition-colors"
              >
                <PlusIcon className="size-4" />
                הוסף ערוץ
                <ChevronDownIcon
                  className={cn("size-4 transition-transform", menuOpen && "rotate-180")}
                />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="סגור"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <ul
                    role="listbox"
                    className="border-outline-variant bg-surface-lowest shadow-ambient-lg absolute z-20 mt-2 w-60 overflow-hidden rounded-lg border py-1"
                  >
                    {availableNetworks.map((net) => (
                      <li key={net.id}>
                        <button
                          type="button"
                          onClick={() => addChannel(net.id)}
                          className="hover:bg-surface-container flex w-full items-center gap-3 px-3 py-2 text-start text-sm font-medium transition-colors"
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg",
                              net.iconClass,
                            )}
                          >
                            <net.Icon className="size-5" />
                          </span>
                          {net.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ChannelCard({ network, onRemove }: { network: SocialNetwork; onRemove: () => void }) {
  return (
    <div className="border-outline-variant relative flex flex-col gap-3 rounded-md border p-4">
      <input type="hidden" name="creator.channelPlatform" value={network.id} />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`הסר ${network.name}`}
        className="text-on-surface-variant hover:bg-surface-container hover:text-on-surface absolute end-2 top-2 flex size-6 items-center justify-center rounded-full transition-colors"
      >
        <CloseIcon className="size-4" />
      </button>
      <div className="flex items-center gap-3 pe-6">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            network.iconClass,
          )}
        >
          <network.Icon className="size-5" />
        </span>
        <div className="text-sm font-semibold">{network.name}</div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          name="creator.channelHandle"
          type="text"
          dir="ltr"
          placeholder="@username"
          className={cn(authFieldClass, "px-3 py-2 text-start text-sm")}
        />
        <input
          name="creator.channelFollowers"
          type="number"
          min={0}
          placeholder="מס' עוקבים"
          className={cn(authFieldClass, "px-3 py-2 text-sm")}
        />
        <input
          name="creator.channelUrl"
          type="url"
          dir="ltr"
          placeholder="https://…"
          className={cn(authFieldClass, "px-3 py-2 text-start text-sm sm:col-span-2")}
        />
      </div>
    </div>
  );
}

/* ───────────────────────── לשונית בעל שטחי פרסום ───────────────────────── */

function SpaceProfileFields({ cities, errors }: { cities: CityOption[]; errors: Errors }) {
  const [mediaType, setMediaType] = useState("DIGITAL_BILLBOARD");
  const cityOpts = [
    { value: "", label: "— ללא (נכס דיגיטלי) —" },
    ...cities.map((c) => ({ value: c.id, label: c.nameHe })),
  ];

  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient overflow-hidden rounded-lg border">
      <div className="space-y-10 p-6 md:p-8">
        <section className="space-y-4">
          <SectionHeading icon={BuildingIcon}>זהות משפטית</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label="שם חברת המדיה (מותג)" error={errors["space.companyName"]}>
              <input
                name="space.companyName"
                type="text"
                placeholder="לדוגמה: מדיה גרופ ישראל"
                className={authFieldClass}
              />
            </Field>
            <Field label="שם תאגיד רשמי (כפי שמופיע ברשם)" error={errors["space.legalName"]}>
              <input
                name="space.legalName"
                type="text"
                placeholder="הזן שם מלא"
                className={authFieldClass}
              />
            </Field>
            <Field label="ח.פ / ע.מ" error={errors["space.companyId"]}>
              <input
                name="space.companyId"
                type="text"
                inputMode="numeric"
                placeholder="8–9 ספרות"
                className={authFieldClass}
              />
            </Field>
            <Field label="סוג התאגדות" error={errors["space.entityType"]}>
              <SelectField name="space.entityType" options={ENTITY_TYPE_OPTIONS} />
            </Field>
            <Field label="איש קשר תפעולי" error={errors["space.contactName"]}>
              <input
                name="space.contactName"
                type="text"
                placeholder="שם מלא"
                className={authFieldClass}
              />
            </Field>
            <Field label="טלפון איש קשר" error={errors["space.contactPhone"]}>
              <input
                name="space.contactPhone"
                type="tel"
                dir="ltr"
                placeholder="050-0000000"
                className={cn(authFieldClass, "text-start")}
              />
            </Field>
            <Field label="אימייל לחשבוניות" error={errors["space.billingEmail"]}>
              <input
                name="space.billingEmail"
                type="email"
                dir="ltr"
                placeholder="billing@example.com"
                className={cn(authFieldClass, "text-start")}
              />
            </Field>
            <Field label="כתובת רשמית" error={errors["space.billingAddress"]}>
              <input
                name="space.billingAddress"
                type="text"
                placeholder="רחוב, עיר, מיקוד"
                className={authFieldClass}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading icon={BillboardIcon}>נכס מדיה ראשון</SectionHeading>

          <div>
            <span className={authLabelClass}>סוג מדיה</span>
            <input type="hidden" name="space.assetType" value={mediaType} />
            <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {MEDIA_TYPES.map(({ value, label, Icon }) => {
                const on = mediaType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setMediaType(value)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors",
                      on
                        ? "border-primary bg-primary/5 border-2"
                        : "border-outline-variant hover:bg-surface-low",
                    )}
                  >
                    {on && <CheckCircleIcon className="text-primary absolute end-2 top-2 size-4" />}
                    <Icon
                      className={cn("size-7", on ? "text-primary" : "text-on-surface-variant")}
                    />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2 lg:col-span-1">
              <Field label="שם הנכס" error={errors["space.asset.title"]}>
                <input
                  name="space.assetTitle"
                  type="text"
                  placeholder="לדוגמה: מסך איילון צפון"
                  className={authFieldClass}
                />
              </Field>
            </div>
            <Field label="עיר">
              <SelectField name="space.assetCityId" options={cityOpts} />
            </Field>
            <Field label="כתובת / צומת מרכזי">
              <input
                name="space.assetAddress"
                type="text"
                placeholder="מיקום מדויק"
                className={authFieldClass}
              />
            </Field>
            <Field label="חשיפות משוערות (חודשי)">
              <input
                name="space.assetReach"
                type="number"
                min={0}
                placeholder="כמות"
                className={authFieldClass}
              />
            </Field>
            <Field label="מידות / רזולוציה">
              <input
                name="space.assetDimensions"
                type="text"
                dir="ltr"
                placeholder="1920x1080"
                className={cn(authFieldClass, "text-start")}
              />
            </Field>
            <Field label="אורך ספוט (שניות)">
              <input
                name="space.assetSpotLength"
                type="number"
                min={0}
                placeholder="10"
                className={authFieldClass}
              />
            </Field>
            <div className="md:col-span-2 lg:col-span-3">
              <Field label="תיאור הנכס" error={errors["space.asset.description"]}>
                <textarea
                  name="space.assetDescription"
                  rows={2}
                  placeholder="מיקום, קהל חשוף, שעות פעילות ומאפיינים בולטים"
                  className={authFieldClass}
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading icon={PriceTagIcon}>תמחור והוכחת ביצוע</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
            <Field label="מודל תמחור" error={errors["space.asset.pricingModel"]}>
              <SelectField name="space.pricingModel" options={PRICING_MODEL_OPTIONS} />
            </Field>
            <Field label="מחיר בסיס (₪)" error={errors["space.asset.basePriceILS"]}>
              <input
                name="space.basePrice"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                className={authFieldClass}
              />
            </Field>
            <Field label="סוג הוכחת ביצוע מועדף" error={errors["space.asset.proofRequirement"]}>
              <SelectField name="space.proofRequirement" options={PROOF_OPTIONS} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading icon={BankIcon}>פרטי חשבון בנק לזיכוי</SectionHeading>
          <p className="text-on-surface-variant text-xs">
            אפשר להשלים בהמשך מתוך האזור האישי — לא חובה כעת.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ───────────────────────── עזרי טופס ───────────────────────── */

function SectionHeading({ icon: Icon, children }: { icon: IconCmp; children: React.ReactNode }) {
  return (
    <div className="border-outline-variant flex items-center gap-2 border-b pb-2">
      <Icon className="text-primary size-5" />
      <h2 className="text-xl font-semibold">{children}</h2>
    </div>
  );
}

function Field({
  label,
  children,
  small = false,
  error,
}: {
  label: string;
  children: React.ReactNode;
  small?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label
        className={cn(
          small ? "text-on-surface-variant mb-1 block text-xs font-semibold" : authLabelClass,
        )}
      >
        {label}
      </label>
      {children}
      {error && <p className="text-error text-xs font-medium">{error}</p>}
    </div>
  );
}

function SelectField({
  name,
  options,
  small = false,
}: {
  name: string;
  options: { value: string; label: string }[];
  small?: boolean;
}) {
  return (
    <div className="relative">
      <select
        name={name}
        defaultValue=""
        className={cn(authFieldClass, "appearance-none pe-10", small && "px-3 py-2.5 text-sm")}
      >
        <option value="" disabled>
          בחר…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="text-outline pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2" />
    </div>
  );
}

function InputWithPrefix({
  children,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center">
      <span className="text-outline pointer-events-none absolute start-3 flex items-center">
        {children}
      </span>
      <input {...props} className={cn(authFieldClass, "ps-10 text-start", className)} />
    </div>
  );
}
