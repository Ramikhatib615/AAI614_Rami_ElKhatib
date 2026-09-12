import Link from "next/link";

const nav = [
  { href: "/research", label: "Research" },
  { href: "/projects", label: "Projects" },
  { href: "/experience", label: "Experience" },
  { href: "/cv", label: "CV" },
  { href: "/contact", label: "Contact" },
];

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-contour/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 py-4">
          <Link href="/" className="font-display text-lg">
            Rami El Khatib
          </Link>
          <nav aria-label="Main">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>

      <footer className="mt-16 border-t border-contour/60">
        <div className="mx-auto max-w-5xl px-5 py-6 text-sm text-ink-soft">
          <p>Beirut, Lebanon</p>
        </div>
      </footer>
    </div>
  );
}
