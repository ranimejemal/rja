import { describe, expect, it } from "vitest";
import { formatMoney, parsePriceToMinor, splitPrice } from "@/lib/money";

describe("splitPrice", () => {
  it("takes 20% of a $100 sale", () => {
    expect(splitPrice(10000, 2000)).toEqual({ commissionMinor: 2000, sellerShareMinor: 8000 });
  });
  it("matches the database rounding (half up) and always adds up", () => {
    expect(splitPrice(4900, 2500)).toEqual({ commissionMinor: 1225, sellerShareMinor: 3675 });
    expect(splitPrice(1, 5000)).toEqual({ commissionMinor: 1, sellerShareMinor: 0 });
    for (const price of [0, 1, 99, 4999, 12345]) {
      for (const bps of [0, 1, 1999, 2000, 3333, 10000]) {
        const s = splitPrice(price, bps);
        expect(s.commissionMinor + s.sellerShareMinor).toBe(price);
        expect(s.commissionMinor).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("platform products use a 0% rate", () => {
    expect(splitPrice(2000, 0)).toEqual({ commissionMinor: 0, sellerShareMinor: 2000 });
  });
  it("rejects invalid input", () => {
    expect(() => splitPrice(-1, 2000)).toThrow();
    expect(() => splitPrice(10.5, 2000)).toThrow();
    expect(() => splitPrice(100, 10001)).toThrow();
  });
});

describe("money helpers", () => {
  it("parses prices into minor units", () => {
    expect(parsePriceToMinor("49")).toBe(4900);
    expect(parsePriceToMinor("49.9")).toBe(4990);
    expect(parsePriceToMinor("49,95")).toBe(4995);
    expect(parsePriceToMinor("-1")).toBeNull();
    expect(parsePriceToMinor("1.999")).toBeNull();
  });
  it("formats euros", () => {
    expect(formatMoney(14900)).toBe("€149");
    expect(formatMoney(14950)).toBe("€149.50");
  });
});
