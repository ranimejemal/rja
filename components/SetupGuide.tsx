import Link from "next/link";
import { ConfigForm } from "@/components/ConfigForm";
import { Notice } from "@/components/ui";
import { Markdown } from "@/lib/markdown";
import type { ConfigValues, Manifest } from "@/lib/manifest";
import type { AccountGuide } from "@/lib/setup-guide";

// The buyer's step-by-step setup for one of the agency's automations, written for people who are not technical:
// n8n account, Google Sheet, their details (the setup form), their personal workflow file, import, accounts, test.

type Props = {
  product: { id: string; slug: string; name: string };
  form: Manifest;
  latest: { id: string; revision: number; values: ConfigValues; created_at: string } | null;
  sheets: { file: string; tab: string }[];
  extras: string[];
  accounts: AccountGuide[];
  readme: { whatItDoes: string; setup: string };
  metaVerifyToken?: string;
};

function Step({ id, n, title, time, children, done }: { id: string; n: number; title: string; time?: string; children: React.ReactNode; done?: boolean }) {
  return (
    <section className="card stack setup-step" aria-labelledby={`${id}-h`} id={id}>
      <div className="row between" style={{ alignItems: "baseline" }}>
        <h2 id={`${id}-h`} className="h3"><span className="setup-num" aria-label={done ? `Step ${n}, done:` : `Step ${n}:`}>{done ? "✓" : n}</span> {title}</h2>
        {time && <span className="tag">{time}</span>}
      </div>
      {children}
    </section>
  );
}

