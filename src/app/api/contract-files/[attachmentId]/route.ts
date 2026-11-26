import { getActiveSessionUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { isSafeInlineMime } from "@/lib/deliverable-upload";

/**
 * הגשה מאובטחת של קבצי תוצרים שהועלו לחדר העבודה.
 * גישה: רק המפרסם (business.userId) או הספק (providerId) של אותו חוזה.
 * קישורים חיצוניים לא עוברים דרך כאן — רק קבצים עם MediaAttachment.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  // כולל בדיקת סטטוס (מושעה/חסום/נמחק) מול ה-DB — SEC-A-08
  const uid = await getActiveSessionUserId();
  if (!uid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const attachment = await prisma.mediaAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      mimeType: true,
      originalFilename: true,
      deliverableSubmission: {
        select: {
          contract: {
            select: { providerId: true, business: { select: { userId: true } } },
          },
        },
      },
    },
  });

  const contract = attachment?.deliverableSubmission?.contract;
  if (!attachment || !contract) {
    return new Response("Not found", { status: 404 });
  }

  if (contract.providerId !== uid && contract.business.userId !== uid) {
    return new Response("Forbidden", { status: 403 });
  }

  const object = await storage.get(`deliverables/${attachmentId}`);
  if (!object) {
    return new Response("File missing", { status: 404 });
  }

  const filename = encodeURIComponent(attachment.originalFilename ?? attachmentId);

  const mime = attachment.mimeType || object.contentType;
  // סוג שאינו ברשימה הבטוחה (למשל SVG ישן שכבר הועלה) מוגש להורדה בלבד, לא inline.
  const disposition = isSafeInlineMime(mime) ? "inline" : "attachment";

  return new Response(object.body, {
    headers: {
      "Content-Type": isSafeInlineMime(mime) ? mime : "application/octet-stream",
      "Content-Disposition": `${disposition}; filename*=UTF-8''${filename}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=3600",
      ...(object.size ? { "Content-Length": String(object.size) } : {}),
    },
  });
}
