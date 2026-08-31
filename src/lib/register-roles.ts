import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { RegisterRoles } from "@/payload-types";
import { DEFAULT_REGISTER_ROLES } from "@/lib/register-roles-defaults";

/**
 * שכבת קריאה מ-CMS לשלב 2 בהרשמה (בחירת תפקיד).
 * cache() מבטל כפילויות באותה בקשה. אם ה-global ריק/לא זמין — נופלים לברירות המחדל.
 */

type RegisterRolesData = Omit<RegisterRoles, "id" | "updatedAt" | "createdAt">;

const mergeRole = (
  fallback: RegisterRoles["brandRole"],
  data: RegisterRoles["brandRole"] | undefined,
): RegisterRoles["brandRole"] => ({
  ...fallback,
  ...data,
  benefits: data?.benefits?.length ? data.benefits : fallback.benefits,
});

export const getRegisterRolesData = cache(async (): Promise<RegisterRolesData> => {
  try {
    const payload = await getPayloadClient();
    const data = (await payload.findGlobal({
      slug: "register-roles",
      depth: 0,
    })) as unknown as RegisterRoles;

    if (!data?.heading) return DEFAULT_REGISTER_ROLES;

    return {
      heading: data.heading || DEFAULT_REGISTER_ROLES.heading,
      subheading: data.subheading || DEFAULT_REGISTER_ROLES.subheading,
      brandRole: mergeRole(DEFAULT_REGISTER_ROLES.brandRole, data.brandRole),
      creatorRole: mergeRole(DEFAULT_REGISTER_ROLES.creatorRole, data.creatorRole),
      spaceRole: mergeRole(DEFAULT_REGISTER_ROLES.spaceRole, data.spaceRole),
    };
  } catch {
    return DEFAULT_REGISTER_ROLES;
  }
});
