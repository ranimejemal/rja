// Fake OpenAI chat completions API. Answers with canned JSON based on the system prompt, logs every request.
const http = require('http');
const fs = require('fs');
const LOG = process.env.OPENAI_LOG;
const answers = [
  [/qualify inbound leads/, { score: 'hot', reason: 'Clear need and budget', summary: 'Real estate agency wants more leads', subject: 'Re: your project', reply: 'Hi Ana, thanks for reaching out...' }],
  [/write follow-up emails/, { subject: 'Quick follow-up', reply: 'Hi again, just checking in...' }],
  [/social media writer/, { instagram: 'IG text', facebook: 'FB text', linkedin: 'LI text', x: 'X text', hashtags: '#ai #automation' }],
  [/extract data from invoices/, { document_type: 'invoice', supplier_name: 'Acme Ltd', invoice_number: 'INV-7', invoice_date: '2026-03-01', currency: 'EUR', subtotal: 100, vat_amount: 20, total: 120, line_items: [{ description: 'Service', amount: 100 }], confidence: 'high' }],
  [/sort incoming enquiries/, { category: 'quote request', priority: 'high', summary: 'Wants a quote for 3 workflows', is_spam: false, reply: 'Thanks for your message, we will send a quote today.' }],
  [/qualify B2B leads/, { company_name: 'Acme Homes', industry: 'Real estate agency', company_size: 'small', what_they_do: 'Sells homes in Lyon', fit_score: 82, fit_reason: 'Agency with lead volume', confidence: 'high' }],
  [/manage online reviews/, { sentiment: 'negative', summary: 'Slow service', topics: ['service', 'waiting time'], reply: 'We are sorry about the wait.' }],
  [/triage customer support emails/, { category: 'refund or return', urgency: 'urgent', sentiment: 'negative', language: 'en', summary: 'Wants a refund for a broken item', suggested_reply: 'Sorry about this, we are on it.' }],
  [/write cart reminder emails/, { subject: 'Your cart is waiting', body: 'Hi Ana, your mug is still in your cart.' }],
  [/write meeting notes/, { summary: 'Kickoff done.', decisions: ['Start in March'], action_items: [{ task: 'Send the quote', owner: 'ana@example.com', due_date: '2026-03-12' }, { task: 'Book the venue', owner: '', due_date: '' }], open_questions: [] }],
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
