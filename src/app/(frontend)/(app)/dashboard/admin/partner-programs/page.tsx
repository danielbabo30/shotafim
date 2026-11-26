import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { arePaymentsEnabled } from "@/lib/payments-gate";
import { ActivatePocForm } from "@/components/app/activate-poc-form";

export const metadata: Metadata = { title: "הפעלת תוכניות שותפות (POC)" };

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const STATUS_LABEL: Record<string, string> = {
  PENDING_DEPOSIT: "ממתינה להפעלה",
  ACTIVE: "פעילה",
  GATE_80: "שער 80%",
  PAUSED: "מושהית",
  CLOSED: "הסתיימה",
};

export default async function AdminPartnerProgramsPage() {
  await requireAdmin();
  const pocMode = !arePaymentsEnabled();
  const programs = await prisma.partnerProgram.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      createdAt: true,
      refCode: true,
      couponCode: true,
      contract: {
        select: {
          id: true,
          business: { select: { name: true } },
          provider: { select: { name: true } },
          campaign: { select: { title: true } },
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-on-surface text-2xl font-bold sm:text-3xl">
          הפעלת תוכניות שותפות (POC)
        </h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          במצב POC התשלום מתבצע מחוץ למערכת: ההפעלה מעבירה את התוכנית ל&quot;פעילה&quot; בלי פיקדון
          ובלי תנועת כסף, והיא נרשמת ביומן הביקורת.
        </p>
      </header>

      {!pocMode && (
        <div className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-lg border p-6 text-sm">
          הפעולה אינה זמינה בשלב זה.
        </div>
      )}

      {programs.length === 0 ? (
        <div className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-lg border p-8 text-center text-sm">
          אין תוכניות שותפות במערכת.
        </div>
      ) : (
        <div className="border-outline-variant bg-surface-lowest overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-outline-variant text-on-surface-variant border-b text-xs">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">קמפיין / צדדים</th>
                <th className="px-4 py-3 text-start font-semibold">קוד / קופון</th>
                <th className="px-4 py-3 text-start font-semibold">נוצרה</th>
                <th className="px-4 py-3 text-start font-semibold">סטטוס</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.id} className="border-outline-variant/50 border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/contracts/${p.contract.id}`}
                      className="text-on-surface hover:text-primary font-medium"
                    >
                      {p.contract.campaign.title}
                    </Link>
                    <div className="text-on-surface-variant text-xs">
                      {p.contract.business.name} ↔ {p.contract.provider?.name ?? "—"}
                    </div>
                  </td>
                  <td className="text-on-surface-variant px-4 py-3 text-xs" dir="ltr">
                    {p.refCode}
                    {p.couponCode ? ` / ${p.couponCode}` : ""}
                  </td>
                  <td className="text-on-surface-variant px-4 py-3 text-xs whitespace-nowrap">
                    {dateFmt.format(p.createdAt)}
                  </td>
                  <td className="text-on-surface px-4 py-3 text-xs">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </td>
                  <td className="px-4 py-3">
                    {pocMode && p.status === "PENDING_DEPOSIT" && (
                      <ActivatePocForm programId={p.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
