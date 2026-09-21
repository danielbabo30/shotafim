import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type CityOption = { id: string; nameHe: string };

/** רשימת הערים הפעילות (id + שם עברי), ממוינת — לשדות בחירת עיר בטפסים. */
export const getCities = cache(async (): Promise<CityOption[]> => {
  return prisma.city.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { nameHe: "asc" }],
    select: { id: true, nameHe: true },
  });
});

/** קבוצת המזהים התקינים — לוולידציה בצד השרת. */
export const getValidCityIds = cache(async (): Promise<Set<string>> => {
  const cities = await getCities();
  return new Set(cities.map((c) => c.id));
});
