/**
 * טיפוסים של Payload — מתוחזקים ידנית.
 *
 * הרגיל הוא `payload generate:types`, אבל ה-CLI של Payload 3.88 נשבר עם tsx על
 * Node מודרני (ERR_REQUIRE_ESM). עד שזה ייפתר — מעדכנים כאן ידנית בכל שינוי סכמה.
 * הסכמה קטנה ויציבה, אז זה בר-תחזוקה.
 */

export interface Media {
  id: number;
  alt?: string | null;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
  sizes?: {
    thumbnail?: MediaSize;
    medium?: MediaSize;
  };
}

export interface MediaSize {
  url?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  filesize?: number | null;
  filename?: string | null;
}

export interface User {
  id: number;
  name?: string | null;
  updatedAt: string;
  createdAt: string;
  email: string;
}

/** global: site-settings */
export interface SiteSetting {
  id: number;
  siteName: string;
  logo?: (number | null) | Media;
  auth?: {
    personalAreaUrl: string;
    loginUrl: string;
    signupUrl: string;
    loginLabel: string;
    signupLabel: string;
    loggedInLabel: string;
  };
  footerTagline?: string | null;
  footerColumns?:
    | {
        heading: string;
        links?:
          | {
              label: string;
              href: string;
              id?: string | null;
            }[]
          | null;
        id?: string | null;
      }[]
    | null;
  newsletter?: {
    enabled?: boolean | null;
    heading?: string | null;
    text?: string | null;
    placeholder?: string | null;
  };
  legalLinks?:
    | {
        label: string;
        href: string;
        id?: string | null;
      }[]
    | null;
  copyrightHolder?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

/** global: main-navigation */
export interface MainNavigation {
  id: number;
  items?:
    | {
        label: string;
        type?: ("link" | "dropdown") | null;
        href?: string | null;
        children?:
          | {
              label: string;
              href: string;
              description?: string | null;
              id?: string | null;
            }[]
          | null;
        id?: string | null;
      }[]
    | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

/** global: homepage */
export interface Homepage {
  id: number;
  hero: {
    badge?: string | null;
    headingLead: string;
    headingHighlight: string;
    headingTail?: string | null;
    body: string;
    primaryCta?: {
      label: string;
      href: string;
    };
    secondaryCta?: {
      label: string;
      href: string;
    };
  };
  stats?:
    | {
        value: string;
        label: string;
        id?: string | null;
      }[]
    | null;
  rolesHeading: string;
  rolesSubheading?: string | null;
  brandCard: {
    title: string;
    body: string;
    features?:
      | {
          text: string;
          id?: string | null;
        }[]
      | null;
    cta?: {
      label: string;
      href: string;
    };
  };
  influencerCard: {
    badge?: string | null;
    title: string;
    body: string;
    features?:
      | {
          text: string;
          id?: string | null;
        }[]
      | null;
    cta?: {
      label: string;
      href: string;
    };
  };
  spaceCard: {
    title: string;
    body: string;
    tags?:
      | {
          text: string;
          id?: string | null;
        }[]
      | null;
    cta?: {
      label: string;
      href: string;
    };
  };
  escrow: {
    headingLead: string;
    headingHighlight: string;
    body: string;
    steps?:
      | {
          title: string;
          body: string;
          id?: string | null;
        }[]
      | null;
  };
  articles: {
    enabled?: boolean | null;
    heading: string;
    subheading?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
  };
  updatedAt?: string | null;
  createdAt?: string | null;
}

/** global: how-it-works */
export interface HowItWorks {
  id: number;
  hero: {
    headingLead: string;
    headingHighlight: string;
    headingTail?: string | null;
    body: string;
  };
  timeline: {
    heading: string;
    steps?:
      | {
          icon: "lock" | "upload" | "campaign" | "receipt" | "shield";
          title: string;
          body: string;
          id?: string | null;
        }[]
      | null;
  };
  comparison: {
    heading: string;
    oldWay: {
      title: string;
      points?:
        | {
            text: string;
            id?: string | null;
          }[]
        | null;
    };
    newWay: {
      title: string;
      points?:
        | {
            lead?: string | null;
            text: string;
            id?: string | null;
          }[]
        | null;
    };
  };
  faq: {
    heading: string;
    items?:
      | {
          question: string;
          answer: string;
          id?: string | null;
        }[]
      | null;
  };
  updatedAt?: string | null;
  createdAt?: string | null;
}

/** global: solutions-creators */
export interface SolutionsCreators {
  id: number;
  hero: {
    badge?: string | null;
    headingLead: string;
    headingHighlight: string;
    headingTail?: string | null;
    body: string;
    primaryCta?: {
      label: string;
      href: string;
    };
    secondaryCta?: {
      label: string;
      href: string;
    };
  };
  stats?:
    | {
        value: string;
        label: string;
        id?: string | null;
      }[]
    | null;
  showcase: {
    heading?: string | null;
    items?:
      | {
          icon: "workspace" | "wallet" | "shield" | "receipt" | "chat" | "rocket";
          title: string;
          body: string;
          id?: string | null;
        }[]
      | null;
  };
  workflow: {
    heading: string;
    subheading?: string | null;
    steps?:
      | {
          title: string;
          body: string;
          id?: string | null;
        }[]
      | null;
  };
  cta: {
    headingLead: string;
    headingTail?: string | null;
    body: string;
    action: {
      label: string;
      href: string;
    };
  };
  updatedAt?: string | null;
  createdAt?: string | null;
}

/** global: solutions-brands */
export interface SolutionsBrands {
  id: number;
  hero: {
    badge?: string | null;
    headingLead: string;
    headingHighlight: string;
    headingTail?: string | null;
    body: string;
    primaryCta?: {
      label: string;
      href: string;
    };
    secondaryCta?: {
      label: string;
      href: string;
    };
  };
  stats?:
    | {
        value: string;
        label: string;
        id?: string | null;
      }[]
    | null;
  showcase: {
    heading?: string | null;
    items?:
      | {
          icon: "chart" | "lock" | "shield" | "receipt" | "bolt" | "rocket";
          title: string;
          body: string;
          points?:
            | {
                text: string;
                id?: string | null;
              }[]
            | null;
          id?: string | null;
        }[]
      | null;
  };
  workflow: {
    heading: string;
    subheading?: string | null;
    steps?:
      | {
          title: string;
          body: string;
          id?: string | null;
        }[]
      | null;
  };
  cta: {
    headingLead: string;
    headingTail?: string | null;
    body: string;
    action: {
      label: string;
      href: string;
    };
  };
  updatedAt?: string | null;
  createdAt?: string | null;
}

/** global: solutions-ad-spaces */
export interface SolutionsAdSpaces {
  id: number;
  hero: {
    badge?: string | null;
    headingLead: string;
    headingHighlight: string;
    headingTail?: string | null;
    body: string;
    primaryCta?: {
      label: string;
      href: string;
    };
    secondaryCta?: {
      label: string;
      href: string;
    };
  };
  stats?:
    | {
        value: string;
        label: string;
        id?: string | null;
      }[]
    | null;
  showcase: {
    heading?: string | null;
    items?:
      | {
          icon: "calendar" | "chart" | "shield" | "receipt" | "bolt" | "rocket";
          title: string;
          body: string;
          points?:
            | {
                text: string;
                id?: string | null;
              }[]
            | null;
          id?: string | null;
        }[]
      | null;
  };
  workflow: {
    heading: string;
    subheading?: string | null;
    steps?:
      | {
          title: string;
          body: string;
          id?: string | null;
        }[]
      | null;
  };
  cta: {
    headingLead: string;
    headingTail?: string | null;
    body: string;
    action: {
      label: string;
      href: string;
    };
  };
  updatedAt?: string | null;
  createdAt?: string | null;
}

/** global: contact-page */
export interface ContactPage {
  id: number;
  hero: {
    headingLead: string;
    headingHighlight: string;
    headingTail?: string | null;
    body: string;
  };
  form: {
    heading: string;
    note: string;
    submitLabel: string;
    successTitle: string;
    successBody: string;
    subjects?:
      | {
          label: string;
          id?: string | null;
        }[]
      | null;
  };
  details: {
    /** פרטי הקשר עצמם (אימייל/טלפון/כתובת/שעות) מגיעים מ-`company-info` */
    heading: string;
    note?: string | null;
  };
  updatedAt?: string | null;
  createdAt?: string | null;
}

/** global: company-info — מקור אמת יחיד לפרטי החברה */
export interface CompanyInfo {
  id: number;
  legalName: string;
  registrationNumber?: string | null;
  email: string;
  supportEmail?: string | null;
  phone: string;
  whatsapp?: string | null;
  address: string;
  mapUrl?: string | null;
  hours: string;
  hoursNote?: string | null;
  social?:
    | {
        platform: "facebook" | "instagram" | "linkedin" | "x" | "tiktok" | "youtube";
        url: string;
        id?: string | null;
      }[]
    | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

/** בלוק בגוף מאמר — נגזר מ-`body` (type: blocks) ב-src/collections/Posts.ts */
export type PostBlock =
  | { blockType: "lead"; text: string; id?: string | null; blockName?: string | null }
  | { blockType: "prose"; text: string; id?: string | null; blockName?: string | null }
  | {
      blockType: "heading";
      level: "h2" | "h3";
      text: string;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "image";
      image: (number | null) | Media;
      caption?: string | null;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "quote";
      text: string;
      attribution?: string | null;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "keyPoints";
      title: string;
      points?: { text: string; id?: string | null }[] | null;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "callout";
      title: string;
      body: string;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "list";
      ordered?: boolean | null;
      items: {
        lead?: string | null;
        text: string;
        id?: string | null;
      }[];
      id?: string | null;
      blockName?: string | null;
    };

export type PostCategoryValue =
  | "strategy"
  | "advertiser-guide"
  | "creator-guide"
  | "case-study"
  | "technology"
  | "product-news"
  | "tools";

/** collection: posts */
export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: PostCategoryValue;
  readingMinutes: number;
  publishedAt: string;
  featured?: boolean | null;
  coverImage?: (number | null) | Media;
  author: {
    name: string;
    role?: string | null;
    avatar?: (number | null) | Media;
    bio?: string | null;
  };
  body: PostBlock[];
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
  };
  updatedAt: string;
  createdAt: string;
}

/** בלוק בגוף מדריך — נגזר מ-`body` (type: blocks) ב-src/collections/Guides.ts */
export type GuideBlock =
  | { blockType: "lead"; text: string; id?: string | null; blockName?: string | null }
  | { blockType: "prose"; text: string; id?: string | null; blockName?: string | null }
  | {
      blockType: "heading";
      level: "h2" | "h3";
      text: string;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "image";
      image: (number | null) | Media;
      caption?: string | null;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "quote";
      text: string;
      attribution?: string | null;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "keyPoints";
      title: string;
      points?: { text: string; id?: string | null }[] | null;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "callout";
      title: string;
      body: string;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "steps";
      heading?: string | null;
      steps: {
        title: string;
        body: string;
        ctaLabel?: string | null;
        ctaHref?: string | null;
        id?: string | null;
      }[];
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "caution";
      title: string;
      body: string;
      id?: string | null;
      blockName?: string | null;
    }
  | {
      blockType: "list";
      ordered?: boolean | null;
      items: {
        lead?: string | null;
        text: string;
        id?: string | null;
      }[];
      id?: string | null;
      blockName?: string | null;
    };

export type GuideCategoryValue = "getting-started" | "escrow" | "media-approval" | "disputes";

export type GuideAudienceValue = "advertiser" | "creator" | "media-owner" | "finance";

/** collection: guides */
export interface Guide {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: GuideCategoryValue;
  audience: GuideAudienceValue;
  readingMinutes: number;
  publishedAt: string;
  official?: boolean | null;
  popular?: boolean | null;
  stepsBadge?: string | null;
  intro: string;
  prerequisites?: { text: string; id?: string | null }[] | null;
  body: GuideBlock[];
  nextGuideSlug?: string | null;
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
  };
  updatedAt: string;
  createdAt: string;
}

/**
 * בלוק בגוף מסמך משפטי — תת-קבוצה של PROSE_BLOCKS
 * (ראה src/collections/content-blocks.ts). זהה בצורתו ל-`PostBlock`.
 */
export type LegalBlock = PostBlock;

export type LegalPageSlugValue = "accessibility" | "privacy" | "terms" | "cookies";

/** collection: legal-pages — קבוצה סגורה של מסמכים משפטיים, כל אחד עם URL תחת /legal */
export interface LegalPage {
  id: number;
  slug: LegalPageSlugValue;
  title: string;
  intro?: string | null;
  body: LegalBlock[];
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
  };
  updatedAt: string;
  createdAt: string;
}

export type NavItem = NonNullable<MainNavigation["items"]>[number];
export type FooterColumn = NonNullable<SiteSetting["footerColumns"]>[number];
