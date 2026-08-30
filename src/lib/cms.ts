import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { Media, MainNavigation, SiteSetting } from "@/payload-types";
import {
  DEFAULT_AUTH,
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_FOOTER_TAGLINE,
  DEFAULT_LEGAL_LINKS,
  DEFAULT_NAV_ITEMS,
  DEFAULT_NEWSLETTER,
  DEFAULT_SITE_NAME,
} from "@/lib/cms-defaults";

/**
 * שכבת קריאה מ-CMS למעטפת האתר.
 * cache() של React מבטל כפילויות באותה בקשה (header + footer קוראים פעם אחת).
 * אופטימיזציית ISR/'use cache' תתווסף בהמשך.
 */

const fetchSiteSettings = cache(async (): Promise<SiteSetting | null> => {
  try {
    const payload = await getPayloadClient();
    return (await payload.findGlobal({
      slug: "site-settings",
      depth: 1,
    })) as unknown as SiteSetting;
  } catch {
    return null;
  }
});

const fetchMainNavigation = cache(async (): Promise<MainNavigation | null> => {
  try {
    const payload = await getPayloadClient();
    return (await payload.findGlobal({
      slug: "main-navigation",
      depth: 0,
    })) as unknown as MainNavigation;
  } catch {
    return null;
  }
});

export type ShellData = {
  siteName: string;
  logo: Media | null;
  auth: NonNullable<SiteSetting["auth"]>;
  navItems: NonNullable<MainNavigation["items"]>;
  footer: {
    tagline: string;
    columns: NonNullable<SiteSetting["footerColumns"]>;
    legalLinks: NonNullable<SiteSetting["legalLinks"]>;
    newsletter: NonNullable<SiteSetting["newsletter"]>;
    copyrightHolder: string;
  };
};

/** נתוני המעטפת המלאים, עם ברירות מחדל היכן שה-CMS ריק */
export const getShellData = cache(async (): Promise<ShellData> => {
  const [settings, nav] = await Promise.all([fetchSiteSettings(), fetchMainNavigation()]);

  const siteName = settings?.siteName || DEFAULT_SITE_NAME;

  return {
    siteName,
    logo: settings && typeof settings.logo === "object" ? (settings.logo as Media) : null,
    auth: { ...DEFAULT_AUTH, ...(settings?.auth ?? {}) },
    navItems: nav?.items?.length ? nav.items : DEFAULT_NAV_ITEMS,
    footer: {
      tagline: settings?.footerTagline || DEFAULT_FOOTER_TAGLINE,
      columns: settings?.footerColumns?.length ? settings.footerColumns : DEFAULT_FOOTER_COLUMNS,
      legalLinks: settings?.legalLinks?.length ? settings.legalLinks : DEFAULT_LEGAL_LINKS,
      newsletter: { ...DEFAULT_NEWSLETTER, ...(settings?.newsletter ?? {}) },
      copyrightHolder: settings?.copyrightHolder || siteName,
    },
  };
});
