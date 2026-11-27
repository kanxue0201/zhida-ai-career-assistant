import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Code2, Folder, Globe, Mail, MapPin, MessageCircle, Phone, Terminal } from "lucide-react";
import { safeHttpUrl, type PageContent, type PageTheme } from "@/lib/page-schema";

type LayoutProps = { content: PageContent; branded: boolean };
type ContactEntry = { key: string; icon: React.ReactNode; label: string; value: string; href: string | null };

function nameInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "·";
  if (/[\p{Script=Han}]/u.test(trimmed)) return trimmed.slice(-2);
  return trimmed.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function ctaHref(content: PageContent): string | null {
  if (content.cta.type === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.cta.value) ? `mailto:${content.cta.value}` : null;
  }
  return safeHttpUrl(content.cta.value);
}

function CtaButton({ content, className = "" }: { content: PageContent; className?: string }) {
  const href = ctaHref(content);
  const classes = `rp-cta ${className}`.trim();
  if (!href) return <span className={`${classes} is-disabled`}>{content.cta.label}</span>;
  return <a className={classes} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
    {content.cta.label} <ArrowUpRight size={16} />
  </a>;
}

function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return <div className={`rp-avatar ${className}`.trim()} aria-hidden="true">{nameInitials(name)}</div>;
}

function HeroMeta({ content, className = "" }: { content: PageContent; className?: string }) {
  if (!content.profile.location && !content.profile.yearsLabel) return null;
  return <div className={`rp-hero-meta ${className}`.trim()}>
    {content.profile.location && <span><MapPin size={14} /> {content.profile.location}</span>}
    {content.profile.yearsLabel && <span><BriefcaseBusiness size={14} /> {content.profile.yearsLabel}</span>}
  </div>;
}

function SectionHeading({ label, title, intro }: { label: string; title: string; intro?: string }) {
  return <div className="rp-heading">
    <p className="rp-section-label">{label}</p>
    <h2>{title}</h2>
    {intro && <p className="rp-section-intro">{intro}</p>}
  </div>;
}

function HighlightGrid({ content }: { content: PageContent }) {
  return <div className="rp-highlight-grid">
    {content.highlights.map((item, index) => <article key={index} className="rp-highlight-card">
      <span className="rp-highlight-index">{String(index + 1).padStart(2, "0")}</span>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </article>)}
  </div>;
}

function ProjectGrid({ content }: { content: PageContent }) {
  return <div className="rp-project-grid">
    {content.projects.map((project, index) => {
      const link = safeHttpUrl(project.link);
      return <article key={index} className={`rp-project-card ${index === 0 ? "is-lead" : ""}`}>
        <div className="rp-project-top">
          <span className="rp-project-index">{String(index + 1).padStart(2, "0")}</span>
          {project.period && <span className="rp-period">{project.period}</span>}
        </div>
        <h3>{link ? <a href={link} target="_blank" rel="noopener noreferrer">{project.name} <ArrowUpRight size={15} /></a> : project.name}</h3>
        {project.role && <p className="rp-project-role">{project.role}</p>}
        <p className="rp-project-summary">{project.summary}</p>
        {project.achievements.length > 0 && <ul className="rp-achievements">
          {project.achievements.map((achievement, i) => <li key={i}>{achievement}</li>)}
        </ul>}
        {project.tags.length > 0 && <div className="rp-tags">{project.tags.map((tag, i) => <span key={i}>{tag}</span>)}</div>}
      </article>;
    })}
  </div>;
}

function ExperienceList({ content }: { content: PageContent }) {
  return <div className="rp-timeline">
    {content.experience.map((item, index) => <article key={index} className="rp-timeline-item">
      <div className="rp-timeline-head">
        <h3>{item.company}</h3>
        {item.period && <span className="rp-period">{item.period}</span>}
      </div>
      <p className="rp-timeline-title">{item.title}</p>
      {item.summary && <p className="rp-timeline-summary">{item.summary}</p>}
    </article>)}
  </div>;
}

function SkillGroups({ content }: { content: PageContent }) {
  return <div className="rp-skill-list">
    {content.skills.map((group, index) => <div key={index} className="rp-skill-group">
      <h3>{group.category}</h3>
      <div className="rp-tags">{group.items.map((item, i) => <span key={i}>{item}</span>)}</div>
    </div>)}
  </div>;
}

