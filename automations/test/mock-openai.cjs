// Fake OpenAI chat completions API. Answers with canned JSON based on the system prompt, logs every request.
const http = require('http');
const fs = require('fs');
const LOG = process.env.OPENAI_LOG;
const answers = [
  [/qualify inbound leads/, { score: 'hot', reason: 'Clear need and budget', summary: 'Real estate agency wants more leads', subject: 'Re: your project', reply: 'Hi Ana, thanks for reaching out...' }],
  [/write follow-up emails/, { subject: 'Quick follow-up', reply: 'Hi again, just checking in...' }],
  [/social media writer/, { instagram: 'IG text', facebook: 'FB text', linkedin: 'LI text', x: 'X text', hashtags: '#ai #automation' }],
  [/extract data from invoices/, { document_type: 'invoice', supplier_name: 'Acme Ltd', invoice_number: 'INV-7', invoice_date: '2026-03-01', currency: 'EUR', subtotal: 100, vat_amount: 20, total: 120, line_items: [{ description: 'Service', amount: 100 }], confidence: 'high' }],
  [/security analyst/, { severity: 'high', summary: 'Brute force from a known bad IP', likely_cause: 'Automated SSH attack', false_positive_likelihood: 'low', recommended_actions: ['Block the IP', 'Check auth logs'] }],
];
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    fs.appendFileSync(LOG, JSON.stringify({ url: req.url, auth: req.headers.authorization, body: JSON.parse(body || '{}') }) + '\n');
    const b = JSON.parse(body || '{}');
    const system = (b.messages || []).filter((m) => m.role === 'system').map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\n');
    const hit = answers.find(([re]) => re.test(system));
    const content = hit ? JSON.stringify(hit[1]) : 'We are open Monday to Friday, 9:00 to 18:00.';
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ id: 'chatcmpl-test', object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: b.model,
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }));
  });
}).listen(5999, () => console.log('mock openai on 5999'));
