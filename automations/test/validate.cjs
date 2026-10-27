// Validates n8n workflow files against the installed node definitions:
// node type + typeVersion exist, every parameter name is known, required parameters are set
// (n8n's own issue check, the same one the editor uses for red warnings), and connections are consistent.
const fs = require('fs');
const { description, base } = require('./nodes.cjs');
const { NodeHelpers } = require(require.resolve('n8n-workflow', { paths: [base + '/n8n'] }));

function toolProps(d) {
  const props = [...d.properties];
  if (!props.some((p) => p.name === 'toolDescription')) {
    const hasRO = props.some((p) => p.name === 'resource' || p.name === 'operation');
    props.unshift({ displayName: 'Description', name: 'toolDescription', type: 'string', default: '', required: true,
      ...(hasRO ? { displayOptions: { show: { descriptionType: ['manual'] } } } : {}) });
    if (hasRO) props.unshift({ displayName: 'Tool Description', name: 'descriptionType', type: 'options', options: [{ name: 'a', value: 'auto' }, { name: 'm', value: 'manual' }], default: 'auto' });
  }
  return { ...d, properties: props };
}

let failures = 0;
for (const file of process.argv.slice(2)) {
  const wf = JSON.parse(fs.readFileSync(file, 'utf8'));
  const problems = [];
  const names = new Set();
  for (const node of wf.nodes) {
    if (names.has(node.name)) problems.push(`duplicate node name ${node.name}`);
    names.add(node.name);
    if (node.type === 'n8n-nodes-base.stickyNote') continue;
    const r = description(node.type, node.typeVersion);
    if (!r) { problems.push(`${node.name}: unknown type ${node.type}`); continue; }
    if (r.error) { problems.push(`${node.name}: ${r.error}`); continue; }
    const d = r.asTool ? toolProps(r.d) : r.d;
    const known = new Set(d.properties.map((p) => p.name));
    if (d.polling) known.add('pollTimes');
    // One level down: keys inside collections must be known options.
    for (const p of d.properties) {
      const v = (node.parameters || {})[p.name];
      if (p.type !== 'collection' || !v || typeof v !== 'object') continue;
      const allowed = new Set(d.properties.filter((q) => q.name === p.name).flatMap((q) => (q.options || []).map((o) => o.name)));
      for (const k of Object.keys(v)) if (!allowed.has(k)) problems.push(`${node.name}: unknown option "${p.name}.${k}"`);
    }
    for (const k of Object.keys(node.parameters || {})) if (!known.has(k)) problems.push(`${node.name}: unknown parameter "${k}"`);
    if (node.disabled) continue;
    const full = NodeHelpers.getNodeParameters(d.properties, node.parameters, true, false, node, d);
    const issues = NodeHelpers.getNodeParametersIssues(d.properties, { ...node, parameters: full }, d);
    if (issues && issues.parameters) for (const [k, v] of Object.entries(issues.parameters)) problems.push(`${node.name}: ${k}: ${v.join(' ')}`);
    // Options values must be one of the allowed ones (when not an expression).
    for (const p of d.properties) {
      const v = (node.parameters || {})[p.name];
      if (p.type === 'options' && v !== undefined && !(typeof v === 'string' && v.startsWith('=')) && p.options && !p.options.some((o) => o.value === v)
        && NodeHelpers.displayParameter(full, p, node, d)) problems.push(`${node.name}: ${p.name}="${v}" not in [${p.options.map((o) => o.value)}]`);
    }
  }
  for (const [from, outs] of Object.entries(wf.connections || {})) {
    if (!names.has(from)) problems.push(`connection from missing node ${from}`);
    for (const list of Object.values(outs)) for (const branch of list) for (const c of branch || []) if (!names.has(c.node)) problems.push(`connection to missing node ${c.node}`);
  }
  // Every non-trigger node should have an input.
  const targets = new Set();
  for (const outs of Object.values(wf.connections || {})) for (const list of Object.values(outs)) for (const branch of list) for (const c of branch || []) targets.add(c.node);
  for (const node of wf.nodes) {
    if (node.type === 'n8n-nodes-base.stickyNote') continue;
    const isTrigger = /trigger|webhook/i.test(node.type) || node.type.endsWith('.manualTrigger');
    const isSub = /lmChat|memory|Tool$|outputParser/.test(node.type);
    if (!isTrigger && !isSub && !targets.has(node.name)) problems.push(`${node.name}: has no input connection`);
  }
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${file} (${wf.nodes.length} nodes)`);
  problems.forEach((p) => console.log('     - ' + p));
  failures += problems.length;
}
process.exit(failures ? 1 : 0);
