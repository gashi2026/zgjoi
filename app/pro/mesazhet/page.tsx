import { redirect } from "next/navigation";
// Chat-then-hire: every conversation lives with its job, so the old messages
// list now points to the single conversations list.
export default function Page() {
  redirect("/pro/kerkesat");
}
