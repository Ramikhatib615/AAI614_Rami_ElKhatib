import type { Metadata } from "next";

import { StationHeading } from "@/components/sheet";
import { publishableEducation, publishableExperience } from "@/lib/site";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Data and GIS roles with UN ESCWA, UN-Habitat and others, and degrees in data science and surveying engineering.",
};

function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  const name = new Date(Number(year), Number(month) - 1, 1).toLocaleString("en", {
    month: "short",
  });
  return `${name} ${year}`;
}

function formatRange(start: string, end: string | null): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "present"}`;
}

export default function ExperiencePage() {
  const experience = publishableExperience();
  const education = publishableEducation();

  return (
    <div className="space-y-14">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Experience and education</h1>
      </header>

      <section>
        <StationHeading number="01">Experience</StationHeading>
        <ol className="mt-6 space-y-8 border-l border-contour/50 pl-5">
          {experience.map((record) => (
            <li key={record.id}>
              <h3 className="font-display text-lg">
                {record.role}, {record.organization}
              </h3>
              <p className="font-mono text-xs text-ink-soft">
                {formatRange(record.start, record.end)}
                <span className="ml-4">{record.location}</span>
              </p>
              {record.unit ? <p className="text-sm text-ink-soft">{record.unit}</p> : null}
              <ul className="mt-3 space-y-2">
                {record.bullets.map((bullet) => (
                  <li key={bullet.id} className="measure text-sm">
                    {bullet.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <StationHeading number="02">Education</StationHeading>
        <ol className="mt-6 space-y-6 border-l border-contour/50 pl-5">
          {education.map((record) => (
            <li key={record.id}>
              <h3 className="font-display text-lg">
                {record.degree} {record.field}
              </h3>
              <p className="font-mono text-xs text-ink-soft">
                {record.institution}
                <span className="ml-4">{formatRange(record.start, record.end)}</span>
              </p>
              {record.details.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {record.details.map((detail) => (
                    <li key={detail.id} className="measure text-sm text-ink-soft">
                      {detail.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
