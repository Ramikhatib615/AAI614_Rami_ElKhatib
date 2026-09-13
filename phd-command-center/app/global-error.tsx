"use client";

/** The last resort: this replaces the root layout, so it carries its own minimal styling. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", lineHeight: 1.5 }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Something went wrong</h1>
        <p style={{ maxWidth: "60ch", color: "#4a5158" }}>
          The application failed to start. Nothing was changed or sent.
          {error.digest ? ` Reference ${error.digest}.` : ""}
        </p>
      </body>
    </html>
  );
}
