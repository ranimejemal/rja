// Checks on what the AI Business Architect writes: no promised results, no money or percentage figures,
// no technical jargon, no links or markup. Pure, so it is unit-tested.

const FORBIDDEN = [
  /\d+\s?%/, /\bpercent\b/i, /[$€£]\s?\d/, /\d\s?(?:usd|eur|tnd|dt|dinars?|dollars?|euros?)\b/i,
  /\bguarantee/i, /\b(?:save|saves|saving|saved)\s+(?:you\s+)?(?:\d|up to|over|more than|hours|money|time worth)/i,
  /\b(?:increase|boost|double|triple)\w*\s+(?:your\s+)?(?:revenue|sales|profit)/i,
  /\b(?:api|webhook|workflow|n8n|json|oauth|endpoint)\b/i,
  /https?:\/\/|<[a-z/][^>]*>|\]\(/i,
];

export function checkArchitectText(text: string) {
  return !FORBIDDEN.some((r) => r.test(text));
}
