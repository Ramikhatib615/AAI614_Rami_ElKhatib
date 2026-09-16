import { profile } from "@/data/profile";
import { buildMasterCv } from "@/lib/cv/master";
import { countPdfPages, cvFileName, renderCvPdf } from "@/lib/cv/pdf";
import { privateProfileValue } from "@/lib/env";
import { requireViewerApi } from "@/lib/guard";
import { checkCvDocument } from "@/lib/integrity/cv";

export const maxDuration = 60;

/**
 * Renders the master CV. The integrity check runs against the rendered document — so a hand-edit
 * or a future tailoring step cannot route around it — and a failing check returns the reasons
 * instead of a file.
 */
export async function GET(): Promise<Response> {
  const guard = await requireViewerApi();
  if ("response" in guard) return guard.response;

  const document = buildMasterCv(profile, {
    includePrivate: true,
    privateValues: { PROFILE_PHONE: privateProfileValue("PROFILE_PHONE") ?? undefined },
  });

  const pdf = await renderCvPdf(document, "Rami El Khatib");
  const report = checkCvDocument(document, profile, { pageCount: countPdfPages(pdf) });

  if (!report.exportable) {
    return Response.json(
      {
        error: "integrity_check_failed",
        message: "The CV was not exported. Every issue below has to be resolved first.",
        errors: report.errors,
        warnings: report.warnings,
      },
      { status: 409, headers: { "X-Robots-Tag": "noindex, nofollow" } },
    );
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${cvFileName()}"`,
      "X-Robots-Tag": "noindex, nofollow",
      "X-Cv-Warnings": String(report.warnings.length),
    },
  });
}
