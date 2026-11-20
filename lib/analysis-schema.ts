import { z } from "zod";

const shortText = z.string().trim().min(1).max(2_000);
const longText = z.string().trim().min(1).max(12_000);

export const analysisInputSchema = z.object({
  resumeText: z.string().trim().min(50, "简历有效文字过少").max(30_000, "简历文字超过 30,000 字符"),
  jobDescription: z.string().trim().min(20, "岗位描述至少需要 20 个字符").max(20_000, "岗位描述超过 20,000 字符"),
});

export const analysisSchema = z.object({
  matchAnalysis: z.object({
    score: z.number().int().min(0).max(100),
    level: z.enum(["较低", "一般", "较高", "很高"]),
    summary: z.string().trim().min(10).max(2_000),
    strengths: z.array(z.object({ title: shortText, evidence: longText })).min(1).max(5),
    gaps: z.array(z.object({ title: shortText, evidence: longText, suggestion: longText })).min(1).max(5),
  }),
  resumeSuggestions: z.array(z.object({
    priority: z.enum(["高", "中", "低"]),
    section: shortText,
    jdRequirement: longText,
    issue: longText,
    suggestion: longText,
    rewriteExample: longText,
  })).min(5).max(8),
  coverLetter: z.string().trim().min(80).max(12_000),
  interviewQuestions: z.array(z.object({
    question: shortText,
    intent: longText,
    sampleAnswer: longText,
    preparationTip: longText,
  })).length(10),
  disclaimer: z.string().trim().max(500).optional(),
});

export type AnalysisInput = z.infer<typeof analysisInputSchema>;
export type AnalysisResult = z.infer<typeof analysisSchema>;

export const ANALYSIS_DISCLAIMER = "以上结果由 AI 生成，仅供求职准备参考，不代表招聘方评价或录用概率。请核对事实后再使用。";
