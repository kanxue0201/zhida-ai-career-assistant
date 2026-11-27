import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 默认配置：内存/无持久化增量缓存。本项目所有页面与 API 均为动态渲染，
// 不依赖 ISR，无需 R2/KV 缓存后端。
export default defineCloudflareConfig({});