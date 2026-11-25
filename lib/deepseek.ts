// Shared DeepSeek client extracted from app/api/analyze/route.ts.
// Behavior (error codes, retryability, env contract) is intentionally identical
// for both the career analysis and the resume page generation endpoints.

export class UpstreamError extends Error {
  constructor(public code: string, public httpStatus: number, public retryable = false) {
    super(code);
    this.name = "UpstreamError";
  }
}

export type DeepSeekUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

function positiveIntegerOrDefault(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function modelName() {
  return process.env.DEEPSEEK_MODEL?.trim() || "missing-model";
}

export async function callDeepSeekJson(
  systemPrompt: string,
  userContent: string,
  options: { temperature?: number } = {},
): Promise<{ candidate: unknown; usage?: DeepSeekUsage }> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const baseUrlValue = process.env.DEEPSEEK_BASE_URL?.trim();
  const model = modelName();
  if (!apiKey || apiKey === "your_api_key_here" || !baseUrlValue || model === "missing-model") {
    throw new UpstreamError("AI_NOT_CONFIGURED", 503);
  }

  const baseUrl = baseUrlValue.replace(/\/$/, "");
  const timeoutMs = positiveIntegerOrDefault(process.env.DEEPSEEK_TIMEOUT_MS, 90_000);
  const maxTokens = positiveIntegerOrDefault(process.env.DEEPSEEK_MAX_TOKENS, 8_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: options.temperature ?? 0.4,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 429) throw new UpstreamError("UPSTREAM_RATE_LIMITED", 429);
      if (response.status === 401 || response.status === 403) throw new UpstreamError("AI_NOT_CONFIGURED", 503);
      throw new UpstreamError("UPSTREAM_ERROR", 502, response.status >= 500);
    }

    const payload = await response.json() as {
      choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
      usage?: DeepSeekUsage;
    };
    const choice = payload.choices?.[0];
    if (choice?.finish_reason === "length") throw new UpstreamError("AI_INCOMPLETE_RESPONSE", 502);
    const content = choice?.message?.content?.trim();
    if (!content) throw new UpstreamError("AI_INVALID_RESPONSE", 502, true);
    return { candidate: JSON.parse(content) as unknown, usage: payload.usage };
  } catch (error) {
    if (error instanceof UpstreamError || error instanceof SyntaxError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new UpstreamError("UPSTREAM_TIMEOUT", 504);
    throw new UpstreamError("UPSTREAM_ERROR", 502, true);
  } finally {
    clearTimeout(timeout);
  }
}

// In-memory per-client rate limiting. Basic protection only; a multi-instance
// production deployment should move this to a platform or shared store.
export function createRateLimiter({ windowMs, limit, maxClients = 1_000 }: { windowMs: number; limit: number; maxClients?: number }) {
  const requestsByClient = new Map<string, { count: number; resetAt: number }>();
  return function isRateLimited(request: Request) {
    const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const now = Date.now();
    const current = requestsByClient.get(client);
    if (!current || current.resetAt <= now) {
      if (requestsByClient.size > maxClients) requestsByClient.clear();
      requestsByClient.set(client, { count: 1, resetAt: now + windowMs });
      return false;
    }
    current.count += 1;
    return current.count > limit;
  };
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) throw new UpstreamError("INPUT_TOO_LONG", 413);
  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > maxBytes) throw new UpstreamError("INPUT_TOO_LONG", 413);
  return JSON.parse(bodyText) as unknown;
}