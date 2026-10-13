import type { Metadata } from "next";

import { Plate } from "@/components/sheet";
import { siteCopy } from "@/lib/copy";
import { publishableProjects } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Geospatial and public-sector data projects with UN ESCWA, UN-Habitat, and others in Lebanon.",
};

export default function ProjectsPage() {
  const projects = publishableProjects();

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Projects</h1>
        <p className="measure mt-4">{siteCopy.projectsIntro.text}</p>
      </header>

      <ul className="space-y-6">
        {projects.map((project) => (
          <Plate as="li" key={project.id} className="p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="font-display text-xl sm:text-2xl">{project.name}</h2>
              <p className="font-mono text-xs text-ink-soft">
                {project.context}, {project.year}
              </p>
            </div>

            <p className="measure mt-3">{project.headline.text}</p>

            {project.details.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {project.details.map((detail) => (
                  <li key={detail.id} className="measure text-sm text-ink-soft">
                    {detail.text}
                  </li>
                ))}
              </ul>
            ) : null}

            {project.tools.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-ink-soft">
                {project.tools.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            ) : null}

            {project.links.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-4 text-sm">
                {project.links.map((link) => (
                  <li key={link.url}>
                    <a className="link" href={link.url} rel="noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </Plate>
        ))}
      </ul>
    </div>
  );
}
