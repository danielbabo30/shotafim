import "server-only";
import { cache } from "react";
import type { DeliverableType, ReviewSentiment, SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";

/**
 * שכבת קריאה לפרופיל יוצר בודד (עמוד /dashboard/marketplace/[id]).
 * נתונים אמיתיים מ-Prisma (ראה CLAUDE.md §"האזור האישי").
 */

export type CreatorChannelView = {
  platform: SocialPlatform;
  handle: string;
  channelUrl: string;
  followers: number;
  engagementRate: number | null;
  avgViews: number | null;
  verified: boolean;
};

export type CreatorPackageView = {
  id: string;
  deliverableType: DeliverableType;
  title: string;
  priceILS: number;
  turnaroundDays: number;
  revisionsIncluded: number;
};

export type CreatorReviewView = {
  id: string;
  rating: number;
  sentiment: ReviewSentiment;
  feedbackText: string;
  authorName: string;
  createdAt: Date;
  punctuality: number | null;
  communication: number | null;
  payment: number | null;
};

export type CreatorProfileDetail = {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  cityLabel: string | null;
  verified: boolean;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  reliabilityScore: number;
  categorySlugs: string[];
  channels: CreatorChannelView[];
  packages: CreatorPackageView[];
  reviews: CreatorReviewView[];
  ratingAvg: number;
  reviewCount: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export const getCreatorProfile = cache(async (id: string): Promise<CreatorProfileDetail | null> => {
  await requireActiveUser();

  const c = await prisma.creatorProfile.findFirst({
    where: { id, status: "ACTIVE", deletedAt: null, user: { status: "ACTIVE", deletedAt: null } },
    select: {
      id: true,
      userId: true,
      displayName: true,
      bio: true,
      verificationStatus: true,
      avatarUrl: true,
      coverImageUrl: true,
      reliabilityScore: true,
      primaryCity: { select: { nameHe: true } },
      categories: { select: { categorySlug: true } },
      channels: {
        orderBy: { followersCount: "desc" },
        select: {
          platform: true,
          handle: true,
          channelUrl: true,
          followersCount: true,
          engagementRate: true,
          avgViews: true,
          isChannelVerified: true,
        },
      },
      pricingPackages: {
        where: { isActive: true },
        orderBy: { priceILS: "asc" },
        select: {
          id: true,
          deliverableType: true,
          title: true,
          priceILS: true,
          turnaroundDays: true,
          revisionsIncluded: true,
        },
      },
      user: {
        select: {
          receivedReviews: {
            where: { isPublic: true },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              rating: true,
              sentiment: true,
              feedbackText: true,
              createdAt: true,
              punctualityRating: true,
              communicationRating: true,
              paymentRating: true,
              author: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!c) return null;

  const ratings = c.user.receivedReviews.map((r) => r.rating);

  return {
    id: c.id,
    userId: c.userId,
    displayName: c.displayName,
    bio: c.bio,
    cityLabel: c.primaryCity?.nameHe ?? null,
    verified: c.verificationStatus === "VERIFIED",
    avatarUrl: c.avatarUrl,
    coverImageUrl: c.coverImageUrl,
    reliabilityScore: Math.round(c.reliabilityScore),
    categorySlugs: c.categories.map((x) => x.categorySlug),
    channels: c.channels.map((ch) => ({
      platform: ch.platform,
      handle: ch.handle,
      channelUrl: ch.channelUrl,
      followers: ch.followersCount,
      engagementRate: ch.engagementRate,
      avgViews: ch.avgViews,
      verified: ch.isChannelVerified,
    })),
    packages: c.pricingPackages.map((p) => ({
      id: p.id,
      deliverableType: p.deliverableType,
      title: p.title,
      priceILS: Number(p.priceILS),
      turnaroundDays: p.turnaroundDays,
      revisionsIncluded: p.revisionsIncluded,
    })),
    reviews: c.user.receivedReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      sentiment: r.sentiment,
      feedbackText: r.feedbackText,
      authorName: r.author?.name ?? "מפרסם",
      createdAt: r.createdAt,
      punctuality: r.punctualityRating,
      communication: r.communicationRating,
      payment: r.paymentRating,
    })),
    ratingAvg: ratings.length ? round1(ratings.reduce((s, x) => s + x, 0) / ratings.length) : 0,
    reviewCount: ratings.length,
  };
});
