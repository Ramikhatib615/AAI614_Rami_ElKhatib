import type { Metadata } from "next";
import Link from "next/link";

import { requireViewer } from "@/lib/guard";

export const metadata: Metadata = {
  title: "Command center",
  robots: { index: false, follow: false, nocache: true },
};

const nav = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/professors", label: "Professors" },
  { href: "/dashboard/outreach", label: "Outreach" },
  { href: "/dashboard/programs", label: "Programs" },
  { href: "/dashboard/cv", label: "CV" },
  { href: "/dashboard/applications", label: "Applications" },
];

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const viewer = await requireViewer();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-contour/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 py-4">
          <Link href="/dashboard" className="font-display text-lg">
            Command center
          </Link>
          <nav aria-label="Dashboard">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {nav.slice(1).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="font-mono text-xs text-ink-soft">{viewer.email}</p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
