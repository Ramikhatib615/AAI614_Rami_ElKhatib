import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5">
      <div className="plate plate-ticks p-8">
        <h1 className="font-display text-2xl">Not here</h1>
        <p className="measure mt-3 text-sm text-ink-soft">
          That page does not exist. It may have been a record that was since removed.
        </p>
        <Link href="/" className="link mt-6 inline-block text-sm">
          Back to the start
        </Link>
      </div>
    </main>
  );
}
