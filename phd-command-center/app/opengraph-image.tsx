import { ImageResponse } from "next/og";

export const alt = "Rami El Khatib — surveying engineer and data scientist in Beirut";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social card. ImageResponse has no access to the stylesheet, so the palette from
 * docs/plan/design-system.md is repeated here as literals — the one place raw hex is allowed.
 */
const GROUND = "#f5f4f0";
const INK = "#12161a";
const INK_SOFT = "#4a5158";
const CONTOUR = "#a67a46";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: GROUND,
        color: INK,
        padding: 64,
        border: `1px solid ${CONTOUR}`,
      }}
    >
      <div style={{ display: "flex", gap: 18 }}>
        {Array.from({ length: 24 }).map((_, index) => (
          <div key={index} style={{ width: 1, height: 14, background: CONTOUR }} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 82, letterSpacing: -1.5 }}>Rami El Khatib</div>
        <div style={{ marginTop: 16, fontSize: 30, color: INK_SOFT }}>
          Surveying engineer by training, data scientist by practice.
        </div>
      </div>

      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: INK_SOFT }}
      >
        <div style={{ display: "flex", gap: 28 }}>
          <span>Machine learning</span>
          <span>GeoAI</span>
          <span>Applied data science</span>
        </div>
        <div>33.8938° N 35.5018° E</div>
      </div>
    </div>,
    size,
  );
}
