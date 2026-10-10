import type { Metadata } from "next";

import { StationHeading } from "@/components/sheet";
import { profile } from "@/data/profile";
import { siteCopy } from "@/lib/copy";
import {
  publishableEducation,
  publishableExperience,
  publishableFacts,
  publishableProjects,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "CV",
  description: "Academic CV: education, research and technical projects, experience, and skills.",
};

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <StationHeading number={number}>{title}</StationHeading>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function CvPage() {
  const interests = publishableFacts(profile.interests);
  const education = publishableEducation();
  const experience = publishableExperience();
  const projects = publishableProjects();
  const skills = publishableFacts(profile.skills);
  const languages = publishableFacts(profile.languages);
  const service = publishableFacts(profile.service);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Curriculum vitae</h1>
        <p className="measure mt-3 text-sm text-ink-soft">{siteCopy.cvNote.text}</p>
      </header>

      <Section number="01" title="Research interests">
        <ul className="space-y-2">
          {interests.map((fact) => (
            <li key={fact.id} className="measure text-sm">
              {fact.text}
            </li>
          ))}
        </ul>
      </Section>

      <Section number="02" title="Education">
        <ul className="space-y-3">
          {education.map((record) => (
            <li key={record.id} className="text-sm">
              <span className="font-medium">
                {record.degree} {record.field}
              </span>
              , {record.institution}
              <span className="ml-3 font-mono text-xs text-ink-soft">
                {record.start} to {record.end ?? "present"}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section number="03" title="Projects">
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id} className="measure text-sm">
              <span className="font-medium">{project.name}</span>
              <span className="text-ink-soft">
                {" "}
                — {project.context}, {project.year}.
              </span>{" "}
              {project.headline.text}
            </li>
          ))}
        </ul>
      </Section>

      <Section number="04" title="Experience">
        <ul className="space-y-4">
          {experience.map((record) => (
            <li key={record.id} className="text-sm">
              <span className="font-medium">
                {record.role}, {record.organization}
              </span>
              <span className="ml-3 font-mono text-xs text-ink-soft">
                {record.start} to {record.end ?? "present"}
              </span>
              <ul className="mt-1 space-y-1">
                {record.bullets.slice(0, 3).map((bullet) => (
                  <li key={bullet.id} className="measure text-ink-soft">
                    {bullet.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      <Section number="05" title="Skills">
        <ul className="space-y-1">
          {skills.map((fact) => (
            <li key={fact.id} className="measure text-sm">
              {fact.text}
            </li>
          ))}
        </ul>
      </Section>

      <Section number="06" title="Languages">
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {languages.map((fact) => (
            <li key={fact.id}>{fact.text}</li>
          ))}
        </ul>
      </Section>

      <Section number="07" title="Service">
        <ul className="space-y-2">
          {service.map((fact) => (
            <li key={fact.id} className="measure text-sm">
              {fact.text}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
