"use client";

import { useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Copy,
  FileText,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import type { AnalysisResult } from "@/lib/analysis-schema";

type ResultTab = "match" | "resume" | "letter" | "interview";

const tabs: Array<{ id: ResultTab; label: string; icon: typeof Target }> = [
  { id: "match", label: "匹配分析", icon: Target },
  { id: "resume", label: "简历优化", icon: ListChecks },
  { id: "letter", label: "求职信", icon: FileText },
  { id: "interview", label: "面试准备", icon: MessageCircleQuestion },
];

function CopyButton({ text, label = "复制" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" className="copy-button" onClick={copy} aria-live="polite">
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "已复制" : label}
    </button>
  );
}

function InterviewItem({ item, index }: { item: AnalysisResult["interviewQuestions"][number]; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className={`interview-item ${open ? "is-open" : ""}`}>
      <button type="button" className="interview-question" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="question-number">{String(index + 1).padStart(2, "0")}</span>
        <span>{item.question}</span>
        <ChevronDown size={19} className="question-chevron" />
      </button>
      {open && (
        <div className="interview-answer">
          <div className="intent-label"><Target size={14} /> 考察意图</div>
          <p className="intent-text">{item.intent}</p>
          <div className="answer-label"><Sparkles size={14} /> 参考回答</div>
          <p className="answer-text">{item.sampleAnswer}</p>
          <div className="preparation-tip"><Lightbulb size={16} /><span><strong>准备提示</strong>{item.preparationTip}</span></div>
          <CopyButton text={`问题：${item.question}\n\n考察意图：${item.intent}\n\n参考回答：${item.sampleAnswer}\n\n准备提示：${item.preparationTip}`} label="复制本题" />
        </div>
      )}
    </div>
  );
}

function resultToMarkdown(result: AnalysisResult) {
  return `# AI 求职分析报告\n\n## 岗位匹配度：${result.matchAnalysis.score} 分 · ${result.matchAnalysis.level}\n\n${result.matchAnalysis.summary}\n\n### 匹配优势\n${result.matchAnalysis.strengths.map((item) => `- **${item.title}**：${item.evidence}`).join("\n")}\n\n### 主要差距\n${result.matchAnalysis.gaps.map((item) => `- **${item.title}**：${item.evidence}\n  - 建议：${item.suggestion}`).join("\n")}\n\n## 简历优化建议\n${result.resumeSuggestions.map((item, index) => `${index + 1}. **[${item.priority}优先级] ${item.section}**\n   - 对应要求：${item.jdRequirement}\n   - 当前问题：${item.issue}\n   - 修改建议：${item.suggestion}\n   - 改写示例：${item.rewriteExample}`).join("\n")}\n\n## 定向求职信\n\n${result.coverLetter}\n\n## 面试问题与参考回答\n${result.interviewQuestions.map((item, index) => `### ${index + 1}. ${item.question}\n\n**考察意图：** ${item.intent}\n\n**参考回答：** ${item.sampleAnswer}\n\n**准备提示：** ${item.preparationTip}`).join("\n\n")}\n\n---\n${result.disclaimer || "以上结果由 AI 生成，仅供求职准备参考。"}`;
}

