import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContractRoom } from "@/lib/contracts";
import { getContractReviewContext } from "@/lib/reviews";
import { getPartnerProgramForContract } from "@/lib/partner-program";
import { getContractDisputeContext } from "@/lib/disputes";
import { getCities } from "@/lib/cities";
import {
  CONTRACT_STATUS_META,
  canApproveContract,
  canRequestRevision,
  canFundEscrow,
  canSubmitDeliverable,
} from "@/lib/contract-room";
import { ChevronLeftIcon, ShieldCheckIcon } from "@/components/marketing/icons";
import { DeliverableProofer } from "@/components/app/contract-room/deliverable-proofer";
import { EscrowPanel } from "@/components/app/contract-room/escrow-panel";
import { PartnerProgramPanel } from "@/components/app/contract-room/partner-program-panel";
import { PartnerDashboard } from "@/components/app/contract-room/partner-dashboard";
import { RoomChat } from "@/components/app/contract-room/room-chat";
import { ShippingPanel } from "@/components/app/contract-room/shipping-panel";
import { ReviewPromptDialog } from "@/components/app/review/review-prompt-dialog";
import { DisputeButton } from "@/components/app/dispute/dispute-button";

export const metadata: Metadata = { title: "חדר עבודה" };

export default async function ContractRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await getContractRoom(id);
  if (!room) notFound();

  const reviewContext = room.status === "APPROVED" ? await getContractReviewContext(id) : null;
  const cities = room.hasPhysicalProduct ? await getCities() : [];
  const partnerProgram = await getPartnerProgramForContract(id);
  const disputeContext = await getContractDisputeContext(id);

  const isBrand = room.viewerParty === "brand";
  const latest = room.submissions.at(-1) ?? null;
  const latestStatus = latest?.status ?? null;
  const released = room.status === "APPROVED" || room.escrowStatus === "RELEASED_TO_PROVIDER";

  const milestones = [
    {
      label: "התקציב הופקד לנאמנות",
      done: room.escrowFunded || room.status !== "AWAITING_ESCROW",
    },
    {
      label: latest ? `גרסה v${latest.version} הועלתה לבדיקה` : "העלאת תוצר לבדיקה",
      done: room.submissions.length > 0,
    },
    { label: "אישור סופי של המפרסם ושחרור תשלום", done: room.status === "APPROVED" },
  ];

  const statusMeta = CONTRACT_STATUS_META[room.status];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-8">
        <header className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-3 rounded-lg border p-6">
          <nav className="text-on-surface-variant flex items-center gap-1.5 text-xs">
            <Link href="/dashboard/contracts" className="hover:text-primary transition-colors">
              חוזים
            </Link>
            <ChevronLeftIcon className="size-3.5" />
            <span className="text-on-surface-variant">{room.campaignTitle}</span>
            <ChevronLeftIcon className="size-3.5" />
            <span className="text-on-surface font-medium">חדר עבודה</span>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-on-surface text-xl font-bold">
              {isBrand ? "עבודה מול " : "עבודה עבור "}
              <span className="text-primary">
                {room.counterparty.handle ? `@${room.counterparty.handle}` : room.counterparty.name}
              </span>
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${statusMeta.className}`}
            >
              <ShieldCheckIcon className="size-3.5" />
              הסכם עבודה {room.agreementNumber} · {statusMeta.label}
            </span>
          </div>

          {reviewContext && (
            <div className="border-outline-variant bg-surface-container flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <p className="text-on-surface-variant text-sm">
                העבודה הסתיימה — נשמח לביקורת שלך על {reviewContext.counterpartyName}.
              </p>
              <ReviewPromptDialog prompt={reviewContext} mode="trigger" />
            </div>
          )}
        </header>

        <DeliverableProofer
          contractId={room.id}
          submissions={room.submissions}
          viewerParty={room.viewerParty}
          canSubmit={room.viewerParty === "provider" && canSubmitDeliverable(room.status)}
          readOnly={room.status === "APPROVED"}
        />
      </div>

      <aside className="flex flex-col gap-6 lg:col-span-4">
        {partnerProgram ? (
          <>
            <PartnerProgramPanel program={partnerProgram} />
            <PartnerDashboard contractId={room.id} />
          </>
        ) : (
          <EscrowPanel
            contractId={room.id}
            viewerParty={room.viewerParty}
            escrowAmountILS={room.escrowAmountILS}
            milestones={milestones}
            canFund={isBrand && canFundEscrow(room.status, room.escrowFunded)}
            canApprove={isBrand && canApproveContract(room.status, latestStatus)}
            canRequestRevision={
              isBrand &&
              canRequestRevision(
                room.status,
                latestStatus,
                room.revisionRoundsUsed,
                room.revisionRoundsMax,
              )
            }
            revisionRoundsLeft={Math.max(0, room.revisionRoundsMax - room.revisionRoundsUsed)}
            released={released}
          />
        )}

        {room.hasPhysicalProduct && (
          <ShippingPanel
            contractId={room.id}
            viewerParty={room.viewerParty}
            shipping={room.shipping}
            cities={cities}
          />
        )}

        <RoomChat
          contractId={room.id}
          counterparty={room.counterparty}
          entries={room.threadEntries}
        />

        {disputeContext && (disputeContext.existing || disputeContext.canOpen) && (
          <DisputeButton contractId={room.id} context={disputeContext} />
        )}
      </aside>
    </div>
  );
}
