// Runs the generated workflows inside a real n8n (CLI execution) with:
//  - the chosen trigger replaced by a Code node of the same name that outputs sample data,
//  - Google/Gmail/Facebook/LinkedIn/X/VirusTotal/Respond nodes replaced by Code stubs of the same name that
//    evaluate the original node's parameters with $evaluateExpression and return a realistic response,
//  - the OpenAI HTTP nodes and chat model left real, pointed at a local mock OpenAI server.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const N8N_DIR = path.resolve(process.env.N8N_DIR || '.');
const HOME = path.join(N8N_DIR, 'test-home');
const N8N = path.join(N8N_DIR, 'node_modules', '.bin', 'n8n');
const ENV = { ...process.env, N8N_USER_FOLDER: HOME, N8N_ENCRYPTION_KEY: 'test-key-123456789', N8N_DIAGNOSTICS_ENABLED: 'false',
  N8N_RUNNERS_ENABLED: 'true', DB_SQLITE_POOL_SIZE: '0', N8N_BLOCK_ENV_ACCESS_IN_NODE: 'true',
  GENERIC_TIMEZONE: 'Europe/Paris', NO_COLOR: '1', N8N_SECURE_COOKIE: 'false' };
const OPENAI_CRED = { id: 'openaiTestCred01', name: 'OpenAI test' };

const STUB_TYPES = new Set(['n8n-nodes-base.googleSheets', 'n8n-nodes-base.gmail', 'n8n-nodes-base.googleCalendar', 'n8n-nodes-base.googleDrive',
  'n8n-nodes-base.facebookGraphApi', 'n8n-nodes-base.linkedIn', 'n8n-nodes-base.twitter', 'n8n-nodes-base.respondToWebhook']);

// Read stubs: Code nodes that return sample rows (one run per input item, or once with executeOnce, like n8n).
function readStubCode(node, rows) {
  return `const input = $input.all();
const runs = ${node.executeOnce ? 1 : 'input.length'};
const out = [];
for (let i = 0; i < runs; i++) for (const r of [].concat((${rows})(input[i], i))) out.push({ json: r, pairedItem: { item: i } });
return out;`;
}

// Action stubs: Set nodes, so n8n evaluates every original parameter natively. Output = input json
// plus __p__<path> = evaluated parameter, plus any response fields the scenario adds.
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? prefix + '__' + k : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
function actionStub(node, response = {}) {
  const assignments = Object.entries(flatten(node.parameters)).map(([k, v], i) => ({ id: 'p' + i, name: '__p__' + k, value: typeof v === 'string' ? v : JSON.stringify(v), type: 'string' }));
  Object.entries(response).forEach(([k, v], i) => {
    const [value, type] = Array.isArray(v) ? v : [v, 'string'];
    assignments.push({ id: 'r' + i, name: k, value, type });
  });
  return { mode: 'manual', assignments: { assignments }, includeOtherFields: true, options: { dotNotation: false } };
}

const READ_STUB = (n) => (n.type === 'n8n-nodes-base.googleSheets' && !n.parameters.operation) || (n.type === 'n8n-nodes-base.googleCalendar' && n.parameters.operation === 'getAll');

