import "server-only";

import { gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { monthStart } from "./budget";
import { estimateCostUsd, type UsageCounts } from "./pricing";

export interface UsageRecord extends UsageCounts {
  model: string;
  purpose: string;
  jobId?: string | null;
}

/** Every model call writes one row here; the budget cap reads them back. */
export async function recordUsage(record: UsageRecord): Promise<number> {
  const costUsd = estimateCostUsd(record.model, record);
  await db()
    .insert(aiUsage)
    .values({
      jobId: record.jobId ?? null,
      purpose: record.purpose,
      model: record.model,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      cacheReadTokens: record.cacheReadTokens,
      cacheWriteTokens: record.cacheWriteTokens,
      searchCount: record.searchCount,
      estimatedCostUsd: costUsd.toFixed(6),
    });
  return costUsd;
}

export async function monthToDateSpendUsd(): Promise<number> {
  const [row] = await db()
    .select({ total: sql<string>`coalesce(sum(${aiUsage.estimatedCostUsd}), 0)` })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, monthStart()));
  return Number(row?.total ?? 0);
}
