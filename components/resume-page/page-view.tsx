import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Code2, Globe, Mail, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import { safeHttpUrl, type PageContent, type PageTheme } from "@/lib/page-schema";
import "./resume-page.css";

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

function CtaButton({ content, className }: { content: PageContent; className: string }) {
  const href = ctaHref(content);
  if (!href) return <span className={`${className} is-disabled`}>{content.cta.label}</span>;
  return <a className={className} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{content.cta.label} <ArrowUpRight size={16} /></a>;
}

export function ResumePageView({ content, theme, branded = false }: { content: PageContent; theme: PageTheme; branded?: boolean }) {
  const sections = content.settings.sections;
  const showAbout = sections.about && content.about.trim().length > 0;
  const showHighlights = sections.highlights && content.highlights.length > 0;
  const showProjects = sections.projects && content.projects.length > 0;
  const showExperience = sections.experience && content.experience.length > 0;
  const showSkills = sections.skills && content.skills.length > 0;
  const showEducation = sections.education && content.education.length > 0;
  const contacts = content.contacts;
  const contactEntries = sections.contacts ? ([
    contacts.email && { key: "email", icon: <Mail size={15} />, label: "邮箱", value: contacts.email, href: `mailto:${contacts.email}` },
    contacts.phone && { key: "phone", icon: <Phone size={15} />, label: "电话", value: contacts.phone, href: `tel:${contacts.phone.replace(/[^\d+]/g, "")}` },
    contacts.wechat && { key: "wechat", icon: <MessageCircle size={15} />, label: "微信", value: contacts.wechat, href: null },
    contacts.github && safeHttpUrl(contacts.github) && { key: "github", icon: <Code2 size={15} />, label: "GitHub", value: contacts.github.replace(/^https?:\/\//, ""), href: safeHttpUrl(contacts.github) },
    contacts.website && safeHttpUrl(contacts.website) && { key: "website", icon: <Globe size={15} />, label: "个人网站", value: contacts.website.replace(/^https?:\/\//, ""), href: safeHttpUrl(contacts.website) },
  ].filter(Boolean) as Array<{ key: string; icon: React.ReactNode; label: string; value: string; href: string | null }>) : [];
  const showContacts = contactEntries.length > 0;
  const hasMain = showAbout || showProjects || showExperience;
  const hasAside = showSkills || showEducation || showContacts;

  return (
    <div className={branded ? "rp rp-standalone" : "rp"} data-theme={theme}>
      <div className="rp-inner">
        <header className="rp-hero">
          <div className="rp-avatar" aria-hidden="true">{nameInitials(content.profile.name)}</div>
          <p className="rp-hero-kicker"><Sparkles size={13} /> PERSONAL CAREER PAGE</p>
          <h1 className="rp-name">{content.profile.name}</h1>
          <p className="rp-headline">{content.profile.headline}</p>
          <p className="rp-tagline">{content.profile.tagline}</p>
          {(content.profile.location || content.profile.yearsLabel) && (
            <div className="rp-hero-meta">
              {content.profile.location && <span><MapPin size={13} /> {content.profile.location}</span>}
              {content.profile.yearsLabel && <span><BriefcaseBusiness size={13} /> {content.profile.yearsLabel}</span>}
            </div>
          )}
          <div className="rp-hero-actions"><CtaButton content={content} className="rp-cta" /></div>
        </header>

        {showHighlights && (
          <section className="rp-section rp-highlights" aria-label="核心优势">
            <p className="rp-section-label">WHY ME · 核心优势</p>
            <div className="rp-highlight-grid">
              {content.highlights.map((item, index) => (
                <article key={index} className="rp-highlight-card">
                  <span className="rp-highlight-index">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {(hasMain || hasAside) && (
          <div className="rp-body">
            <div className="rp-main">
              {showAbout && (
                <section className="rp-section rp-about" aria-label="关于我">
                  <p className="rp-section-label">ABOUT · 关于我</p>
                  <p className="rp-about-text">{content.about}</p>
                </section>
              )}

              {showProjects && (
                <section className="rp-section rp-projects" aria-label="项目经历">
                  <p className="rp-section-label">PROJECTS · 项目经历</p>
                  <div className="rp-project-grid">
                    {content.projects.map((project, index) => {
                      const link = safeHttpUrl(project.link);
                      return (
                        <article key={index} className="rp-project-card">
                          <div className="rp-project-top">
                            <h3>{link ? <a href={link} target="_blank" rel="noopener noreferrer">{project.name} <ArrowUpRight size={14} /></a> : project.name}</h3>
                            {project.period && <span className="rp-period">{project.period}</span>}
                          </div>
                          {project.role && <p className="rp-project-role">{project.role}</p>}
                          <p className="rp-project-summary">{project.summary}</p>
                          {project.achievements.length > 0 && (
                            <ul className="rp-achievements">
                              {project.achievements.map((achievement, i) => <li key={i}>{achievement}</li>)}
                            </ul>
                          )}
                          {project.tags.length > 0 && (
                            <div className="rp-tags">{project.tags.map((tag, i) => <span key={i}>{tag}</span>)}</div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {showExperience && (
                <section className="rp-section rp-experience" aria-label="工作经历">
                  <p className="rp-section-label">EXPERIENCE · 工作经历</p>
                  <div className="rp-timeline">
                    {content.experience.map((item, index) => (
                      <article key={index} className="rp-timeline-item">
                        <div className="rp-timeline-head">
                          <h3>{item.company}</h3>
                          {item.period && <span className="rp-period">{item.period}</span>}
                        </div>
                        <p className="rp-timeline-title">{item.title}</p>
                        {item.summary && <p className="rp-timeline-summary">{item.summary}</p>}
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="rp-aside">
              {showSkills && (
                <section className="rp-section rp-skills" aria-label="技能">
                  <p className="rp-section-label">SKILLS · 技能</p>
                  {content.skills.map((group, index) => (
                    <div key={index} className="rp-skill-group">
                      <h4>{group.category}</h4>
                      <div className="rp-tags">{group.items.map((item, i) => <span key={i}>{item}</span>)}</div>
                    </div>
                  ))}
                </section>
              )}

              {showEducation && (
                <section className="rp-section rp-education" aria-label="教育背景">
                  <p className="rp-section-label">EDUCATION · 教育背景</p>
                  {content.education.map((item, index) => (
                    <div key={index} className="rp-education-item">
                      <h4>{item.school}</h4>
                      <p>{[item.degree, item.period].filter(Boolean).join(" · ")}</p>
                    </div>
                  ))}
                </section>
              )}

              {showContacts && (
                <section className="rp-section rp-contacts" aria-label="联系方式">
                  <p className="rp-section-label">CONTACT · 联系方式</p>
                  <ul className="rp-contact-list">
                    {contactEntries.map((entry) => (
                      <li key={entry.key}>
                        {entry.icon}
                        <span className="rp-contact-label">{entry.label}</span>
                        {entry.href
                          ? <a href={entry.href} {...(entry.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{entry.value}</a>
                          : <span className="rp-contact-value">{entry.value}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        )}

        <section className="rp-final-cta" aria-label="行动按钮">
          <h2>期待与你聊聊新的机会</h2>
          <p>如果我的经历与你的团队相匹配，欢迎随时联系。</p>
          <CtaButton content={content} className="rp-cta rp-cta-large" />
        </section>

        {branded && (
          <footer className="rp-footer">
            <span><BriefcaseBusiness size={13} /> 由 <Link href="/">职达 AI</Link> 生成 · 在线求职主页</span>
            <Link href="/pages/new">我也要做一页 <ArrowUpRight size={12} /></Link>
          </footer>
        )}
      </div>
    </div>
  );
}