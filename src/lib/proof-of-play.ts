import "server-only";
import { cache } from "react";
import type { ContractStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import type { ContractParty } from "@/lib/contract-room";
import type { ProofOfPlayView } from "@/lib/proof-of-play-labels";

/**
 * הוכחות שידור (ProofOfPlay) של חוזה שטח פרסום — קריאה מ-DB, מסונן לצדדי החוזה.
 * שחרור כסף בעקבות אימות הוכחה שייך לשכבת הכספים ואינו נעשה כאן.
 */

export type ContractProofs = {
  viewerParty: ContractParty;
  contractStatus: ContractStatus;
  /** הספק יכול להוסיף הוכחה (חוזה בעבודה/ממתין לאישור) */
  canUpload: boolean;
  proofs: ProofOfPlayView[];
};

/** null כשהחוזה אינו חוזה שטח פרסום או שהמשתמש אינו צד בו */
export const getContractProofs = cache(
  async (contractId: string): Promise<ContractProofs | null> => {
    const user = await requireActiveUser();
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        adSpaceAssetId: { not: null },
        OR: [{ business: { userId: user.id } }, { providerId: user.id }],
      },
      select: {
        status: true,
        providerId: true,
        proofs: {
          orderBy: { uploadedAt: "desc" },
          select: {
            id: true,
            proofType: true,
            fileUrl: true,
            notes: true,
            verifiedByBrand: true,
            uploadedAt: true,
          },
        },
      },
    });
    if (!contract) return null;

    const viewerParty: ContractParty = contract.providerId === user.id ? "provider" : "brand";
    return {
      viewerParty,
      contractStatus: contract.status,
      canUpload:
        viewerParty === "provider" &&
        (contract.status === "ACTIVE" || contract.status === "SUBMITTED_FOR_REVIEW"),
      proofs: contract.proofs,
    };
  },
);
