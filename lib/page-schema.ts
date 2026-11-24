import { z } from "zod";

export const PAGE_THEMES = ["clean-pro", "product-launch", "creative-portfolio", "enterprise-tech"] as const;
export type PageTheme = (typeof PAGE_THEMES)[number];

export const PAGE_THEME_META: Record<PageTheme, { name: string; description: string }> = {
  "clean-pro": { name: "清爽专业", description: "白底单栏、克制留白，适合大多数岗位投递" },
  "product-launch": { name: "产品主页风", description: "把自己当产品发布：大字定位、优势卡片、吸底行动按钮" },
  "creative-portfolio": { name: "创意作品集风", description: "深色高对比、超大字号、项目卡片网格，适合创意岗" },
  "enterprise-tech": { name: "企业科技风", description: "深海军蓝、网格线与等宽字体点缀，适合技术岗" },
};

export const PAGE_CONTENT_SCHEMA_VERSION = "1.0";
export const PAGE_PROMPT_VERSION = "resume-page-1";
export const PAGE_CONTENT_MAX_CHARS = 100_000;
export const PAGE_MAX_PER_USER = 10;

const bounded = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();

const linkText = z.string().trim().max(300).optional();

export const pageContentSchema = z.object({
  profile: z.object({
    name: bounded(1, 60),
    headline: bounded(1, 80),
    tagline: bounded(1, 400),
    location: optionalText(60),
    yearsLabel: optionalText(40),
  }),
  highlights: z.array(z.object({
    title: bounded(1, 40),
    description: bounded(1, 300),
  })).min(1).max(5),
  about: z.string().trim().max(2_000).default(""),
  skills: z.array(z.object({
    category: bounded(1, 40),
    items: z.array(bounded(1, 40)).min(1).max(12),
  })).max(6).default([]),
  projects: z.array(z.object({
    name: bounded(1, 80),
    role: optionalText(60),
    period: optionalText(40),
    summary: bounded(1, 600),
    achievements: z.array(bounded(1, 300)).max(4).default([]),
    tags: z.array(bounded(1, 24)).max(6).default([]),
    link: linkText,
  })).max(8).default([]),
  experience: z.array(z.object({
    company: bounded(1, 80),
    title: bounded(1, 60),
    period: optionalText(40),
    summary: z.string().trim().max(600).default(""),
  })).max(8).default([]),
  education: z.array(z.object({
    school: bounded(1, 80),
    degree: optionalText(60),
    period: optionalText(40),
  })).max(4).default([]),
  contacts: z.object({
    email: optionalText(120),
    phone: optionalText(40),
    wechat: optionalText(60),
    github: linkText,
    website: linkText,
  }).default({}),
  cta: z.object({
    label: bounded(1, 30),
    type: z.enum(["email", "link"]),
    value: bounded(1, 300),
  }),
  settings: z.object({
    sections: z.object({
      about: z.boolean().default(true),
      highlights: z.boolean().default(true),
      skills: z.boolean().default(true),
      projects: z.boolean().default(true),
      experience: z.boolean().default(true),
      education: z.boolean().default(true),
      contacts: z.boolean().default(true),
    }).default({ about: true, highlights: true, skills: true, projects: true, experience: true, education: true, contacts: true }),
  }).default({ sections: { about: true, highlights: true, skills: true, projects: true, experience: true, education: true, contacts: true } }),
});

export type PageContent = z.infer<typeof pageContentSchema>;
export type PageSectionKey = keyof PageContent["settings"]["sections"];

export const PAGE_SECTION_LABELS: Record<PageSectionKey, string> = {
  about: "关于我",
  highlights: "核心优势",
  skills: "技能",
  projects: "项目经历",
  experience: "工作经历",
  education: "教育背景",
  contacts: "联系方式",
};

export const pageGenerateInputSchema = z.object({
  resumeText: z.string().trim().min(50, "简历有效文字过少").max(30_000, "简历文字超过 30,000 字符").optional(),
  resumeVersionId: z.string().uuid().optional(),
  analysisId: z.string().uuid().optional(),
}).refine((value) => Boolean(value.resumeText) !== Boolean(value.resumeVersionId), {
  message: "请提供简历文字或选择一个已保存的简历版本。",
});

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,29}$/;
export const RESERVED_SLUGS = new Set([
  "api", "admin", "login", "logout", "signin", "signup", "pages", "history", "auth",
  "u", "www", "support", "help", "about", "privacy", "terms", "static", "assets",
  "new", "draft", "edit", "publish", "unpublish", "slug-check", "generate",
  "resumes", "jobs", "analyze", "confirm", "account", "settings", "home", "index",
  "app", "mail", "email", "contact", "blog", "docs", "status", "test", "dev",
  "prod", "null", "undefined", "root", "user", "users", "profile", "profiles",
]);

export function isValidSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateSlug() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (const byte of bytes) suffix += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
  return `p-${suffix}`;
}

export function defaultPageTitle(content: PageContent) {
  return `${content.profile.name} · ${content.profile.headline}`.slice(0, 120) || "我的在线简历页";
}

export const pageCreateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  theme: z.enum(PAGE_THEMES).default("clean-pro"),
  slug: z.string().trim().toLowerCase().optional(),
  content: pageContentSchema,
  sourceResumeVersionId: z.string().uuid().optional(),
  sourceAnalysisRunId: z.string().uuid().optional(),
});

export const pagePatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  theme: z.enum(PAGE_THEMES).optional(),
  slug: z.string().trim().toLowerCase().optional(),
  content: pageContentSchema.optional(),
}).refine((value) => value.title !== undefined || value.theme !== undefined || value.slug !== undefined || value.content !== undefined, {
  message: "没有需要保存的修改。",
});

const PLACEHOLDER_PATTERN = /\[请补充/;

export function isPlaceholder(value: string | undefined) {
  return Boolean(value && PLACEHOLDER_PATTERN.test(value));
}

export function validatePublishable(content: PageContent): string | null {
  if (isPlaceholder(content.profile.name) || isPlaceholder(content.profile.headline)) {
    return "姓名和一句话定位中的「[请补充]」占位符需要先替换为真实内容。";
  }
  if (isPlaceholder(content.cta.label) || isPlaceholder(content.cta.value)) {
    return "行动按钮还是占位内容，请先填写真实的邮箱或链接。";
  }
  if (content.cta.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.cta.value)) {
    return "行动按钮的邮箱格式不正确，请检查后再发布。";
  }
  if (content.cta.type === "link" && !/^https?:\/\/\S+$/i.test(content.cta.value)) {
    return "行动按钮链接需要以 http:// 或 https:// 开头。";
  }
  return null;
}

export function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  return /^https?:\/\/\S+$/i.test(value) ? value : null;
}