"use client";

import { usePathname } from "next/navigation";
import ReferenceFooter from "./Footer";

export default function FooterSwitch({ enabled, children }: {
  enabled: boolean;
  children?: React.ReactNode;
}) {
  const path = usePathname();
  return enabled && (path === "/" || path === "/se-shpejti")
    ? <ReferenceFooter />
    : children;
}
