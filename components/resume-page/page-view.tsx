import type { PageContent, PageTheme } from "@/lib/page-schema";
import { ThemeLayout } from "./theme-layouts";
import "./resume-page.css";

export function ResumePageView({ content, theme, branded = false }: { content: PageContent; theme: PageTheme; branded?: boolean }) {
  return <ThemeLayout content={content} theme={theme} branded={branded} />;
}
