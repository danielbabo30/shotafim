import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

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

  const session = await auth();
  if (!session?.user?.id) {
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

  const uid = session.user.id;
  if (contract.providerId !== uid && contract.business.userId !== uid) {
    return new Response("Forbidden", { status: 403 });
  }

  const object = await storage.get(`deliverables/${attachmentId}`);
  if (!object) {
    return new Response("File missing", { status: 404 });
  }

  const filename = encodeURIComponent(attachment.originalFilename ?? attachmentId);

  return new Response(object.body, {
    headers: {
      "Content-Type": attachment.mimeType || object.contentType,
      "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, max-age=3600",
      ...(object.size ? { "Content-Length": String(object.size) } : {}),
    },
  });
}
