import { GuestDraftGate } from "@/components/pages/guest-draft-gate";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function DraftPage() {
  const user = await getCurrentUser();
  return <GuestDraftGate isLoggedIn={Boolean(user)} />;
}