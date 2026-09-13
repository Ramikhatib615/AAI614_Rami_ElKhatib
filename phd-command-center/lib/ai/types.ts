/**
 * A narrow view of the Messages API — only the parts this app uses.
 *
 * Defining it here rather than depending on the SDK's types everywhere means the call helpers can
 * be unit tested against a fake, which is how the success, retry, search-error and budget paths
 * are covered without spending money.
 */
export type AiContentBlock = { type: string } & Record<string, unknown>;

export interface AiUsageRaw {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
}

export interface AiResponse {
  stop_reason: string | null;
  stop_details?: { category?: string | null; explanation?: string | null } | null;
  content: AiContentBlock[];
  usage: AiUsageRaw;
}

export interface AiParsedResponse extends AiResponse {
  parsed_output: unknown;
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string | AiContentBlock[];
}

export interface AiCreateParams {
  model: string;
  max_tokens: number;
  system?: unknown;
  messages: AiMessage[];
  tools?: unknown[];
  thinking?: unknown;
  output_config?: unknown;
  cache_control?: unknown;
}

export interface AiParseParams extends AiCreateParams {
  output_config: unknown;
}

export interface AiClient {
  create(params: AiCreateParams): Promise<AiResponse>;
  parse(params: AiParseParams): Promise<AiParsedResponse>;
}

export function isTextBlock(block: AiContentBlock): block is { type: "text"; text: string } {
  return block.type === "text" && typeof block.text === "string";
}

/**
 * Server-tool failures arrive inside a 200 response, not as a thrown error (PROMPT.md §3.1).
 * For web search a successful `content` is an array of results; an error is a single object
 * carrying `error_code`. Branch on that before indexing.
 */
export function serverToolError(block: AiContentBlock): string | null {
  if (block.type !== "web_search_tool_result" && block.type !== "web_fetch_tool_result") {
    return null;
  }
  const content = block.content;
  if (Array.isArray(content) || content === null || typeof content !== "object") return null;
  const code = (content as Record<string, unknown>).error_code;
  return typeof code === "string" ? code : null;
}

export function collectServerToolErrors(content: AiContentBlock[]): string[] {
  return content.map(serverToolError).filter((code): code is string => code !== null);
}

export function textOf(content: AiContentBlock[]): string {
  return content
    .filter(isTextBlock)
    .map((block) => block.text)
    .join("\n")
    .trim();
}
