import "server-only";
import { createHash } from "node:crypto";
import type { AiProvider } from "@/lib/ai-providers";

// Plain-language instructions for connecting each account an automation uses, written for people who are not
// technical. Steps are Markdown (lists, **bold**, `code`). Shown on the buyer's setup page, one card per account.

export type AccountGuide = { key: string; title: string; why: string; time: string; steps: string; hard?: boolean };

const GOOGLE_TYPES = ["gmailOAuth2", "googleSheetsOAuth2Api", "googleCalendarOAuth2Api", "googleDriveOAuth2Api"];
const GOOGLE_NAMES: Record<string, string> = {
  gmailOAuth2: "Gmail", googleSheetsOAuth2Api: "Google Sheets", googleCalendarOAuth2Api: "Google Calendar", googleDriveOAuth2Api: "Google Drive",
};

/** Header names for the "API key in a header" and "webhook password" credentials, per automation. */
const HEADER_KEYS: Record<string, { name: string; what: string; where: string; node: string }> = {
  "review-reputation-monitor": {
    name: "X-Goog-Api-Key", what: "a Google Cloud API key", node: "Get Google reviews",
    where: "Go to **console.cloud.google.com**, create a project, open **APIs & Services → Library**, enable **Places API (New)**, then **Credentials → Create credentials → API key**. Copy the key.",
  },
  "data-breach-monitor": {
    name: "hibp-api-key", what: "a Have I Been Pwned API key", node: "Have I Been Pwned",
    where: "Go to **haveibeenpwned.com/API/Key**, choose the smallest plan (a few dollars a month) and copy the key you receive by email.",
  },
};
const WEBHOOK_KEYS: Record<string, { name: string; who: string }> = {
  "ai-voice-receptionist": { name: "x-vapi-secret", who: "Vapi (paste it as the server secret of your assistant)" },
  "ai-security-monitoring-workflows": { name: "X-Alert-Token", who: "each tool that sends alerts (Wazuh, Grafana, AWS…)" },
};

/** A long random-looking secret, stable for one buyer and product, suggested for webhook passwords. */
export function suggestedSecret(seed: string) {
  return createHash("sha256").update(`webhook-secret:${seed}`).digest("base64url").slice(0, 40);
}

export function accountGuides(slug: string, credentialTypes: string[], seed: string, ai: AiProvider = "gemini"): AccountGuide[] {
  const out: AccountGuide[] = [];
  const google = credentialTypes.filter((t) => GOOGLE_TYPES.includes(t));
  if (google.length) {
    const names = google.map((t) => GOOGLE_NAMES[t]).join(", ");
    out.push({
      key: "google", title: `Google (${names})`, time: "2 minutes",
      why: "So the automation can read and write in your Google account. Nobody else gets access.",
      steps: `1. In n8n, open a box (node) that shows a **red warning triangle**, for example a ${GOOGLE_NAMES[google[0]]} box.
2. Next to **Credential**, choose **Create new credential**.
3. Click **Sign in with Google**, pick your account and click **Allow**.
4. Do the same once for each Google service: ${names}. After that, every box of the same service uses it automatically.
- On a self-hosted n8n (not n8n Cloud) Google sign-in needs extra setup in Google Cloud. If you see a "Client ID" field, use n8n Cloud or ask us.`,
    });
  }
  for (const t of credentialTypes) {
    if (GOOGLE_TYPES.includes(t)) continue;
    const g = t === "openAiApi" && ai === "gemini" ? GEMINI_GUIDE : guideFor(slug, t, seed);
    if (g) out.push(g);
  }
  return out;
}