export function Results({ result }: { result: AnalysisResult }) {
  const [activeTab, setActiveTab] = useState<ResultTab>("match");
  const [copiedAll, setCopiedAll] = useState(false);

  async function copyAll() {
    await navigator.clipboard.writeText(resultToMarkdown(result));
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 1800);
  }

  return (
    <section className="results-section" id="results" aria-label="AI 分析结果">
      <div className="results-heading">
        <div>
          <span className="section-eyebrow"><CheckCircle2 size={15} /> 分析已完成</span>
          <h2>你的专属求职策略</h2>
          <p>从岗位匹配到面试准备，把下一步变得清晰。</p>
        </div>
        <button type="button" className="copy-all-button" onClick={copyAll}>
          {copiedAll ? <Check size={16} /> : <Clipboard size={16} />}
          {copiedAll ? "已复制全部" : "复制完整报告"}
        </button>
      </div>

      <div className="results-card">
        <div className="result-tabs" role="tablist" aria-label="结果分类">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
                <Icon size={17} /><span>{tab.label}</span>
                {tab.id === "interview" && <span className="tab-count">10</span>}
              </button>
            );
          })}
        </div>

        <div className="result-content" role="tabpanel">
          {activeTab === "match" && (
            <div className="match-panel">
              <div className="match-overview">
                <div className="score-ring" style={{ "--score": `${result.matchAnalysis.score * 3.6}deg` } as CSSProperties}>
                  <div className="score-center"><strong>{result.matchAnalysis.score}</strong><span>/ 100</span></div>
                </div>
                <div className="match-summary">
                  <span className="match-level">岗位匹配度 · {result.matchAnalysis.level}</span>
                  <h3>你与这个岗位的匹配情况</h3>
                  <p>{result.matchAnalysis.summary}</p>
                  <span className="score-note">AI 文本参考评估，不代表录用概率</span>
                </div>
                <CopyButton text={`岗位匹配度：${result.matchAnalysis.score} 分（${result.matchAnalysis.level}）\n${result.matchAnalysis.summary}`} />
              </div>

              <div className="match-columns">
                <div className="evidence-column strengths-column">
                  <div className="evidence-heading"><span className="evidence-icon"><CheckCircle2 size={18} /></span><div><h3>你的匹配优势</h3><p>简历中已经具备的竞争力</p></div></div>
                  <div className="evidence-list">
                    {result.matchAnalysis.strengths.map((item, index) => <div className="evidence-item" key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><h4>{item.title}</h4><p>{item.evidence}</p></div></div>)}
                  </div>
                </div>
                <div className="evidence-column gaps-column">
                  <div className="evidence-heading"><span className="evidence-icon"><TriangleAlert size={18} /></span><div><h3>值得关注差距</h3><p>提前准备，比回避更有帮助</p></div></div>
                  <div className="evidence-list">
                    {result.matchAnalysis.gaps.map((item, index) => <div className="evidence-item" key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><h4>{item.title}</h4><p>{item.evidence}</p><div className="gap-suggestion"><ArrowUpRight size={14} />{item.suggestion}</div></div></div>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "resume" && (
            <div className="suggestions-panel">
              <div className="panel-title-row"><div><span className="section-eyebrow">RESUME REVIEW</span><h3>让简历更贴近岗位需求</h3><p>{result.resumeSuggestions.length} 条建议，按优先级逐步优化。</p></div><CopyButton text={result.resumeSuggestions.map((item, index) => `${index + 1}. [${item.priority}] ${item.section}\n对应要求：${item.jdRequirement}\n当前问题：${item.issue}\n修改建议：${item.suggestion}\n改写示例：${item.rewriteExample}`).join("\n\n")} label="复制全部建议" /></div>
              <div className="suggestion-list">
                {result.resumeSuggestions.map((item, index) => (
                  <article className="suggestion-item" key={`${item.section}-${index}`}>
                    <div className="suggestion-index">{String(index + 1).padStart(2, "0")}</div>
                    <div className="suggestion-body">
                      <div className="suggestion-meta"><span className={`priority priority-${item.priority}`}>{item.priority}优先级</span><span>{item.section}</span></div>
                      <h4>{item.suggestion}</h4>
                      <div className="suggestion-detail"><strong>当前问题</strong><p>{item.issue}</p></div>
                      <div className="suggestion-detail"><strong>对应简历描述</strong><p>{item.jdRequirement}</p></div>
                      <div className="rewrite-example"><span><Sparkles size={14} /> 改写示例</span><p>{item.rewriteExample}</p></div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "letter" && (
            <div className="letter-panel">
              <div className="panel-title-row"><div><span className="section-eyebrow">COVER LETTER</span><h3>为这个岗位，认真写一封信</h3><p>突出真实优势，而不是重复整份简历。</p></div><CopyButton text={result.coverLetter} label="复制求职信" /></div>
              <div className="letter-paper"><div className="paper-mark"><FileText size={20} /><span>COVER LETTER</span></div><p>{result.coverLetter}</p><div className="paper-footer"><span />AI 辅助起草 · 请核对后使用</div></div>
            </div>
          )}

          {activeTab === "interview" && (
            <div className="interview-panel">
              <div className="panel-title-row"><div><span className="section-eyebrow">INTERVIEW PREP</span><h3>提前练习，从容表达</h3><p>10 个针对当前简历与岗位的问题，点击展开参考回答。</p></div><CopyButton text={result.interviewQuestions.map((item, index) => `${index + 1}. ${item.question}\n考察意图：${item.intent}\n参考回答：${item.sampleAnswer}\n准备提示：${item.preparationTip}`).join("\n\n")} label="复制全部问答" /></div>
              <div className="interview-list">{result.interviewQuestions.map((item, index) => <InterviewItem key={`${item.question}-${index}`} item={item} index={index} />)}</div>
            </div>
          )}
        </div>
      </div>
      <p className="result-disclaimer"><TriangleAlert size={14} />{result.disclaimer}</p>
    </section>
  );
}
