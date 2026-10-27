// Money is always integer minor units (cents) with an explicit currency code.

export function formatMoney(minor: number, currency = "EUR", locale = "en-IE"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: minor % 100 === 0 ? 0 : 2 })
    .format(minor / 100);
}

/**
 * Display-side mirror of the database's split_price(): commission rounded half up, seller gets the remainder.
 * The authoritative split is computed and stored by the database at order time.
 */
export function splitPrice(priceMinor: number, commissionBps: number) {
  if (!Number.isInteger(priceMinor) || priceMinor < 0) throw new Error("price must be a non-negative integer");
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10000) throw new Error("invalid commission rate");
  const commissionMinor = Math.floor((priceMinor * commissionBps + 5000) / 10000);
  return { commissionMinor, sellerShareMinor: priceMinor - commissionMinor };
}

export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toLocaleString("en", { maximumFractionDigits: 2 })}%`;
}

/** Parses a user-entered price like "49" or "49.90" into minor units. */
export function parsePriceToMinor(input: string): number | null {
  const m = input.trim().replace(",", ".").match(/^(\d{1,6})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}