function EducationList({ content }: { content: PageContent }) {
  return <div className="rp-education-list">
    {content.education.map((item, index) => <div key={index} className="rp-education-item">
      <h3>{item.school}</h3>
      <p>{[item.degree, item.period].filter(Boolean).join(" · ")}</p>
    </div>)}
  </div>;
}

function ContactList({ entries }: { entries: ContactEntry[] }) {
  return <ul className="rp-contact-list">
    {entries.map((entry) => <li key={entry.key}>
      {entry.icon}
      <span className="rp-contact-label">{entry.label}</span>
      {entry.href
        ? <a href={entry.href} {...(entry.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{entry.value}</a>
        : <span className="rp-contact-value">{entry.value}</span>}
    </li>)}
  </ul>;
}

function AboutText({ content }: { content: PageContent }) {
  return <p className="rp-about-text">{content.about}</p>;
}

function FinalCta({ content, className = "" }: { content: PageContent; className?: string }) {
  return <section className={`rp-final-cta ${className}`.trim()} aria-label="行动按钮">
    <p className="rp-section-label">NEXT STEP</p>
    <h2>期待与你聊聊新的机会</h2>
    <p>如果我的经历与你的团队相匹配，欢迎随时联系。</p>
    <CtaButton content={content} className="rp-cta-large" />
  </section>;
}

function BrandFooter() {
  return <footer className="rp-footer">
    <span><BriefcaseBusiness size={14} /> 由 <Link href="/">职达 AI</Link> 生成 · 在线求职主页</span>
    <Link href="/pages/new">我也要做一页 <ArrowUpRight size={13} /></Link>
  </footer>;
}

function ThemeRoot({ theme, branded, children }: { theme: PageTheme; branded: boolean; children: React.ReactNode }) {
  return <div className={branded ? "rp rp-standalone" : "rp"} data-theme={theme} data-layout={theme}>
    {children}
  </div>;
}

function getContacts(content: PageContent): ContactEntry[] {
  const contacts = content.contacts;
  if (!content.settings.sections.contacts) return [];
  return [
    contacts.email && { key: "email", icon: <Mail size={16} />, label: "邮箱", value: contacts.email, href: `mailto:${contacts.email}` },
    contacts.phone && { key: "phone", icon: <Phone size={16} />, label: "电话", value: contacts.phone, href: `tel:${contacts.phone.replace(/[^\d+]/g, "")}` },
    contacts.wechat && { key: "wechat", icon: <MessageCircle size={16} />, label: "微信", value: contacts.wechat, href: null },
    contacts.github && safeHttpUrl(contacts.github) && { key: "github", icon: <Code2 size={16} />, label: "GitHub", value: contacts.github.replace(/^https?:\/\//, ""), href: safeHttpUrl(contacts.github) },
    contacts.website && safeHttpUrl(contacts.website) && { key: "website", icon: <Globe size={16} />, label: "个人网站", value: contacts.website.replace(/^https?:\/\//, ""), href: safeHttpUrl(contacts.website) },
  ].filter(Boolean) as ContactEntry[];
}

function visibility(content: PageContent, contacts: ContactEntry[]) {
  const sections = content.settings.sections;
  return {
    about: sections.about && content.about.trim().length > 0,
    highlights: sections.highlights && content.highlights.length > 0,
    projects: sections.projects && content.projects.length > 0,
    experience: sections.experience && content.experience.length > 0,
    skills: sections.skills && content.skills.length > 0,
    education: sections.education && content.education.length > 0,
    contacts: contacts.length > 0,
  };
}

function SectionNav({ content, contacts }: { content: PageContent; contacts: ContactEntry[] }) {
  const show = visibility(content, contacts);
  const items = [
    show.about && ["about", "关于"], show.projects && ["projects", "项目"],
    show.experience && ["experience", "经历"], show.skills && ["skills", "技能"], show.contacts && ["contacts", "联系"],
  ].filter(Boolean) as string[][];
  return <nav className="rp-section-nav" aria-label="页面目录">{items.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>;
}

function CleanProLayout({ content, branded }: LayoutProps) {
  const contacts = getContacts(content);
  const show = visibility(content, contacts);
  return <ThemeRoot theme="clean-pro" branded={branded}><div className="rp-inner rp-clean-inner">
    <header className="rp-hero rp-clean-hero">
      <div className="rp-clean-identity"><Avatar name={content.profile.name} /><div>
        <p className="rp-hero-kicker">PERSONAL RESUME</p>
        <h1 className="rp-name">{content.profile.name}</h1>
        <p className="rp-headline">{content.profile.headline}</p>
      </div></div>
      <div className="rp-clean-intro"><p className="rp-tagline">{content.profile.tagline}</p><HeroMeta content={content} /><CtaButton content={content} /></div>
    </header>
    {show.highlights && <section className="rp-section rp-clean-proof"><SectionHeading label="CORE STRENGTHS" title="核心优势" /><HighlightGrid content={content} /></section>}
    <div className="rp-clean-grid">
      <main className="rp-clean-main">
        {show.about && <section id="about" className="rp-section"><SectionHeading label="ABOUT" title="关于我" /><AboutText content={content} /></section>}
        {show.experience && <section id="experience" className="rp-section"><SectionHeading label="EXPERIENCE" title="工作经历" /><ExperienceList content={content} /></section>}
        {show.projects && <section id="projects" className="rp-section"><SectionHeading label="SELECTED PROJECTS" title="项目经历" /><ProjectGrid content={content} /></section>}
      </main>
      <aside className="rp-clean-aside">
        {show.skills && <section id="skills" className="rp-section"><SectionHeading label="SKILLS" title="专业技能" /><SkillGroups content={content} /></section>}
        {show.education && <section className="rp-section"><SectionHeading label="EDUCATION" title="教育背景" /><EducationList content={content} /></section>}
        {show.contacts && <section id="contacts" className="rp-section"><SectionHeading label="CONTACT" title="联系方式" /><ContactList entries={contacts} /></section>}
      </aside>
    </div>
    <FinalCta content={content} />{branded && <BrandFooter />}
  </div></ThemeRoot>;
}

function ProductLaunchLayout({ content, branded }: LayoutProps) {
  const contacts = getContacts(content);
  const show = visibility(content, contacts);
  return <ThemeRoot theme="product-launch" branded={branded}><div className="rp-product-shell">
    <header className="rp-product-hero">
      <div className="rp-product-topline"><span className="rp-product-brand"><Avatar name={content.profile.name} />{content.profile.name}</span><HeroMeta content={content} /></div>
      <div className="rp-product-hero-main">
        <p className="rp-hero-kicker">OPEN TO NEW OPPORTUNITIES</p>
        <h1 className="rp-headline">{content.profile.headline}</h1>
        <p className="rp-tagline">{content.profile.tagline}</p>
        <div className="rp-product-actions"><CtaButton content={content} />{show.projects && <a className="rp-text-link" href="#projects">查看项目 <ArrowUpRight size={15} /></a>}</div>
      </div>
      <div className="rp-product-facts"><span><strong>{content.projects.length}</strong> 个项目</span><span><strong>{content.highlights.length}</strong> 项核心优势</span>{content.profile.location && <span>{content.profile.location}</span>}</div>
    </header>
    {show.highlights && <section className="rp-product-advantages"><SectionHeading label="WHY ME" title="我能为团队带来什么" /><HighlightGrid content={content} /></section>}
    {show.projects && <section id="projects" className="rp-product-cases"><SectionHeading label="CASE STUDIES" title="代表项目" intro="从职责、过程到结果，完整看每一项工作。" /><ProjectGrid content={content} /></section>}
    <div className="rp-product-story">
      {show.about && <section id="about"><SectionHeading label="MY STORY" title="关于我" /><AboutText content={content} /></section>}
      {show.experience && <section id="experience"><SectionHeading label="CAREER" title="工作经历" /><ExperienceList content={content} /></section>}
    </div>
    {(show.skills || show.education || show.contacts) && <div className="rp-product-toolkit">
      {show.skills && <section id="skills"><SectionHeading label="TOOLKIT" title="技能工具" /><SkillGroups content={content} /></section>}
      {show.education && <section><SectionHeading label="EDUCATION" title="教育背景" /><EducationList content={content} /></section>}
      {show.contacts && <section id="contacts"><SectionHeading label="CONTACT" title="保持联系" /><ContactList entries={contacts} /></section>}
    </div>}
    <FinalCta content={content} />{branded && <BrandFooter />}
  </div></ThemeRoot>;
}

function CreativePortfolioLayout({ content, branded }: LayoutProps) {
  const contacts = getContacts(content);
  const show = visibility(content, contacts);
  return <ThemeRoot theme="creative-portfolio" branded={branded}><div className="rp-creative-shell">
    <header className="rp-creative-hero">
      <div className="rp-creative-mast"><span>PORTFOLIO / PROFILE</span><span>{content.profile.location || "OPEN TO WORK"}</span></div>
      <h1 className="rp-name">{content.profile.name}</h1>
      <div className="rp-creative-hero-bottom"><div><p className="rp-headline">{content.profile.headline}</p><HeroMeta content={content} /></div><div><p className="rp-tagline">{content.profile.tagline}</p><CtaButton content={content} /></div></div>
    </header>
    {show.projects && <section id="projects" className="rp-creative-projects"><SectionHeading label="SELECTED WORK" title="项目作品" /><ProjectGrid content={content} /></section>}
    {show.highlights && <section className="rp-creative-strengths"><SectionHeading label="CAPABILITIES" title="核心优势" /><HighlightGrid content={content} /></section>}
    <div className="rp-creative-notes">
      {show.about && <section id="about"><SectionHeading label="PROFILE" title="关于我" /><AboutText content={content} /></section>}
      {show.experience && <section id="experience"><SectionHeading label="EXPERIENCE" title="工作经历" /><ExperienceList content={content} /></section>}
    </div>
    {(show.skills || show.education) && <div className="rp-creative-capabilities">
      {show.skills && <section id="skills"><SectionHeading label="STACK" title="技能与工具" /><SkillGroups content={content} /></section>}
      {show.education && <section><SectionHeading label="EDUCATION" title="教育背景" /><EducationList content={content} /></section>}
    </div>}
    {show.contacts && <section id="contacts" className="rp-creative-contact"><SectionHeading label="GET IN TOUCH" title="联系方式" /><ContactList entries={contacts} /></section>}
    <FinalCta content={content} />{branded && <BrandFooter />}
  </div></ThemeRoot>;
}

function EnterpriseTechLayout({ content, branded }: LayoutProps) {
  const contacts = getContacts(content);
  const show = visibility(content, contacts);
  const skillCount = content.skills.reduce((total, group) => total + group.items.length, 0);
  return <ThemeRoot theme="enterprise-tech" branded={branded}><div className="rp-enterprise-shell">
    <header className="rp-enterprise-topbar"><span className="rp-enterprise-brand"><Terminal size={18} />{content.profile.name} / PROFILE</span><SectionNav content={content} contacts={contacts} /><CtaButton content={content} /></header>
    <div className="rp-enterprise-hero">
      <div className="rp-enterprise-identity"><p className="rp-hero-kicker">CAREER OVERVIEW</p><h1 className="rp-name">{content.profile.name}</h1><p className="rp-headline">{content.profile.headline}</p><p className="rp-tagline">{content.profile.tagline}</p><HeroMeta content={content} /></div>
      {show.highlights && <section className="rp-enterprise-matrix"><SectionHeading label="CAPABILITY MATRIX" title="核心能力" /><HighlightGrid content={content} /></section>}
    </div>
    <div className="rp-enterprise-facts"><span><small>项目</small><strong>{content.projects.length}</strong></span><span><small>技能项</small><strong>{skillCount}</strong></span><span><small>工作经历</small><strong>{content.experience.length}</strong></span>{content.profile.yearsLabel && <span><small>经验标签</small><strong>{content.profile.yearsLabel}</strong></span>}</div>
    {show.experience && <section id="experience" className="rp-enterprise-experience"><SectionHeading label="WORK HISTORY" title="工作经历" /><ExperienceList content={content} /></section>}
    {show.projects && <section id="projects" className="rp-enterprise-projects"><SectionHeading label="PROJECT INDEX" title="项目矩阵" /><ProjectGrid content={content} /></section>}
    <div className="rp-enterprise-bottom">
      {show.about && <section id="about"><SectionHeading label="PROFILE NOTE" title="关于我" /><AboutText content={content} /></section>}
      {show.skills && <section id="skills"><SectionHeading label="TECH STACK" title="技术能力" /><SkillGroups content={content} /></section>}
      {show.education && <section><SectionHeading label="EDUCATION" title="教育背景" /><EducationList content={content} /></section>}
      {show.contacts && <section id="contacts"><SectionHeading label="CONTACT" title="联系方式" /><ContactList entries={contacts} /></section>}
    </div>
    <FinalCta content={content} />{branded && <BrandFooter />}
  </div></ThemeRoot>;
}

function EditorialStoryLayout({ content, branded }: LayoutProps) {
  const contacts = getContacts(content);
  const show = visibility(content, contacts);
  return <ThemeRoot theme="editorial-story" branded={branded}><div className="rp-editorial-shell">
    <header className="rp-editorial-masthead"><span>{content.profile.name}</span><span>PERSONAL PROFILE</span><HeroMeta content={content} /></header>
    <div className="rp-editorial-hero"><p className="rp-hero-kicker">A PROFILE IN WORK</p><h1 className="rp-headline">{content.profile.headline}</h1><p className="rp-tagline">{content.profile.tagline}</p><div className="rp-editorial-byline"><Avatar name={content.profile.name} /><span>作者与求职者<br /><strong>{content.profile.name}</strong></span><CtaButton content={content} /></div></div>
    {show.about && <section id="about" className="rp-editorial-opening"><SectionHeading label="THE INTRODUCTION" title="关于我" /><AboutText content={content} /></section>}
    {show.projects && <section id="projects" className="rp-editorial-stories"><SectionHeading label="THE STORIES" title="项目特稿" /><ProjectGrid content={content} /></section>}
    {show.highlights && <section className="rp-editorial-strengths"><SectionHeading label="IN THEIR OWN WORDS" title="核心优势" /><HighlightGrid content={content} /></section>}
    {show.experience && <section id="experience" className="rp-editorial-history"><SectionHeading label="THE TIMELINE" title="工作经历" /><ExperienceList content={content} /></section>}
    <div className="rp-editorial-colophon">
      {show.skills && <section id="skills"><SectionHeading label="THE TOOLKIT" title="技能工具" /><SkillGroups content={content} /></section>}
      {show.education && <section><SectionHeading label="EDUCATION" title="教育背景" /><EducationList content={content} /></section>}
      {show.contacts && <section id="contacts"><SectionHeading label="CORRESPONDENCE" title="联系方式" /><ContactList entries={contacts} /></section>}
    </div>
    <FinalCta content={content} />{branded && <BrandFooter />}
  </div></ThemeRoot>;
}

function CareerTimelineLayout({ content, branded }: LayoutProps) {
  const contacts = getContacts(content);
  const show = visibility(content, contacts);
  return <ThemeRoot theme="career-timeline" branded={branded}><div className="rp-chrono-shell">
    <aside className="rp-chrono-profile">
      <Avatar name={content.profile.name} /><p className="rp-hero-kicker">CAREER TIMELINE</p><h1 className="rp-name">{content.profile.name}</h1><p className="rp-headline">{content.profile.headline}</p><p className="rp-tagline">{content.profile.tagline}</p><HeroMeta content={content} /><CtaButton content={content} />
      {show.contacts && <section id="contacts" className="rp-chrono-contacts"><SectionHeading label="CONTACT" title="联系方式" /><ContactList entries={contacts} /></section>}
      {show.skills && <section id="skills" className="rp-chrono-skills"><SectionHeading label="SKILLS" title="技能工具" /><SkillGroups content={content} /></section>}
    </aside>
    <main className="rp-chrono-main">
      {show.about && <section id="about" className="rp-chrono-about"><SectionHeading label="BEFORE THE TIMELINE" title="关于我" /><AboutText content={content} /></section>}
      {show.highlights && <section className="rp-chrono-highlights"><SectionHeading label="WHAT I BRING" title="核心优势" /><HighlightGrid content={content} /></section>}
      <div className="rp-chrono-stream">
        {show.experience && <section id="experience"><SectionHeading label="01 / EXPERIENCE" title="工作经历" /><ExperienceList content={content} /></section>}
        {show.projects && <section id="projects"><SectionHeading label="02 / PROJECTS" title="项目经历" /><ProjectGrid content={content} /></section>}
        {show.education && <section><SectionHeading label="03 / EDUCATION" title="教育背景" /><EducationList content={content} /></section>}
      </div>
      <FinalCta content={content} />
    </main>
  </div>{branded && <div className="rp-chrono-footer"><BrandFooter /></div>}</ThemeRoot>;
}

function SwissSection({ id, number, title, children }: { id?: string; number: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="rp-swiss-row"><div className="rp-swiss-label"><span>{number}</span><h2>{title}</h2></div><div className="rp-swiss-content">{children}</div></section>;
}

function MinimalSwissLayout({ content, branded }: LayoutProps) {
  const contacts = getContacts(content);
  const show = visibility(content, contacts);
  return <ThemeRoot theme="minimal-swiss" branded={branded}><div className="rp-swiss-shell">
    <header className="rp-swiss-header"><div className="rp-swiss-top"><span>CURRICULUM VITAE</span><HeroMeta content={content} /></div><div className="rp-swiss-hero"><h1 className="rp-name">{content.profile.name}</h1><div><p className="rp-headline">{content.profile.headline}</p><p className="rp-tagline">{content.profile.tagline}</p></div></div><div className="rp-swiss-action"><CtaButton content={content} /></div></header>
    <main>
      {show.about && <SwissSection id="about" number="01" title="关于我"><AboutText content={content} /></SwissSection>}
      {show.highlights && <SwissSection number="02" title="核心优势"><HighlightGrid content={content} /></SwissSection>}
      {show.experience && <SwissSection id="experience" number="03" title="工作经历"><ExperienceList content={content} /></SwissSection>}
      {show.projects && <SwissSection id="projects" number="04" title="项目经历"><ProjectGrid content={content} /></SwissSection>}
      {show.skills && <SwissSection id="skills" number="05" title="技能"><SkillGroups content={content} /></SwissSection>}
      {show.education && <SwissSection number="06" title="教育背景"><EducationList content={content} /></SwissSection>}
      {show.contacts && <SwissSection id="contacts" number="07" title="联系方式"><ContactList entries={contacts} /></SwissSection>}
    </main>
    <FinalCta content={content} />{branded && <BrandFooter />}
  </div></ThemeRoot>;
}

function DeveloperDocsLayout({ content, branded }: LayoutProps) {
  const contacts = getContacts(content);
  const show = visibility(content, contacts);
  return <ThemeRoot theme="developer-docs" branded={branded}><div className="rp-developer-shell">
    <header className="rp-developer-topbar"><span><Terminal size={17} /> ~/profile/{content.profile.name}</span><CtaButton content={content} /></header>
    <div className="rp-developer-layout">
      <aside className="rp-developer-sidebar"><div className="rp-developer-file-tree"><span><Folder size={15} /> profile</span><SectionNav content={content} contacts={contacts} /></div><div className="rp-developer-status"><i /> OPEN TO WORK</div></aside>
      <main className="rp-developer-main">
        <header className="rp-developer-hero"><p className="rp-hero-kicker">$ whoami</p><h1 className="rp-name">{content.profile.name}</h1><p className="rp-headline">{content.profile.headline}</p><p className="rp-tagline">{content.profile.tagline}</p><HeroMeta content={content} /></header>
        {show.about && <section id="about" className="rp-developer-readme"><SectionHeading label="README.md" title="关于我" /><AboutText content={content} /></section>}
        {show.highlights && <section className="rp-developer-features"><SectionHeading label="FEATURES" title="核心优势" /><HighlightGrid content={content} /></section>}
        {show.projects && <section id="projects" className="rp-developer-projects"><SectionHeading label="PROJECTS/" title="项目文件" /><ProjectGrid content={content} /></section>}
        {show.experience && <section id="experience" className="rp-developer-history"><SectionHeading label="HISTORY.LOG" title="工作经历" /><ExperienceList content={content} /></section>}
        <div className="rp-developer-meta-grid">
          {show.skills && <section id="skills"><SectionHeading label="DEPENDENCIES" title="技能工具" /><SkillGroups content={content} /></section>}
          {show.education && <section><SectionHeading label="EDUCATION" title="教育背景" /><EducationList content={content} /></section>}
        </div>
        {show.contacts && <section id="contacts" className="rp-developer-contact"><SectionHeading label="CONTACT.CONFIG" title="联系方式" /><ContactList entries={contacts} /></section>}
        <FinalCta content={content} />
      </main>
    </div>
    {branded && <BrandFooter />}
  </div></ThemeRoot>;
}

const LAYOUTS: Record<PageTheme, React.ComponentType<LayoutProps>> = {
  "clean-pro": CleanProLayout,
  "product-launch": ProductLaunchLayout,
  "creative-portfolio": CreativePortfolioLayout,
  "enterprise-tech": EnterpriseTechLayout,
  "editorial-story": EditorialStoryLayout,
  "career-timeline": CareerTimelineLayout,
  "minimal-swiss": MinimalSwissLayout,
  "developer-docs": DeveloperDocsLayout,
};

export function ThemeLayout({ content, theme, branded }: { content: PageContent; theme: PageTheme; branded: boolean }) {
  const Layout = LAYOUTS[theme];
  return <Layout content={content} branded={branded} />;
}
