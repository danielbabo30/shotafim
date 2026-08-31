import type { Metadata } from "next";
import { requireActiveUser } from "@/lib/app-user";
import { getMessagesData } from "@/lib/messages";
import { MessagesWorkspace } from "@/components/app/messages/messages-workspace";

export const metadata: Metadata = { title: "הודעות" };

export default async function MessagesPage() {
  const user = await requireActiveUser();
  const { conversations } = await getMessagesData(user.id);

  return <MessagesWorkspace conversations={conversations} />;
}