export function SetupGuide({ product, form, latest, sheets, extras, accounts, readme, metaVerifyToken }: Props) {
  // Step numbers: the sheet and accounts steps only exist when the automation needs them.
  let k = 0;
  const num = { n8n: ++k, sheet: sheets.length ? ++k : 0, details: ++k, download: ++k, importing: ++k, accounts: accounts.length ? ++k : 0, live: ++k };
  return (
    <div className="stack" style={{ "--gap": "1.25rem" } as React.CSSProperties}>
      <div className="card stack setup-intro">
        <h2 className="h3">Set it up yourself in about 30 minutes</h2>
        <p className="small">
          Follow the steps in order. You do not need to write any code: you fill in a form, download your file and
          click a few buttons. If you get stuck at any step, <Link className="link" href="#support">send us a message</Link> or{" "}
          <Link className="link" href={`/quote?product=${product.slug}`}>let us set it up for you</Link>.
        </p>
        <ol className="setup-toc small">
          <li><a href="#n8n">Create your n8n account</a></li>
          {sheets.length > 0 && <li><a href="#sheet">Make your Google Sheet</a></li>}
          <li><a href="#details">Fill in your details</a></li>
          <li><a href="#download">Download your automation</a></li>
          <li><a href="#import">Import it into n8n</a></li>
          {accounts.length > 0 && <li><a href="#accounts">Connect your accounts</a></li>}
          <li><a href="#go-live">Test and switch it on</a></li>
        </ol>
      </div>

      <Step id="n8n" n={num.n8n} title="Create your n8n account" time="5 minutes">
        <p className="small">
          <strong>n8n</strong> is the service that runs your automation 24/7, a bit like an app store for automations. You
          need your own account so that your data stays yours.
        </p>
        <ol className="small">
          <li>Go to <a className="link" href="https://n8n.io/pricing" target="_blank" rel="noopener">n8n.io</a> and start the free trial of <strong>n8n Cloud</strong> (the Starter plan is enough).</li>
          <li>Choose a name for your workspace and confirm your email.</li>
          <li>You arrive on your n8n home page. Keep this tab open: you will come back to it.</li>
        </ol>
        <p className="tiny muted">Already have n8n (Cloud or your own server, version 1.123 or newer)? Skip this step.</p>
      </Step>

      {sheets.length > 0 && (
        <Step id="sheet" n={num.sheet} title="Make your Google Sheet" time="5 minutes">
          <p className="small">Your automation keeps its list ({sheets.map((s) => s.tab).join(", ")}) in a Google Sheet that you own, so you can see everything it does.</p>
          <ol className="small">
            <li>Go to <a className="link" href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> to create an empty sheet, and give it a name (e.g. “{product.name}”).</li>
            {sheets.map((s, i) => (
              <li key={s.file}>
                Download <a className="link" href={`/api/automations/${product.slug}/sheets/${s.file}`}>{s.file}</a>, then in your sheet
                click <strong>File → Import → Upload</strong>, choose the file, select <strong>{i === 0 ? "Replace current sheet" : "Insert new sheet(s)"}</strong> and
                click <strong>Import data</strong>. Rename the tab to exactly <strong>{s.tab}</strong> (double-click the tab name at the bottom).
              </li>
            ))}
            <li>Copy the link of your sheet from the address bar. You will paste it in the next step.</li>
          </ol>
        </Step>
      )}

      <Step id="details" n={num.details} title="Fill in your details" time="5 minutes" done={Boolean(latest)}>
        <p className="small">
          These are the only things the automation needs to know about you. Each field explains what to write, with an
          example. You can change your answers later and download a new file.
        </p>
        <ConfigForm productId={product.id} manifest={form} initial={latest?.values} workflowDownload />
      </Step>

      <Step id="download" n={num.download} title="Download your automation">
        {latest ? (
          <>
            <p className="small">Your personal file is ready, with your details already filled in.</p>
            <div className="row">
              <a className="btn accent" href={`/api/configurations/${latest.id}/workflow`}>Download my automation</a>
              <span className="tiny muted">Saved {new Date(latest.created_at).toLocaleString("en-GB")}</span>
            </div>
            {extras.length > 0 && (
              <p className="small">Also included: {extras.map((f, i) => (
                <span key={f}>{i > 0 && ", "}<a className="link" href={`/api/automations/${product.slug}/sheets/${f}`}>{f}</a></span>
              ))} (see the extra notes at the bottom of this page).</p>
            )}
          </>
        ) : (
          <Notice>Fill in and save your details above first. Your personal file appears here right after.</Notice>
        )}
      </Step>

      <Step id="import" n={num.importing} title="Import it into n8n" time="2 minutes">
        <ol className="small">
          <li>In n8n, click <strong>Create workflow</strong> (or the <strong>+</strong> button, then <strong>Workflow</strong>).</li>
          <li>Click the <strong>three dots (…)</strong> at the top right, then <strong>Import from file…</strong>, and choose the file you just downloaded.</li>
          <li>The automation appears as boxes joined by lines. Click <strong>Save</strong>. Your details are in the yellow <strong>Settings</strong> box: there is nothing else to type there.</li>
        </ol>
      </Step>

      {accounts.length > 0 && (
        <Step id="accounts" n={num.accounts} title="Connect your accounts" time="10 to 30 minutes">
          <p className="small">
            Boxes with a <strong>red warning triangle</strong> need one of your accounts. You connect each account once; your passwords
            stay in n8n and are never sent to us.
          </p>
          <div className="stack" style={{ "--gap": "0.75rem" } as React.CSSProperties}>
            {accounts.map((a) => (
              <details key={a.key} className="setup-account">
                <summary>
                  <strong>{a.title}</strong> <span className="tag">{a.time}</span>
                  {a.hard && <span className="badge">Most technical step</span>}
                </summary>
                <p className="small muted">{a.why}</p>
                <Markdown source={a.steps} />
              </details>
            ))}
          </div>
          {metaVerifyToken && (
            <p className="small">Your Meta webhook verify token (for replies to comments and messages): <code>{metaVerifyToken}</code></p>
          )}
        </Step>
      )}

      <Step id="go-live" n={num.live} title="Test and switch it on" time="5 minutes">
        <ol className="small">
          <li>Click <strong>Test workflow</strong> (or <strong>Execute workflow</strong>) at the bottom of the screen. Boxes turn green when they work.</li>
          <li>A box turns red? Click it to read the message. It is almost always an account that is not connected yet, or a sheet tab with a different name.</li>
          <li>When the test works, switch the <strong>Inactive</strong> toggle at the top to <strong>Active</strong>. Your automation now runs on its own, day and night.</li>
        </ol>
        <Notice>Try it with test data first (your own email, a test lead) before telling customers about it.</Notice>
      </Step>

      {(readme.whatItDoes || readme.setup) && (
        <details className="card setup-more">
          <summary><strong>How this automation works, in detail</strong></summary>
          {readme.whatItDoes && <Markdown source={readme.whatItDoes} />}
          {readme.setup && (<><h3 className="h3" style={{ marginTop: "1rem" }}>Extra notes for this automation</h3><Markdown source={readme.setup} /></>)}
        </details>
      )}
    </div>
  );
}
