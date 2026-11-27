import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const locked =
    Boolean(process.env.ZGJOI_PASSWORD) || process.env.VERCEL_ENV === "preview";
  return {
    rules: {
      userAgent: "*",
      allow: locked ? undefined : "/",
      disallow: locked
        ? "/"
        : [
            "/api/",
            "/admin",
            "/pro/",
            "/llogaria",
            "/siguria",
            "/kerkesa-e-re",
            "/hyr",
            "/rivendos-fjalekalimin",
            "/verifiko-emailin",
            "/en/admin",
            "/en/pro/",
            "/en/llogaria",
            "/en/siguria",
            "/en/kerkesa-e-re",
            "/en/hyr",
            "/en/rivendos-fjalekalimin",
            "/en/verifiko-emailin",
          ],
    },
    ...(locked ? {} : { sitemap: "https://zgjoi.com/sitemap.xml" }),
  };
}
