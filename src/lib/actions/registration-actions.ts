"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireRegistrationUser,
  isRegistrationRoleKey,
  userRoleFromRegistrationKey,
  sortRegistrationRoleKeys,
} from "@/lib/registration";
import { parseRegistration } from "@/lib/registration-schema";
import { LEGAL_VERSION, REGISTRATION_CONSENT_DOCUMENTS } from "@/lib/legal-consent";

export type RegistrationFormState = { error?: string } | null;

/**
 * שלב 2 — שמירת התפקידים שנבחרו על שורת ה-User.
 * הטופס שולח checkbox/ים בשם "role" עם הערכים brand / creator / space.
 */
export async function saveRoles(
  _prev: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const user = await requireRegistrationUser();

  const keys = sortRegistrationRoleKeys(formData.getAll("role").filter(isRegistrationRoleKey));
  if (keys.length === 0) {
    return { error: "יש לבחור לפחות תפקיד אחד כדי להמשיך" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { roles: { set: keys.map(userRoleFromRegistrationKey) } },
  });

  revalidatePath("/register/profile");
  redirect("/register/profile");
}

export type CompleteRegistrationState = {
  status: "idle" | "error";
  formError?: string;
  fieldErrors?: Record<string, string>;
  errorTab?: "brand" | "creator" | "space";
} | null;

const P2002_MESSAGES: Record<string, string> = {
  companyId: "מספר ח.פ / ע.מ כבר רשום במערכת",
  idNumber: "מספר הזהות / העוסק כבר רשום במערכת",
  phone: "מספר הטלפון כבר רשום במערכת",
  email: "כתובת הדוא״ל כבר רשומה במערכת",
};

/**
 * שלב 3 — ההשלמה: יוצר בטרנזקציה אחת את הפרופיל/ים לפי התפקידים, הסניפים/הערוצים,
 * שיוכי הקטגוריות, שתי רשומות LegalConsent, ומעביר את המשתמש ל-ACTIVE.
 */
export async function completeRegistration(
  _prev: CompleteRegistrationState,
  formData: FormData,
): Promise<CompleteRegistrationState> {
  const user = await requireRegistrationUser();
  if (user.roleKeys.length === 0) {
    redirect("/register/roles");
  }

  const parsed = parseRegistration(formData, user.roleKeys);
  if (!parsed.ok) {
    return {
      status: "error",
      formError: parsed.formError,
      fieldErrors: parsed.fieldErrors,
      errorTab: parsed.errorTab,
    };
  }
  const { brand, creator, space } = parsed.data;

  const sortedKeys = sortRegistrationRoleKeys(user.roleKeys);
  const fullName =
    brand?.contactName ?? creator?.legalFullName ?? space?.contactName ?? user.name ?? null;
  const phone = brand?.contactPhone ?? space?.contactPhone ?? null;
  const activeRole = userRoleFromRegistrationKey(sortedKeys[0]);

  const ipAddress = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: fullName,
          ...(phone ? { phone } : {}),
          status: "ACTIVE",
          activeRole,
          termsAcceptedAt: new Date(),
        },
      });

      if (brand) {
        const biz = await tx.businessProfile.create({
          data: {
            userId: user.id,
            name: brand.name,
            legalName: brand.legalName,
            companyId: brand.companyId,
            entityType: brand.entityType,
            description: brand.description,
            businessModel: brand.businessModel,
            contactName: brand.contactName,
            contactPhone: brand.contactPhone,
            billingEmail: brand.billingEmail,
            billingAddress: brand.billingAddress,
            websiteUrl: brand.websiteUrl,
            socialLinks: brand.instagram ? { instagram: brand.instagram } : Prisma.DbNull,
          },
        });
        await tx.businessLocation.createMany({
          data: brand.locations.map((l, i) => ({
            businessId: biz.id,
            cityId: l.cityId,
            address: l.address,
            name: l.name,
            isPrimary: i === 0,
          })),
        });
        await tx.businessCategory.create({
          data: { businessId: biz.id, categorySlug: brand.category },
        });
      }

      if (creator) {
        const prof = await tx.creatorProfile.create({
          data: {
            userId: user.id,
            displayName: creator.displayName,
            legalFullName: creator.legalFullName,
            idNumber: creator.idNumber,
            taxStatus: creator.taxStatus,
            bio: creator.bio,
            billingAddress: creator.billingAddress,
          },
        });
        await tx.creatorChannel.createMany({
          data: creator.channels.map((c) => ({
            creatorId: prof.id,
            platform: c.platform,
            handle: c.handle,
            channelUrl: c.channelUrl,
            followersCount: c.followersCount,
          })),
        });
        await tx.creatorCategory.createMany({
          data: creator.categories.map((slug) => ({ creatorId: prof.id, categorySlug: slug })),
        });
      }

      if (space) {
        const owner = await tx.adSpaceOwnerProfile.create({
          data: {
            userId: user.id,
            companyName: space.companyName,
            legalName: space.legalName,
            companyId: space.companyId,
            entityType: space.entityType,
            contactName: space.contactName,
            contactPhone: space.contactPhone,
            billingEmail: space.billingEmail,
            billingAddress: space.billingAddress,
          },
        });
        const a = space.asset;
        await tx.adSpaceAsset.create({
          data: {
            ownerId: owner.id,
            title: a.title,
            type: a.type,
            description: a.description,
            cityId: a.cityId,
            address: a.address,
            dimensions: a.dimensions,
            technicalSpecs:
              a.spotLengthSeconds != null
                ? { spotLengthSeconds: a.spotLengthSeconds }
                : Prisma.DbNull,
            estimatedReach: a.estimatedReach,
            pricingModel: a.pricingModel,
            basePriceILS: a.basePriceILS,
            proofRequirement: a.proofRequirement,
          },
        });
      }

      await tx.legalConsent.createMany({
        data: REGISTRATION_CONSENT_DOCUMENTS.map((documentType) => ({
          userId: user.id,
          documentType,
          version: LEGAL_VERSION,
          ipAddress,
        })),
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = Array.isArray(e.meta?.target)
        ? (e.meta.target as string[]).join(",")
        : String(e.meta?.target ?? "");
      const t = target.toLowerCase();
      const key = Object.keys(P2002_MESSAGES).find((k) => t.includes(k.toLowerCase()));
      return {
        status: "error",
        formError: key ? P2002_MESSAGES[key] : "חלק מהפרטים כבר רשומים במערכת.",
        fieldErrors: {},
      };
    }
    throw e;
  }

  revalidatePath("/", "layout");
  redirect("/register/complete");
}
