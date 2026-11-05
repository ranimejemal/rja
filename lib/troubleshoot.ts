// Known setup problems of the agency's automations, in plain language, with the fix. Matched against what the
// customer types and the error n8n reports, so the most common problems are solved instantly, even without AI.
// Some come with a one-click fix the setup assistant can apply through the customer's n8n (see lib/n8n-api.ts).

export type FixKind =
  | "ai_settings" // write the address and model of the customer's chosen AI into the Settings box
  | "switch_gemini" // switch the Settings box to free Google Gemini
  | "retry"; // run the failed execution again

export type KnownProblem = { id: string; title: string; answer: string; fix?: FixKind; patterns: RegExp[] };

export const KNOWN_PROBLEMS: KnownProblem[] = [
  {
    id: "ai-overloaded", title: "The AI is busy right now", fix: "retry",
    patterns: [/\b503\b/, /service unavailable/i, /overloaded/i, /high demand/i, /UNAVAILABLE/],
    answer: `This is not a mistake in your setup: the AI service is overloaded for a moment (it happens on Google's free plan at busy hours).
1. Wait 1 to 2 minutes.
2. In n8n, open **Executions**, click the failed run and click **Retry** (or send your test again).
- The automation already tries 5 times by itself when it runs on its own. If it happens often, choose **OpenAI** in your details: it is paid but steadier.`,
  },
  {
    id: "ai-rate-limit", title: "Too many AI requests at once",
    patterns: [/\b429\b/, /rate limit/i, /too many requests/i, /RESOURCE_EXHAUSTED/],
    answer: `The AI received too many requests in a short time (the free Gemini plan allows a limited number per minute and per day).
1. Wait a minute, then try again.
2. If it says the **daily** limit is reached, it works again tomorrow; for more volume choose **OpenAI** in your details.`,
  },
  {
    id: "openai-no-credit", title: "Your OpenAI account has no credit", fix: "switch_gemini",
    patterns: [/insufficient_quota/i, /exceeded your current quota/i, /billing/i, /no credits?/i],
    answer: `OpenAI only works with a prepaid credit. Two choices:
1. Add 5 to 10 dollars at **platform.openai.com → Settings → Billing**, then try again; **or**
2. Use **Google Gemini for free**: choose "Google Gemini: free" in your details, save, and follow the Gemini step of the guide (I can also switch your n8n to Gemini for you with one click).`,
  },
  {
    id: "wrong-credential-type", title: "Gemini key in the wrong kind of credential", fix: "ai_settings",
    patterns: [/missing or invalid authorization header/i, /PaLM/i, /googlePalmApi/i],
    answer: `Your Gemini key is saved in a "Google Gemini (PaLM)" credential, which these boxes cannot use.
1. In n8n, open the AI box, next to **Credential** choose **Create new credential** of type **OpenAI**.
2. **API Key:** your Gemini key (starts with \`AIza\` or \`AQ.\`). **Base URL:** \`https://generativelanguage.googleapis.com/v1beta/openai\`. **Allowed HTTP Request Domains:** **All**.
3. Save, and choose this credential in every AI box.`,
  },
  {
    id: "ai-auth", title: "The AI refused the key", fix: "ai_settings",
    patterns: [/authorization failed/i, /\b401\b/, /incorrect api key/i, /invalid api key/i, /API key not valid/i, /unauthorized/i, /PERMISSION_DENIED/],
    answer: `The AI did not accept the key. Usually the key and the address do not match (a Gemini key sent to OpenAI, or the reverse).
1. In n8n open **Credentials**, open your AI credential and check: an OpenAI key starts with \`sk-\` and keeps Base URL \`https://api.openai.com/v1\`; a Gemini key starts with \`AIza\` or \`AQ.\` and needs Base URL \`https://generativelanguage.googleapis.com/v1beta/openai\`.
2. The **Settings** box of the automation must point to the same AI: I can correct it for you with one click.
3. If the key was deleted or copied badly, create a new one and paste it again.`,
  },
  {
    id: "ai-model", title: "The AI model name is out of date", fix: "ai_settings",
    patterns: [/model .*(not found|no longer available|does not exist|is not supported)/i, /no longer available to new users/i, /model_not_found/i, /\b404\b.*model/i],
    answer: `The AI provider retired the model named in your **Settings** box. Your new download already uses a name that always follows the newest model. To fix the one in n8n:
1. Click the one-click fix below, **or**
2. Open the **Settings** box and set **openAiModel** to \`gemini-flash-latest\` (Gemini) or \`gpt-4.1-mini\` (OpenAI).`,
  },
  {
    id: "no-credential", title: "A box has no account connected",
    patterns: [/does not have any credentials set/i, /credentials? (are|is) not set/i, /no credentials/i, /red warning/i, /credential.*(missing|not found)/i],
    answer: `One box has no account connected yet (it shows a red warning triangle).
1. Open that box, next to **Credential** choose your account, or **Create new credential**.
2. The "Connect your accounts" step of this page explains each account.`,
  },
  {
    id: "sheet-not-found", title: "The Google Sheet or tab was not found",
    patterns: [/sheet with (the )?name .* not found/i, /unable to parse range/i, /requested entity was not found/i, /sheet.*not found/i, /could not find sheet/i],
    answer: `The automation looks for a tab with an exact name in your Google Sheet.
1. Check the tab names at the bottom of your sheet: they must be exactly the ones in the "Make your Google Sheet" step (same capitals, no extra space).
2. In each Google Sheets box, choose your sheet under **Document** (pick it from the list).`,
  },
  {
    id: "google-auth", title: "Google needs you to sign in again",
    patterns: [/invalid_grant/i, /token has been expired or revoked/i, /insufficient authentication scopes/i, /access_denied/i, /\b403\b.*google/i],
    answer: `Google's permission expired or is missing.
1. In n8n open **Credentials**, open the Google credential and click **Sign in with Google** again, then **Allow** every box Google shows.
2. If you use a Google Workspace (company) account, your administrator may have to allow n8n.`,
  },
  {
    id: "form-test", title: "The test form did not reach the automation",
    patterns: [/problem submitting/i, /form.*(not|isn't) (registered|listening|active)/i, /webhook .* is not registered/i, /test url/i],
    answer: `The test form only works while n8n is listening, and for one submission.
1. In n8n click **Execute workflow** (bottom of the canvas) first.
2. Then open the test form and send it **once**. To test again, click **Execute workflow** again.
- When everything works, switch the automation **Active** (top right) and use the **Production URL** instead.`,
  },
  {
    id: "meta-token", title: "Facebook or Instagram refused the token",
    patterns: [/error validating access token/i, /session has expired/i, /OAuthException/i, /\(#200\)/, /\(#10\)/],
    answer: `The Facebook token expired or misses a permission.
1. Create a new Page token in **Graph API Explorer** with all the permissions listed in the Facebook step.
2. Extend it in the **Access Token Debugger** (otherwise it expires after one hour) and paste it in the Facebook credential.`,
  },
  {
    id: "shopify-auth", title: "Shopify refused the connection",
    patterns: [/shopify.*(401|403|unauthorized)/i, /invalid api key or access token/i],
    answer: `Check the Shopify credential: the shop name is only the part before \`.myshopify.com\`, and the app must have the \`read_orders\` permission and be **installed**.`,
  },
  {
    id: "settings-old-data", title: "n8n used your old details",
    patterns: [/old (data|settings|values)/i, /execute step/i, /still (uses|shows) (the )?old/i],
    answer: `"Execute step" on one box reuses the data of the last run. Click **Execute workflow** to run everything from the start with your new details.`,
  },
  {
    id: "timeout", title: "A step took too long",
    patterns: [/timed? ?out/i, /ETIMEDOUT/, /ECONNRESET/, /socket hang up/i],
    answer: `A service answered too slowly. Try again in a few minutes; if it keeps happening on the same box, send this conversation to us.`,
  },
];

const MAX_MATCHES = 2;

/** The known problems that match the text, best first (most matching patterns). */
export function matchProblems(text: string): KnownProblem[] {
  if (!text.trim()) return [];
  return KNOWN_PROBLEMS
    .map((p) => ({ p, score: p.patterns.filter((r) => r.test(text)).length }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES)
    .map((m) => m.p);
}

/** The knowledge base as text, for the AI assistant's instructions. */
export function knowledgeBase() {
  return KNOWN_PROBLEMS.map((p) => `### ${p.title}\n${p.answer}`).join("\n\n");
}
