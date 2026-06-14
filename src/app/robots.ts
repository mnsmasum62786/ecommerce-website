import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep admin, account, and API surfaces out of search indexes.
        disallow: ["/admin", "/account", "/api/", "/checkout", "/cart"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
