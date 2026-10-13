import { z } from "zod";

import { fetchJson } from "./http";

/**
 * OpenAlex client.
 *
 * Access model checked on 12 September 2026 (help.openalex.org/access/pricing and /api):
 * usage is metered at about $0.001 per request, every account gets $1 of usage per day free, and a
 * free API key raises that 10x. The key goes in the `api_key` query parameter. The old `mailto`
 * polite-pool parameter is no longer part of the scheme, so the contact address identifies us in
 * the User-Agent instead. Each response reports `meta.cost_usd`, which callers accumulate.
 */
const BASE = "https://api.openalex.org";

const authorSchema = z.object({
  id: z.string(),
  display_name: z.string().nullish(),
  orcid: z.string().nullish(),
});

const institutionSchema = z.object({
  id: z.string().nullish(),
  display_name: z.string().nullish(),
  country_code: z.string().nullish(),
  ror: z.string().nullish(),
});

const authorshipSchema = z.object({
  author: authorSchema,
  institutions: z.array(institutionSchema).default([]),
  author_position: z.string().nullish(),
});

const workSchema = z.object({
  id: z.string(),
  doi: z.string().nullish(),
  display_name: z.string().nullish(),
  title: z.string().nullish(),
  publication_year: z.number().nullish(),
  publication_date: z.string().nullish(),
  type: z.string().nullish(),
  cited_by_count: z.number().nullish(),
  primary_location: z
    .object({ source: z.object({ display_name: z.string().nullish() }).nullish() })
    .nullish(),
  authorships: z.array(authorshipSchema).default([]),
  topics: z.array(z.object({ display_name: z.string().nullish() })).default([]),
});

const metaSchema = z.object({
  count: z.number().nullish(),
  per_page: z.number().nullish(),
  next_cursor: z.string().nullish(),
  cost_usd: z.number().nullish(),
});

const worksResponseSchema = z.object({
  meta: metaSchema.default({}),
  results: z.array(workSchema),
});

const openAlexAuthorSchema = z.object({
  id: z.string(),
  display_name: z.string().nullish(),
  orcid: z.string().nullish(),
  works_count: z.number().nullish(),
  cited_by_count: z.number().nullish(),
  last_known_institutions: z.array(institutionSchema).default([]),
  affiliations: z
    .array(z.object({ institution: institutionSchema, years: z.array(z.number()).default([]) }))
    .default([]),
  topics: z.array(z.object({ display_name: z.string().nullish() })).default([]),
});

export type OpenAlexWork = z.infer<typeof workSchema>;
export type OpenAlexAuthor = z.infer<typeof openAlexAuthorSchema>;

export interface OpenAlexConfig {
  contactEmail: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export interface CostedResult<T> {
  data: T;
  costUsd: number;
}

function userAgent(config: OpenAlexConfig): string {
  return `phd-command-center/0.1 (+https://github.com/Ramikhatib615; mailto:${config.contactEmail})`;
}

function url(
  path: string,
  params: Record<string, string | number | undefined>,
  config: OpenAlexConfig,
): string {
  const target = new URL(`${BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") target.searchParams.set(key, String(value));
  }
  if (config.apiKey) target.searchParams.set("api_key", config.apiKey);
  return target.toString();
}

/** Recent works matching a topic. `fromDate` is an ISO date; OpenAlex filters are comma-separated. */
export async function searchWorks(
  config: OpenAlexConfig,
  options: { query: string; fromDate: string; perPage?: number; cursor?: string },
): Promise<CostedResult<{ works: OpenAlexWork[]; nextCursor: string | null; count: number }>> {
  const body = await fetchJson({
    source: "OpenAlex",
    userAgent: userAgent(config),
    fetchImpl: config.fetchImpl,
    url: url(
      "/works",
      {
        search: options.query,
        filter: `from_publication_date:${options.fromDate},type:article`,
        "per-page": options.perPage ?? 50,
        sort: "cited_by_count:desc",
        cursor: options.cursor ?? "*",
      },
      config,
    ),
  });

  const parsed = worksResponseSchema.parse(body);
  return {
    data: {
      works: parsed.results,
      nextCursor: parsed.meta.next_cursor ?? null,
      count: parsed.meta.count ?? parsed.results.length,
    },
    costUsd: parsed.meta.cost_usd ?? 0,
  };
}

export async function getAuthor(
  config: OpenAlexConfig,
  authorId: string,
): Promise<CostedResult<OpenAlexAuthor>> {
  const id = authorId.replace(/^https?:\/\/openalex\.org\//, "");
  const body = await fetchJson({
    source: "OpenAlex",
    userAgent: userAgent(config),
    fetchImpl: config.fetchImpl,
    url: url(`/authors/${id}`, {}, config),
  });
  const parsed = openAlexAuthorSchema.parse(body);
  return { data: parsed, costUsd: 0 };
}

export interface VerifiedPaper {
  title: string;
  year: number | null;
  venue: string | null;
  url: string;
  doi: string | null;
  openAlexId: string;
  citedByCount: number | null;
  /** True because the record came from OpenAlex itself, not from a model's recollection. */
  verified: true;
}

/**
 * Normalises a work into the shape stored on a professor. The URL is always the OpenAlex or DOI
 * landing page — a real, checkable link, never one the model produced (CLAUDE.md rule 5).
 */
export function toVerifiedPaper(work: OpenAlexWork): VerifiedPaper | null {
  const title = work.display_name ?? work.title;
  if (!title) return null;

  const doi = work.doi ? work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "") : null;
  return {
    title,
    year: work.publication_year ?? null,
    venue: work.primary_location?.source?.display_name ?? null,
    url: doi ? `https://doi.org/${doi}` : work.id,
    doi,
    openAlexId: work.id,
    citedByCount: work.cited_by_count ?? null,
    verified: true,
  };
}

export interface AuthorCandidate {
  openAlexId: string;
  name: string;
  orcid: string | null;
  institutionName: string | null;
  institutionId: string | null;
  countryCode: string | null;
  papers: VerifiedPaper[];
  topics: string[];
}

/**
 * Aggregates authors across a set of works, keeping the papers that support each one. Only last
 * authors and corresponding-position authors are of interest for supervision, but OpenAlex does not
 * always mark them, so every author is kept and the position is left to the scorer.
 */
export function aggregateAuthors(works: OpenAlexWork[]): AuthorCandidate[] {
  const byAuthor = new Map<string, AuthorCandidate>();

  for (const work of works) {
    const paper = toVerifiedPaper(work);
    if (!paper) continue;
    const workTopics = work.topics
      .map((topic) => topic.display_name)
      .filter((t): t is string => !!t);

    for (const authorship of work.authorships) {
      const id = authorship.author.id;
      const name = authorship.author.display_name;
      if (!id || !name) continue;

      const institution = authorship.institutions[0];
      const existing = byAuthor.get(id);
      if (existing) {
        existing.papers.push(paper);
        for (const topic of workTopics) {
          if (!existing.topics.includes(topic)) existing.topics.push(topic);
        }
        continue;
      }

      byAuthor.set(id, {
        openAlexId: id,
        name,
        orcid: authorship.author.orcid ?? null,
        institutionName: institution?.display_name ?? null,
        institutionId: institution?.id ?? null,
        countryCode: institution?.country_code ?? null,
        papers: [paper],
        topics: workTopics,
      });
    }
  }

  return [...byAuthor.values()].sort((a, b) => b.papers.length - a.papers.length);
}
