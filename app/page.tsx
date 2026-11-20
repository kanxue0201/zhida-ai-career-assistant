import { CareerAssistant } from "@/components/career-assistant";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getCurrentUser();
  return <CareerAssistant key={user?.id || "guest"} initialUser={user} />;
}
