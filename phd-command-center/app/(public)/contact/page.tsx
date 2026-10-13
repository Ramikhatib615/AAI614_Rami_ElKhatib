import type { Metadata } from "next";

import { Plate } from "@/components/sheet";
import { siteConfig, publishableContacts } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Rami El Khatib.",
};

export default function ContactPage() {
  const channels = publishableContacts();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Contact</h1>
      </header>

      <Plate className="p-6">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-mono text-xs text-ink-soft">Location</dt>
            <dd>
              {siteConfig.location.city}, {siteConfig.location.country}
            </dd>
          </div>
          {channels.map((fact) => (
            <div key={fact.id}>
              <dt className="font-mono text-xs text-ink-soft">Email</dt>
              <dd>
                <a className="link" href={`mailto:${fact.text}`}>
                  {fact.text}
                </a>
              </dd>
            </div>
          ))}
        </dl>
        {channels.length === 0 ? (
          <p className="measure mt-4 text-sm text-ink-soft">
            An email address will be listed here once it is confirmed.
          </p>
        ) : null}
      </Plate>
    </div>
  );
}
