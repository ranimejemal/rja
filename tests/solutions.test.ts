import { describe, expect, it } from "vitest";
import { buildProfile } from "@/lib/discovery";
import { candidatesFor, ruleOverview, SOLUTIONS } from "@/lib/solutions";
import { checkArchitectText } from "@/lib/architect-rules";

const lina = buildProfile({
  business_name: "Maison Lina", industry: "ecommerce", shop_platform: "shopify", channels: ["whatsapp"],
  time_sinks: ["orders_stock", "answer_messages", "abandoned_carts"], problem: "I want to know when a bag is almost out of stock.",
  goal: "more_customers",
});

describe("solution matching", () => {
  it("recommends Lina's three solutions, stock first, with her own words as evidence", () => {
    const c = candidatesFor(lina);
    // Ranked in the order she listed her tasks; stock first because it is also what she wants fixed first.
    expect(c.map((x) => x.id)).toEqual(["inventory_manager", "customer_assistant", "cart_recovery"]);
    expect(c[0].reasons.join(" ")).toMatch(/stock/);
    expect(c.every((x) => x.blockers.length === 0)).toBe(true);
  });

  it("says what is missing instead of hiding it", () => {
    const woo = candidatesFor({ ...lina, shopPlatform: "woocommerce" });
    expect(woo[0].blockers[0]).toMatch(/WooCommerce comes later/);
  });

  it("recommends nothing when nothing matches, and says so", () => {
    const salon = buildProfile({ business_name: "Salon Rose", industry: "health_beauty", time_sinks: ["bookings"], problem: "Clients call to book." });
    expect(candidatesFor(salon)).toEqual([]);
    expect(ruleOverview(salon, [])).toMatch(/none of our solutions/);
  });

  it("describes every solution completely for the customer", () => {
    for (const s of SOLUTIONS) {
      for (const k of ["does", "reads", "permissions", "needsApproval", "limits"] as const) expect(s[k].length, `${s.id}.${k}`).toBeGreaterThan(0);
      expect(s.externalCosts).not.toBe("");
    }
  });
});

describe("AI explanation checks", () => {
  it("accept plain explanations", () => {
    expect(checkArchitectText("You told us stock runs out before you notice. This alerts you as soon as a bag is low.")).toBe(true);
  });
  it("refuse promised results, figures, jargon and links", () => {
    for (const bad of ["This will save you 10 hours a week.", "Recover 15% of carts.", "Increase your revenue fast.",
      "We guarantee more sales.", "It costs $20.", "A webhook from Shopify triggers the workflow.", "See https://evil.example",
      "Click [here](x)"]) expect(checkArchitectText(bad), bad).toBe(false);
  });
});
