import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { getContractRoom } from "@/lib/contracts";
import { CONTRACT_STATUS_META, canApproveContract, canRequestRevision } from "@/lib/contract-room";
import { ChevronLeftIcon, ShieldCheckIcon } from "@/components/marketing/icons";
import { DeliverableProofer } from "@/components/app/contract-room/deliverable-proofer";
import { EscrowPanel } from "@/components/app/contract-room/escrow-panel";
import { RoomChat } from "@/components/app/contract-room/room-chat";

export const metadata: Metadata = { title: "חדר עבודה" };

export default async function ContractRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) redirect("/dashboard");

  const { id } = await params;
  const room = await getContractRoom(id);
  if (!room) notFound();

  const latest = room.submissions.at(-1) ?? null;
  const latestStatus = latest?.status ?? null;
  const released = room.status === "APPROVED" || room.escrowStatus === "RELEASED_TO_PROVIDER";

  const milestones = [
    {
      label: "הסכם העבודה נכנס לתוקף",
      done: room.escrowFunded || room.status !== "AWAITING_ESCROW",
    },
    {
      label: latest ? `סקיצה v${latest.version} הועלתה לבדיקה` : "העלאת תוצר לבדיקה",
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
              עבודה מול{" "}
              <span className="text-primary">
                {room.provider.handle ? `@${room.provider.handle}` : room.provider.name}
              </span>
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${statusMeta.className}`}
            >
              <ShieldCheckIcon className="size-3.5" />
              הסכם עבודה {room.agreementNumber} · {statusMeta.label}
            </span>
          </div>
        </header>

        <DeliverableProofer
          contractId={room.id}
          submissions={room.submissions}
          readOnly={room.status === "APPROVED"}
        />
      </div>

      <aside className="flex flex-col gap-6 lg:col-span-4">
        <EscrowPanel
          contractId={room.id}
          escrowAmountILS={room.escrowAmountILS}
          milestones={milestones}
          canApprove={canApproveContract(room.status, latestStatus)}
          canRequestRevision={canRequestRevision(
            room.status,
            latestStatus,
            room.revisionRoundsUsed,
            room.revisionRoundsMax,
          )}
          revisionRoundsLeft={Math.max(0, room.revisionRoundsMax - room.revisionRoundsUsed)}
          released={released}
        />

        <RoomChat contractId={room.id} provider={room.provider} entries={room.threadEntries} />
      </aside>
    </div>
  );
}
