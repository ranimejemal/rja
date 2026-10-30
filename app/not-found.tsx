import type { Metadata } from "next";
import { PowerScene } from "@/components/PowerScene";
import { agencyColumn, contactColumn, marketplaceColumn } from "@/components/SceneLinks";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <PowerScene
      before="4" after="4" label="Page not found"
      tagline="This page has logged off, or you don’t have access to it. Everything else at Ranime Jemal Agency is still online."
      columns={[marketplaceColumn, agencyColumn, contactColumn]}
    />
  );
}
