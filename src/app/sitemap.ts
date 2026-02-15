import { MetadataRoute } from "next";
import { readFileSync, existsSync } from "fs";
import path from "path";

interface CareHomeEntry {
  id: string;
  ins: string | null;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    {
      url: "https://carehomeratings.co.uk",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://carehomeratings.co.uk/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Add all care home location pages
  const dataPath = path.join(process.cwd(), "public/data/care-homes.json");
  if (existsSync(dataPath)) {
    try {
      const data: CareHomeEntry[] = JSON.parse(
        readFileSync(dataPath, "utf-8")
      );
      for (const home of data) {
        pages.push({
          url: `https://carehomeratings.co.uk/location/${home.id}`,
          lastModified: home.ins ? new Date(home.ins) : new Date(),
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    } catch {
      // If data fails to load, just return static pages
    }
  }

  return pages;
}
