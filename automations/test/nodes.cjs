// Loads n8n node classes from an n8n install (N8N_DIR) and returns the description for a type + version.
const path = require('path');
if (!process.env.N8N_DIR) throw new Error('Set N8N_DIR to a folder where n8n is installed (see automations/README.md).');
const base = path.join(path.resolve(process.env.N8N_DIR), 'node_modules');
const known = {};
for (const pkg of ['n8n-nodes-base', '@n8n/n8n-nodes-langchain']) {
  const prefix = pkg === 'n8n-nodes-base' ? 'n8n-nodes-base.' : '@n8n/n8n-nodes-langchain.';
  for (const [name, info] of Object.entries(require(path.join(base, pkg, 'dist/known/nodes.json')))) known[prefix + name] = { pkg, info };
}
const cache = {};
function load(type) {
  if (cache[type]) return cache[type];
  let k = known[type], asTool = false;
  if (!k && type.endsWith('Tool') && known[type.slice(0, -4)]) { k = known[type.slice(0, -4)]; asTool = true; }
  if (!k) return null;
  const mod = require(path.join(base, k.pkg, k.info.sourcePath));
  return (cache[type] = { inst: new mod[k.info.className](), asTool });
}
function description(type, version) {
  const l = load(type);
  if (!l) return null;
  const { inst } = l;
  if (inst.nodeVersions) {
    const v = inst.nodeVersions[version];
    if (!v) return { error: `version ${version} not in ${Object.keys(inst.nodeVersions)}` };
    return { d: v.description, asTool: l.asTool };
  }
  const versions = [].concat(inst.description.version);
  if (!versions.includes(version)) return { error: `version ${version} not in ${versions}` };
  return { d: inst.description, asTool: l.asTool };
}
module.exports = { description, base };
