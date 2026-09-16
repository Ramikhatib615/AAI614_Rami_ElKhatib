import Link from "next/link";

import { ContourField } from "@/components/sheet/contour-field";
import { Plate, StationHeading } from "@/components/sheet";
import { profile } from "@/data/profile";
import { siteConfig } from "@/lib/site";
import { publishableFacts, publishableProjects } from "@/lib/site";
import { siteCopy } from "@/lib/copy";

export default function HomePage() {
  const interests = publishableFacts(profile.interests);
  const target = publishableFacts(profile.identity).find((fact) => fact.id === "identity.target");
  const projects = publishableProjects().slice(0, 3);

  return (
    <div className="space-y-16">
      <section className="hero-frame relative isolate overflow-hidden px-5 py-12 sm:px-8 sm:py-16">
        <ContourField className="pointer-events-auto absolute inset-0 -z-10 h-full w-full" />

        <p aria-hidden className="font-mono text-xs text-ink-soft">
          {siteConfig.location.lat.toFixed(4)}° N {siteConfig.location.lon.toFixed(4)}° E
        </p>

        <h1 className="hero-rise font-display text-4xl leading-[1.05] sm:text-6xl">
          Rami El Khatib
        </h1>

        <p className="hero-rise measure mt-4 text-lg">{siteCopy.lede.text}</p>
        {target ? <p className="hero-rise measure mt-2 text-ink-soft">{target.text}</p> : null}

        <div className="hero-rise mt-8 flex flex-wrap items-center gap-4">
          <Link href="/cv" className="plate plate-raised bg-ground px-4 py-2 text-sm font-medium">
            Read the CV
          </Link>
          <Link href="/research" className="link text-sm">
            What I work on
          </Link>
        </div>
      </section>

      <section>
        <StationHeading number="01">Research interests</StationHeading>
        <ol className="mt-5 space-y-4">
          {interests.map((fact, index) => (
            <li key={fact.id} className="measure flex gap-4">
              <span aria-hidden className="station w-4 shrink-0 font-mono text-sm">
                {index + 1}.
              </span>
              <span>{fact.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <StationHeading number="02">Selected work</StationHeading>
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Plate as="li" key={project.id} className="p-5">
              <h3 className="font-display text-lg">{project.name}</h3>
              <p className="mt-1 font-mono text-xs text-ink-soft">
                {project.context}, {project.year}
              </p>
              <p className="mt-3 text-sm">{project.headline.text}</p>
            </Plate>
          ))}
        </ul>
        <p className="mt-5">
          <Link href="/projects" className="link text-sm">
            All projects
          </Link>
        </p>
      </section>
    </div>
  );
}
