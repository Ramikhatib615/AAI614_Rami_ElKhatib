// `server-only` throws outside the Next.js bundler. Unit tests run server modules directly, so
// the import is aliased to this empty module (see vitest.config.ts). The guard still applies in
// the app: any client component importing a server module fails the build.
export {};
