"use client";
import NextLink from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { useLocale } from "@/lib/i18n/client";
import { localizePath } from "@/lib/i18n/config";

/** next/link that keeps the visitor in their language (/en prefix for English). */
const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function Link({ href, ...props }, ref) {
  const locale = useLocale();
  const localized = typeof href === "string"
    ? localizePath(href, locale)
    : href.pathname ? { ...href, pathname: localizePath(href.pathname, locale) } : href;
  return <NextLink ref={ref} href={localized} {...props} />;
});
export default Link;
