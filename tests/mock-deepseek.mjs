import http from "node:http";

const analysisResult = {
  matchAnalysis: {
    score: 82,
    level: "较高",
    summary: "你的前端工程经验与岗位要求较为吻合，React 和 TypeScript 实践是主要优势。建议进一步突出 Next.js 项目中的协作方式与真实业务成果。",
    strengths: [
      { title: "核心技术栈匹配", evidence: "简历明确列出 React、TypeScript 和 Next.js 经验，与 JD 的核心技术要求直接对应。" },
      { title: "跨职能协作经验", evidence: "简历提到与产品设计师和后端工程师协作，符合岗位对团队推进能力的要求。" }
    ],
    gaps: [
      { title: "项目成果表达不够具体", evidence: "简历提到提升加载速度，但未体现具体测量口径。", suggestion: "补充真实、可核验的性能指标和优化动作。" }
    ]
  },
  resumeSuggestions: Array.from({ length: 5 }, (_, index) => ({
    priority: index < 2 ? "高" : index < 4 ? "中" : "低",
    section: index === 0 ? "个人摘要" : "项目经历",
    jdRequirement: "岗位需要 React、TypeScript、Next.js 实践与跨团队协作能力。",
    issue: `第 ${index + 1} 处经历目前更偏职责描述，与岗位关键词的连接不够清晰。`,
    suggestion: `建议 ${index + 1}：将与目标岗位最相关的真实技术行动放在句首，并说明协作对象。`,
    rewriteExample: "使用 React 与 TypeScript 参与客户仪表盘开发，协同产品设计和后端工程师推进需求落地。"
  })),
  coverLetter: "尊敬的招聘团队：\n\n您好！我希望应聘贵团队的前端开发岗位。我的三年前端开发经历涵盖 React、TypeScript 和 Next.js，与岗位核心技术要求高度相关。\n\n在客户仪表盘项目中，我参与页面开发与加载体验优化，并与产品设计师和后端工程师持续协作。这段经历让我能够在理解业务需求的基础上推进技术实现，也让我重视清晰沟通和可靠交付。\n\n我期待将这些真实经验带到新的团队中，继续打造高质量的产品体验。感谢您的时间，期待有机会进一步交流。\n\n此致\n敬礼！\n张三",
  interviewQuestions: Array.from({ length: 10 }, (_, index) => ({
    question: `面试问题 ${index + 1}：请结合你的真实经历，介绍与这个前端岗位最相关的一项实践？`,
    intent: "了解候选人的技术实践、岗位理解和真实贡献。",
    sampleAnswer: "可以围绕客户仪表盘项目，按项目背景、个人任务、具体行动和真实结果展开，重点说明 React 与 TypeScript 的使用方式，以及与产品设计和后端团队协作的过程。",
    preparationTip: "提前核对项目细节，只使用自己能够解释和证明的事实。"
  }))
};

const pageContent = {
  profile: {
    name: "张三",
    headline: "3 年经验的 React 前端工程师",
    tagline: "专注 B 端产品的前端工程师，擅长 React 与 TypeScript 工程实践。曾在客户仪表盘项目中协同产品与后端团队推进需求落地，重视清晰沟通与可靠交付。",
    location: "上海",
    yearsLabel: "3 年经验",
  },
  highlights: [
    { title: "核心技术栈扎实", description: "三年 React、TypeScript 与 Next.js 实践，覆盖客户仪表盘等真实 B 端项目。" },
    { title: "跨职能协作经验", description: "与产品设计师和后端工程师持续协作，在理解业务需求的基础上推进技术实现。" },
    { title: "关注加载体验", description: "参与页面加载体验优化，重视性能与交付质量（具体指标请补充真实数据）。" },
  ],
  about: "三年前端开发经历，主要面向 B 端产品。习惯从业务需求出发组织技术方案，在客户仪表盘项目中负责页面开发与加载体验优化，并与产品设计和后端团队保持紧密协作。",
  skills: [
    { category: "前端核心", items: ["React", "TypeScript", "Next.js"] },
    { category: "工程协作", items: ["跨团队沟通", "需求拆解", "代码评审"] },
  ],
  projects: [
    {
      name: "客户仪表盘",
      role: "前端开发",
      period: "2024—2025",
      summary: "面向企业客户的 B 端数据仪表盘，使用 React 与 TypeScript 开发页面并优化加载体验。",
      achievements: ["参与页面开发与加载体验优化", "协同产品设计和后端工程师推进需求落地"],
      tags: ["React", "TypeScript", "B 端"],
    },
  ],
  experience: [
    { company: "某科技公司", title: "前端工程师", period: "2022—至今", summary: "负责 B 端产品前端开发，参与客户仪表盘等项目。" },
  ],
  education: [
    { school: "某大学", degree: "计算机科学与技术 · 本科", period: "2018—2022" },
  ],
  contacts: { email: "zhangsan@example.com" },
  cta: { label: "联系我", type: "email", value: "zhangsan@example.com" },
  settings: { sections: { about: true, highlights: true, skills: true, projects: true, experience: true, education: true, contacts: true } },
};

const server = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/chat/completions") {
    response.writeHead(404).end(); return;
  }
  let body = "";
  request.on("data", (chunk) => { body += chunk; });
  request.on("end", () => {
    const payload = JSON.parse(body);
    if (request.headers.authorization !== "Bearer test-key" || !payload.response_format) {
      response.writeHead(400).end(JSON.stringify({ error: "invalid test request" })); return;
    }
    const systemPrompt = payload.messages?.find((message) => message.role === "system")?.content || "";
    const result = systemPrompt.includes("resume-page-1") ? pageContent : analysisResult;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(result) } }] }));
  });
});
server.listen(4010, "127.0.0.1", () => console.log("Mock DeepSeek listening on 4010"));