// Gemini through its OpenAI-compatible address: n8n's "OpenAI" credential with a Gemini key and Google's address.
const GEMINI_GUIDE: AccountGuide = {
  key: "openAiApi", title: "Google Gemini (the AI, free)", time: "3 minutes",
  why: "The AI that reads, sorts and writes. Google's free plan needs no card. At very busy hours Google can be slow: the automation then waits and tries again by itself (up to 5 times).",
  steps: `1. Go to **aistudio.google.com/apikey** and sign in with your Google account.
2. Click **Create API key** (accept the terms if asked) and **copy the key**. It starts with \`AIza\` or \`AQ.\`.
3. In n8n, open a box with a red warning that says OpenAI (or "AI"), choose **Create new credential**. Yes, choose the **OpenAI** type: Gemini understands the same language.
4. Fill in:
   - **API Key:** your Gemini key.
   - **Base URL:** \`https://generativelanguage.googleapis.com/v1beta/openai\`
   - **Allowed HTTP Request Domains:** **All**.
5. Click **Save**. Every AI box of the automation uses it automatically.
- Do not choose the "Google Gemini (PaLM)" credential type: it does not work with these boxes.
- On the free plan Google may use what you send to improve its products. For private customer data, choose OpenAI in your details instead.`,
};

function guideFor(slug: string, type: string, seed: string): AccountGuide | null {
  switch (type) {
    case "openAiApi":
      return {
        key: type, title: "OpenAI (the AI)", time: "5 minutes",
        why: "The AI that reads, sorts and writes. You pay OpenAI directly for what you use: for a small business usually a few dollars a month.",
        steps: `1. Go to **platform.openai.com** and create an account.
2. Open **Settings → Billing** and add a payment method with a small credit (5 to 10 dollars is enough to start).
3. Open **API keys → Create new secret key**, give it a name (e.g. "n8n") and **copy the key**. It is shown only once.
4. In n8n, open a box with a red warning that says OpenAI (or "AI"), choose **Create new credential**, paste the key and click **Save**.
- Leave **Base URL** as it is (\`https://api.openai.com/v1\`).`,
      };
    case "virusTotalApi":
      return {
        key: type, title: "VirusTotal (link and IP checks)", time: "3 minutes",
        why: "Checks links and IP addresses against 70+ security engines. The free plan is enough for most companies.",
        steps: `1. Create a free account on **virustotal.com** and confirm your email.
2. Click your profile picture → **API key**, and copy it.
3. In n8n, open the box with a red warning that mentions VirusTotal, choose **Create new credential**, paste the key and save.`,
      };
    case "shopifyAccessTokenApi":
      return {
        key: type, title: "Shopify", time: "5 minutes",
        why: "So the automation is told about new orders and checkouts in your shop.",
        steps: `1. In your Shopify admin, open **Settings → Apps and sales channels → Develop apps** (allow custom app development if asked).
2. Click **Create an app**, name it "n8n", then **Configure Admin API scopes** and tick \`read_orders\`${slug === "abandoned-cart-recovery" ? " and `read_checkouts`" : ""}. Save.
3. Click **Install app**, then **reveal the Admin API access token** and copy it. Also copy the **API secret key**.
4. In n8n, open the Shopify box, choose **Create new credential**, and fill in your shop name (the part before .myshopify.com), the access token and the secret key.`,
      };
    case "wooCommerceApi":
      return {
        key: type, title: "WooCommerce", time: "3 minutes",
        why: "So the automation is told about new orders in your WordPress shop.",
        steps: `1. In WordPress, open **WooCommerce → Settings → Advanced → REST API → Add key**.
2. Give it a name ("n8n"), choose **Read/Write** and click **Generate API key**. Copy the consumer key and secret.
3. In n8n, open the WooCommerce box, choose **Create new credential**, paste both keys and your shop's address (https://…).
- If you only use Shopify, right-click the WooCommerce box and choose **Deactivate** instead.`,
      };
    case "facebookGraphApi":
      return {
        key: type, title: "Facebook and Instagram", time: "15 to 20 minutes", hard: true,
        why: "To publish on your Page and Instagram account, and to answer comments and messages.",
        steps: `1. Your Instagram account must be a **Business** account linked to your Facebook Page (Instagram app → Settings → Account type).
2. Go to **developers.facebook.com → My Apps → Create app**, choose **Business**, and give it a name.
3. Open **Tools → Graph API Explorer**, select your app, then **Get Token → Get Page Access Token** and select your Page.
4. Add these permissions and click **Generate Access Token**: \`pages_manage_posts\`, \`pages_read_engagement\`, \`pages_manage_engagement\`, \`pages_messaging\`, \`instagram_basic\`, \`instagram_content_publish\`, \`instagram_manage_comments\`, \`instagram_manage_messages\`.
5. Open **Tools → Access Token Debugger**, paste the token and click **Extend Access Token**, so it does not expire after an hour. Copy the long token.
6. In n8n, open a Facebook box, choose **Create new credential** and paste the token.
- This is the most technical step. If you get stuck, ask us: we can connect it with you on a short call.`,
      };
    case "facebookLeadAdsOAuth2Api":
      return {
        key: type, title: "Facebook Lead Ads (optional)", time: "3 minutes",
        why: "Only if you run Facebook lead ads and want those leads handled too.",
        steps: `1. The **Facebook Lead Ads** box is switched off. To use it, right-click it and choose **Activate**.
2. Open it, choose **Create new credential** and click **Connect my account**, then pick your Page and lead form.`,
      };
    case "linkedInOAuth2Api":
      return {
        key: type, title: "LinkedIn", time: "5 minutes (plus LinkedIn's approval)", hard: true,
        why: "To publish on your LinkedIn company page.",
        steps: `1. You must be an **admin** of the company page.
2. In n8n, open the LinkedIn box, choose **Create new credential** and click **Connect my account**.
3. Posting as a company needs LinkedIn's **Community Management API**, which LinkedIn approves for your app (it can take a few days). Until then you can switch the LinkedIn box off (right-click → **Deactivate**).`,
      };
    case "httpHeaderAuth": {
      const h = HEADER_KEYS[slug];
      if (!h) return null;
      return {
        key: type, title: h.what.replace(/^a /, "").replace(/^./, (c) => c.toUpperCase()), time: "5 minutes",
        why: `The automation needs ${h.what} to fetch its data.`,
        steps: `1. ${h.where}
2. In n8n, open the **${h.node}** box, choose **Create new credential** of type **Header Auth**.
3. In **Name** type exactly \`${h.name}\`, and in **Value** paste your key. Save.`,
      };
    }
    case "webhookHeaderAuth": {
      const w = WEBHOOK_KEYS[slug];
      if (!w) return null;
      return {
        key: type, title: "Webhook password", time: "2 minutes",
        why: "So that only your own tools can send data to this automation.",
        steps: `1. In n8n, open the box that receives the data (it has a red warning), choose **Create new credential** of type **Header Auth**.
2. **Name:** \`${w.name}\`. **Value:** a long password. You can use this one, made just for you: \`${suggestedSecret(`${slug}:${seed}`)}\`
3. Give the same name and value to ${w.who}.`,
      };
    }
    default:
      return null;
  }
}

/**
 * The automation-specific part of the README: what it does and the setup notes, without the sales line. With the
 * setup form, technical names are replaced by what the customer sees: `autoSendReplies` becomes the field's label,
 * `workflow.json` the file they downloaded.
 */
export function readmeSections(readme: string, form?: { settings: { key: string; label: string }[] }) {
  const labels = new Map(form?.settings.map((s) => [s.key, s.label]));
  readme = readme.replace(/`([a-zA-Z][\w.-]*)`/g, (whole, name: string) => {
    const label = labels.get(name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`));
    if (label) return `**${label}**`;
    if (name === "workflow.json") return "the file you downloaded";
    if (/^[\w-]+\.csv$/.test(name)) return `the ${name.replace(/-sheet\.csv$|\.csv$/, "").replace(/-/g, " ")} sheet template`;
    return whole;
  });
  const lines = readme.split("\n");
  const pick = (heading: string) => {
    const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`);
    if (start < 0) return "";
    const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
    return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
  };
  return { whatItDoes: pick("what it does") || pick("how it fits together"), setup: pick("setup") };
}
