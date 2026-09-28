import { redirect } from "next/navigation";

// The checklist became Reminders (every task was carried over); old links and bookmarks land there.
export default function ChecklistPage() {
  redirect("/pengingat");
}
