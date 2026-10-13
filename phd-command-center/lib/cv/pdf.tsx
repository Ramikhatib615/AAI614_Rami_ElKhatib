import "server-only";

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { CvDocument } from "./types";

/**
 * The PDF uses the fourteen built-in PDF fonts, so rendering never depends on fetching a font
 * file at request time. Times reads as academic; Helvetica carries the small meta lines.
 *
 * Palette literals repeat docs/plan/design-system.md — react-pdf cannot see the stylesheet, so
 * this is the second and last place raw hex is allowed (the first is the OG image).
 */
const INK = "#12161A";
const INK_SOFT = "#4A5158";
const CONTOUR = "#A67A46";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    lineHeight: 1.4,
    color: INK,
  },
  name: { fontSize: 20, fontFamily: "Times-Bold", marginBottom: 4 },
  contact: { fontFamily: "Helvetica", fontSize: 8.5, color: INK_SOFT, marginBottom: 2 },
  rule: { borderBottomWidth: 0.5, borderBottomColor: CONTOUR, marginTop: 10, marginBottom: 12 },
  sectionHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: INK_SOFT,
    marginBottom: 6,
  },
  section: { marginBottom: 14 },
  entry: { marginBottom: 8 },
  entryHeading: { fontFamily: "Times-Bold", fontSize: 10.5 },
  entryMeta: { fontFamily: "Helvetica", fontSize: 8, color: INK_SOFT, marginBottom: 3 },
  line: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 10, color: CONTOUR },
  lineText: { flex: 1 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: INK_SOFT,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export function CvPdf({ document, name }: { document: CvDocument; name: string }) {
  return (
    <Document title={`${name} — ${document.label}`} author={name}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{name}</Text>
        {document.contact.map((line) => (
          <Text key={line.id} style={styles.contact}>
            {line.text}
          </Text>
        ))}
        <View style={styles.rule} />

        {document.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            {section.entries.map((entry) => (
              <View key={entry.id} style={styles.entry} wrap={false}>
                {entry.heading ? <Text style={styles.entryHeading}>{entry.heading}</Text> : null}
                {entry.meta ? <Text style={styles.entryMeta}>{entry.meta}</Text> : null}
                {entry.lines.map((line) => (
                  <View key={line.id} style={styles.line}>
                    {/* The control-point triangle is not in WinAnsi, which is all the built-in fonts encode; it
                        renders as a stray superscript. A bullet is, so the PDF uses one. */}
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.lineText}>{line.text}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>{name}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderCvPdf(document: CvDocument, name: string): Promise<Buffer> {
  return renderToBuffer(<CvPdf document={document} name={name} />);
}

/** Page count read back from the rendered file, so the two-page rule is checked on the real PDF. */
export function countPdfPages(buffer: Buffer): number {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches?.length ?? 0;
}

/** ElKhatib_Rami_CV_<Target>.pdf, per PROMPT.md §6.5. */
export function cvFileName(target?: string): string {
  const suffix = target
    ? `_${target.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`
    : "_Master";
  return `ElKhatib_Rami_CV${suffix}.pdf`;
}