function build(wfPath, scenario) {
  const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
  wf.id = scenario.id;
  wf.name = 'TEST ' + scenario.id;
  const nodes = [];
  const probes = [];
  for (const node of wf.nodes) {
    if (node.name === scenario.trigger) {
      nodes.push({ ...node, type: 'n8n-nodes-base.code', typeVersion: 2, disabled: false, webhookId: undefined,
        parameters: { jsCode: scenario.triggerCode } });
      continue;
    }
    if (node.name === 'Settings') {
      for (const a of node.parameters.assignments.assignments) {
        if (a.name === 'openAiBaseUrl') a.value = 'http://127.0.0.1:5999/v1';
        if (scenario.settings && a.name in scenario.settings) a.value = scenario.settings[a.name];
      }
    }
    const isVt = node.parameters && node.parameters.nodeCredentialType === 'virusTotalApi';
    if (scenario.code && scenario.code[node.name]) {
      nodes.push({ id: node.id, name: node.name, type: 'n8n-nodes-base.code', typeVersion: 2, position: node.position, onError: node.onError,
        disabled: node.disabled, parameters: { jsCode: scenario.code[node.name] } });
      continue;
    }
    if (STUB_TYPES.has(node.type) || isVt) {
      const base = { id: node.id, name: node.name, position: node.position, onError: node.onError, alwaysOutputData: node.alwaysOutputData, executeOnce: node.executeOnce, disabled: node.disabled };
      if (READ_STUB(node)) {
        const rows = (scenario.reads && scenario.reads[node.name]) || '() => []';
        nodes.push({ ...base, type: 'n8n-nodes-base.code', typeVersion: 2, parameters: { jsCode: readStubCode(node, rows) } });
        // Probe: a Set node fed the same input, so the read node's parameters are evaluated natively.
        nodes.push({ id: node.id + '-probe', name: '__probe ' + node.name, type: 'n8n-nodes-base.set', typeVersion: 3.4, position: node.position,
          parameters: actionStub(node), executeOnce: node.executeOnce });
        probes.push(node.name);
      } else {
        nodes.push({ ...base, type: 'n8n-nodes-base.set', typeVersion: 3.4, parameters: actionStub(node, scenario.stubs && scenario.stubs[node.name]) });
      }
      continue;
    }
    if (node.parameters && node.parameters.nodeCredentialType === 'openAiApi') node.credentials = { openAiApi: OPENAI_CRED };
    if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') node.credentials = { openAiApi: OPENAI_CRED };
    if (/Trigger$|\.webhook$|\.formTrigger$|\.chatTrigger$/.test(node.type)) node.disabled = true;
    nodes.push(node);
  }
  nodes.push({ id: 'test-start', name: 'Test start', type: 'n8n-nodes-base.executeWorkflowTrigger', typeVersion: 1, position: [-900, 0], parameters: {} });
  wf.nodes = nodes;
  for (const outs of Object.values(wf.connections)) for (const list of Object.values(outs)) for (const branch of list) {
    for (const c of [...(branch || [])]) if (probes.includes(c.node)) branch.push({ node: '__probe ' + c.node, type: 'main', index: 0 });
  }
  wf.connections['Test start'] = { main: [[{ node: scenario.trigger, type: 'main', index: 0 }]] };
  wf.active = false;
  return wf;
}

function run(wfPath, scenario) {
  const wf = build(wfPath, scenario);
  const file = path.join(HOME, 'tmp-' + scenario.id + '.json');
  fs.writeFileSync(file, JSON.stringify(wf));
  execFileSync(N8N, ['import:workflow', '--input=' + file], { env: ENV, stdio: 'pipe' });
  let out;
  try {
    out = execFileSync(N8N, ['execute', '--id=' + scenario.id, '--rawOutput'], { env: ENV, stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 }).toString();
  } catch (e) {
    const text = (e.stdout || '').toString() + (e.stderr || '').toString();
    return { ok: false, error: text.slice(-4000) };
  }
  const start = out.indexOf('{');
  const data = JSON.parse(out.slice(start));
  const runData = data.data.resultData.runData;
  const outputOf = (name, output = 0, run = 0) => {
    const r = runData[name];
    if (!r || !r[run] || !r[run].data) return undefined;
    return (r[run].data.main[output] || []).map((i) => {
      const json = { ...i.json };
      const params = {};
      for (const k of Object.keys(json)) {
        if (!k.startsWith('__p__')) continue;
        const parts = k.slice(5).split('__');
        let o = params;
        parts.slice(0, -1).forEach((part) => { o = o[part] = o[part] || {}; });
        o[parts[parts.length - 1]] = json[k];
        delete json[k];
      }
      if (Object.keys(params).length) json.__params = params;
      return json;
    });
  };
  return { ok: !data.data.resultData.error, error: data.data.resultData.error, ran: Object.keys(runData), outputOf, runData };
}

// Imports the OpenAI test credential (pointing at the mock server) once.
function setup() {
  fs.mkdirSync(HOME, { recursive: true });
  const file = path.join(HOME, 'creds.json');
  fs.writeFileSync(file, JSON.stringify([{ ...OPENAI_CRED, type: 'openAiApi', data: { apiKey: 'test-key', url: 'http://127.0.0.1:5999/v1' } }]));
  execFileSync(N8N, ['import:credentials', '--input=' + file], { env: ENV, stdio: 'pipe' });
}

module.exports = { run, setup, HOME, ENV, N8N, OPENAI_CRED };
