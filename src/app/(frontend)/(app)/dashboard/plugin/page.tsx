import { redirect } from "next/navigation";

/** התוסף עבר למסך ההגדרות (סקציית "תוסף מעקב"). הנתיב נשאר כהפניה לקישורים ישנים. */
export default function PluginPage() {
  redirect("/dashboard/settings#plugin");
}
