import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

const routes = ["", "/research", "/projects", "/experience", "/cv", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
