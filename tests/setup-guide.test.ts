import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Markdown } from "@/lib/markdown";
import { readmeSections } from "@/lib/setup-guide";
import { loadSetupForm } from "@/lib/automations";

describe("setup guide notes", () => {
  it("keeps numbered steps in order with their sub-points", () => {
    const html = renderToStaticMarkup(createElement(Markdown, { source: "1. First\n2. Sources:\n   - Form: share it\n   - Webhook: send JSON\n     Field names are recognized.\n3. Activate." }));
    expect(html).toBe("<div class=\"prose\"><ol><li>First</li><li>Sources:<ul><li>Form: share it</li><li>Webhook: send JSON Field names are recognized.</li></ul></li><li>Activate.</li></ol></div>");
  });

  it("shows the form's field names instead of technical setting names", async () => {
    const form = (await loadSetupForm("ai-lead-generation-follow-up"))!;
    const readme = readFileSync("automations/01-ai-lead-generation-follow-up/README.md", "utf8");
    const { whatItDoes, setup } = readmeSections(readme, form);
    expect(whatItDoes + setup).not.toMatch(/`(autoSendReplies|followUpDays|maxFollowUps|workflow\.json)`/);
    expect(whatItDoes).toContain("**Send the first reply automatically**");
    expect(setup).toContain("the file you downloaded");
    expect(setup).toContain("the leads sheet template");
  });
});
