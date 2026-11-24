import { SiteHeader } from "@/components/site-header";
import { PageCreator } from "@/components/pages/page-creator";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function NewPagePage({ searchParams }: { searchParams: Promise<{ analysisId?: string; resumeVersionId?: string }> }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  return (
    <div className="site-shell pages-page">
      <SiteHeader user={user} />
      <PageCreator
        isLoggedIn={Boolean(user)}
        presetAnalysisId={params.analysisId || null}
        presetResumeVersionId={params.resumeVersionId || null}
      />
    </div>
  );
}