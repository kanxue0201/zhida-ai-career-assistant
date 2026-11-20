# 职达 AI · 求职助手

基于 Next.js、DeepSeek 和 Supabase 的求职材料优化工具。上传文本型 PDF 简历并粘贴目标 JD，即可生成岗位匹配分析、简历优化建议、定向求职信和 10 组面试问答。

## 产品模式

- **游客模式**：PDF 仅在浏览器解析，不上传原文件，结果只保存在当前页面内存。
- **登录模式**：用户主动开启“保存本次分析到历史”后，保存简历解析文字、JD、报告与 Token 用量；原 PDF 不上传。
- 历史报告支持查看、单条删除，以及清空全部保存数据。

## 本地启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```powershell
Copy-Item .env.example .env.local
```

编辑 `.env.local`：

```dotenv
DEEPSEEK_API_KEY=你的真实DeepSeek密钥
DEEPSEEK_BASE_URL=your_base_url_here
DEEPSEEK_MODEL=your_model_name_here

NEXT_PUBLIC_SUPABASE_URL=https://你的项目ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的PublishableKey
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 是设计用于前端的公开密钥，数据安全由 RLS 保证。DeepSeek Key 和任何 Supabase Secret/Service Role Key 都不能添加 `NEXT_PUBLIC_` 前缀。

### 3. 初始化 Supabase

项目迁移位于：

```text
supabase/migrations/20261119124922_career_core.sql
```

迁移创建：

- `profiles`（关联 Auth 用户，首次登录访问时自动创建）
- `resumes`
- `resume_versions`
- `job_posts`
- `analysis_runs`
- `ai_usage_logs`
- 所有业务表均启用 RLS；不创建 Storage Bucket，storage_path 仅作为未来可选字段

通过 Supabase CLI 3.2+ 执行：

```bash
npx supabase@latest login
npx supabase@latest db query --remote=你的项目ref --file supabase/migrations/20261119124922_career_core.sql
```

在 Supabase Dashboard 的 Authentication 中启用 Email 登录，并将本地地址加入允许的 Redirect URLs：

```text
http://localhost:3000/auth/confirm
http://localhost:3000/**
```

生产环境还需加入正式域名。若启用邮箱确认，注册后需要先在邮箱完成验证。

### 4. 启动

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 工程检查

```bash
npm run typecheck
npm run lint
npm run build
```

## 核心实现

- **Auth**：`@supabase/ssr` Cookie 会话；Next.js 16 `proxy.ts` 刷新令牌；服务端通过 `getClaims()` 验证用户。
- **PDF**：`pdfjs-dist` + Web Worker，浏览器本地提取；无论是否登录，均不上传原 PDF。
- **AI**：Next.js Route Handler 服务端调用 DeepSeek，Zod 校验结构化结果，失败有限重试。
- **历史**：分析关联具体 `resume_version_id`，AI 四类结果存 `result_json`，匹配分独立存储用于列表查询。
- **成本**：每次上游调用记录 Token 用量，不记录 Prompt、简历正文或 JD。
- **安全**：全表 RLS、Auth 用户资料隔离、服务端输入校验、请求限流和敏感日志约束；本阶段不使用 Supabase Storage。
- **删除**：可删除单份报告；“清空保存数据”会删除当前用户的全部分析、岗位、简历文字记录。该操作不删除 Supabase Auth 账户本身。

## 主要目录

```text
app/
  api/analyze/            # DeepSeek + 分析持久化 + 用量记录
  api/resumes/            # 简历文字与版本保存（不上传 PDF）
  api/jobs/               # JD 保存
  api/history/            # 单条及全部历史删除
  history/                # 历史列表与报告详情
  login/                  # 邮箱登录与注册
  auth/confirm/           # 邮箱验证回调
components/
  career-assistant.tsx    # 游客/登录双模式主流程
  results.tsx             # 四类 AI 结果
  history-list.tsx        # 历史报告列表
  auth-form.tsx           # Auth 表单
lib/
  supabase/               # Browser/Server Supabase 客户端
  analysis-schema.ts      # AI 输入输出契约
  pdf.ts                  # PDF 文字提取
proxy.ts                  # Supabase 会话刷新
supabase/migrations/      # 数据库迁移（暂不包含 Storage）
```

## 当前边界

- 仅支持文本型 PDF，不支持扫描件 OCR；
- 本阶段不创建 Supabase Storage；resume_versions.storage_path 保留为空，供未来可选文件存储使用；
- AI 结果仅供求职准备参考，使用前应核对事实；
- 内存限流适合作为基础防护，多实例生产环境应改用部署平台或独立限流服务；
- AI 结果暂存 JSONB；逐条接受建议、面试作答和求职信多版本编辑时再拆子表；
- 清空保存数据不等于注销 Auth 账户，账户注销需后续接入受保护的服务端管理流程。

完整原始产品需求见 [AI求职助手-需求文档.md](./AI求职助手-需求文档.md)。

