// End-to-end scenarios for the seven workflows, run inside a real n8n.
// Usage: N8N_DIR=/path/to/n8n-install node automations/test/run-all.cjs [workflow-number ...]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { run, setup, HOME } = require('./harness.cjs');

const AUTO = path.resolve(__dirname, '..');
const openaiLog = path.join(HOME, 'openai-requests.jsonl');
setup();
fs.writeFileSync(openaiLog, '');
const mock = spawn(process.execPath, [path.join(__dirname, 'mock-openai.cjs')], { env: { ...process.env, OPENAI_LOG: openaiLog }, stdio: 'ignore' });
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 800);
const wfPath = (dir) => path.join(AUTO, dir, 'workflow.json');
const only = process.argv.slice(2);
let failed = 0;
let passed = 0;

function check(name, cond, detail) {
  if (cond) { passed++; console.log('    ok   ' + name); }
  else { failed++; console.log('    FAIL ' + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 600) : '')); }
}

function scenario(num, dir, s, assertions) {
  if (only.length && !only.includes(String(num))) return;
  console.log(`\n[${num}] ${dir} :: ${s.id}`);
  const r = run(wfPath(dir), s);
  if (!r.ok) { failed++; console.log('    FAIL execution error :: ' + JSON.stringify(r.error).slice(0, 3000)); if (r.ran) console.log('    ran: ' + r.ran.join(', ')); return; }
  try { assertions(r); } catch (e) { failed++; console.log('    FAIL assertion threw :: ' + e.stack.slice(0, 800)); console.log('    ran: ' + r.ran.join(', ')); }
}

const lastRequests = (n) => fs.readFileSync(openaiLog, 'utf8').trim().split('\n').slice(-n).map((l) => JSON.parse(l));
const iso = (d) => d.toISOString();
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));

// --------------------------------------------------------------------------------------------- 1
const W1 = '01-ai-lead-generation-follow-up';
scenario(1, W1, {
  id: 'w1formLead000001', trigger: 'New lead form',
  triggerCode: `return [{ json: { Name: 'Ana Silva', Email: 'ana@example.com', Phone: '+33 6 11 22 33 44', Company: 'Silva Immo', 'How can we help?': 'We need more leads for our agency.', Budget: '$500 - $2,000', submittedAt: new Date().toISOString(), formMode: 'production' } }];`,
}, (r) => {
  const row = r.outputOf('Lead row')[0];
  check('lead row built from AI answer', row.score === 'hot' && row.email === 'ana@example.com' && row.source === 'website form' && row.status === 'contacted', row);
  check('row saved to Leads', r.outputOf('Save lead')[0].__params.sheetName.value === 'Leads');
  const send = r.outputOf('Send first reply');
  check('first reply sent to lead', send && send[0].__params.sendTo === 'ana@example.com' && /thanks for reaching out/.test(send[0].__params.message), send && send[0].__params);
  check('draft path not used', !r.outputOf('Draft first reply'));
  const alert = r.outputOf('Alert team about hot lead');
  check('team alerted about hot lead', alert && /Hot lead: Ana Silva/.test(alert[0].__params.subject) && /We need more leads/.test(alert[0].__params.message), alert && alert[0].__params);
  const req = lastRequests(1)[0];
  check('OpenAI called with JSON mode and Bearer key', req.body.response_format.type === 'json_object' && req.auth === 'Bearer test-key' && req.body.model === 'gpt-4.1-mini', req);
});

scenario(1, W1, {
  id: 'w1draftMode00001', trigger: 'Website or ads webhook', settings: { autoSendReplies: false },
  triggerCode: `return [{ json: { headers: {}, params: {}, query: {}, body: { full_name: 'Leo Martin', email: 'leo@example.com', message: 'Interested' } } }];`,
}, (r) => {
  check('webhook source recorded', r.outputOf('Lead row')[0].source === 'webhook');
  const d = r.outputOf('Draft first reply');
  check('reply saved as draft when auto-send is off', d && d[0].__params.options.sendTo === 'leo@example.com' && !r.outputOf('Send first reply'), d && d[0].__params);
});

scenario(1, W1, {
  id: 'w1noEmailLead001', trigger: 'Website or ads webhook',
  triggerCode: `return [{ json: { headers: {}, params: {}, query: {}, body: { name: 'Bob', phone: '+216 97 000 000', message: 'Call me' } } }];`,
}, (r) => {
  check('no AI call without email', !r.outputOf('Qualify lead with AI'));
  check('saved with call status', r.outputOf('Save lead (no email)')[0].status === 'call - no email');
  const call = r.outputOf('Ask team to call');
  check('team asked to call', call && /\+216 97 000 000/.test(call[0].__params.message), call && call[0].__params);
});

scenario(1, W1, {
  id: 'w1followUps00001', trigger: 'Every weekday at 9:00',
  triggerCode: `return [{ json: { timestamp: new Date().toISOString() } }];`,
  reads: {
    'Read leads': `() => [
      { row_number: 2, lead_id: 'L1', name: 'Ana', email: 'ana@example.com', status: 'contacted', follow_ups: 0, last_contact_at: '${daysAgo(3)}', message: 'Need leads' },
      { row_number: 3, lead_id: 'L2', name: 'Recent', email: 'r@example.com', status: 'contacted', follow_ups: 0, last_contact_at: '${daysAgo(0.5)}' },
      { row_number: 4, lead_id: 'L3', name: 'Done', email: 'd@example.com', status: 'replied', follow_ups: 1, last_contact_at: '${daysAgo(10)}' },
      { row_number: 5, lead_id: 'L4', name: 'Max', email: 'm@example.com', status: 'contacted', follow_ups: 3, last_contact_at: '${daysAgo(10)}' },
    ]`,
  },
}, (r) => {
  const due = r.outputOf('Leads due a follow-up');
  check('only the due lead is followed up', due.length === 1 && due[0].lead_id === 'L1' && due[0].follow_up_number === 1, due);
  check('follow-up sent', r.outputOf('Send follow-up')[0].__params.sendTo === 'ana@example.com');
  const upd = r.outputOf('Record follow-up');
  check('sheet updated by lead_id with new count', upd[0].lead_id === 'L1' && upd[0].follow_ups === 1 && upd[0].__params.columns.matchingColumns[0] === 'lead_id', upd);
});

scenario(1, W1, {
  id: 'w1replies0000001', trigger: 'Lead replied by email',
  triggerCode: `return [{ json: { id: 'm1', From: 'Ana Silva <Ana@Example.com>', Subject: 'Re: your project' } }, { json: { id: 'm2', From: 'newsletter@shop.com', Subject: 'Deals' } }];`,
  reads: {
    'Read leads (replies)': `() => [
      { lead_id: 'L1', name: 'Ana Silva', email: 'ana@example.com', status: 'contacted' },
      { lead_id: 'L2', name: 'Other', email: 'other@example.com', status: 'contacted' },
    ]`,
  },
}, (r) => {
  check('sheet read once for two emails', r.outputOf('Read leads (replies)').length === 2);
  const m = r.outputOf('Mark lead as replied');
  check('matching lead marked replied', m && m.length === 1 && m[0].lead_id === 'L1' && m[0].status === 'replied', m);
  check('team told', /Lead replied: Ana Silva/.test(r.outputOf('Tell team about reply')[0].__params.subject));
});

// --------------------------------------------------------------------------------------------- 2
const W2 = '02-ai-customer-service-chatbot';
scenario(2, W2, {
  id: 'w2chat0000000001', trigger: 'Chat',
  triggerCode: `return [{ json: { sessionId: 'sess-1', action: 'sendMessage', chatInput: 'What are your opening hours?' } }];`,
}, (r) => {
  check('agent answered', /open Monday to Friday/.test(r.outputOf('Customer service agent')[0].output));
  const log = r.outputOf('Log conversation')[0];
  check('conversation logged', log.session_id === 'sess-1' && log.question === 'What are your opening hours?' && /open/.test(log.answer), log);
  const reply = r.outputOf('Reply')[0];
  check('chat reply is the agent output only', Object.keys(reply).join() === 'output' && /open/.test(reply.output), reply);
  const req = lastRequests(1)[0];
  check('system prompt has business settings and tools offered', /customer service assistant of Your business name/.test(req.body.messages[0].content) && (req.body.tools || []).map((t) => t.function.name).sort().join() === 'faq,handoff_to_team', req.body.tools && req.body.tools.map((t) => t.function.name));
});

// --------------------------------------------------------------------------------------------- 3
const W3 = '03-ai-appointment-booking';
scenario(3, W3, {
  id: 'w3chat0000000001', trigger: 'Chat',
  triggerCode: `return [{ json: { sessionId: 'sess-2', action: 'sendMessage', chatInput: 'Can I book a haircut tomorrow?' } }];`,
}, (r) => {
  check('agent answered', typeof r.outputOf('Booking assistant')[0].output === 'string');
  const req = lastRequests(1)[0];
  const tools = (req.body.tools || []).map((t) => t.function.name).sort().join();
  check('booking tools offered', tools === 'book_appointment,cancel_booking,check_availability,find_bookings', tools);
  check('prompt has current date and hours', /Current date and time: \w+day/.test(req.body.messages[0].content) && /09:00 to 18:00/.test(req.body.messages[0].content), req.body.messages[0].content.slice(0, 600));
  check('reminder branch not run', !r.outputOf('Upcoming appointments'));
});

scenario(3, W3, {
  id: 'w3reminders00001', trigger: 'Every hour',
  triggerCode: `return [{ json: {} }];`,
  reads: {
    'Upcoming appointments': `() => [
      { id: 'e1', summary: 'Haircut - Ana', start: { dateTime: new Date(Date.now() + 24.5 * 3600000).toISOString() }, attendees: [{ email: 'ana@example.com' }] },
      { id: 'e2', summary: 'Blocked', start: { dateTime: new Date(Date.now() + 24.2 * 3600000).toISOString() } },
    ]`,
  },
}, (r) => {
  const p = r.outputOf('__probe Upcoming appointments')[0].__params;
  check('calendar window is 24 to 25 hours ahead', Math.abs(Date.parse(p.timeMin) - Date.now() - 24 * 3600000) < 120000 && Math.abs(Date.parse(p.timeMax) - Date.parse(p.timeMin) - 3600000) < 1000, p);
  const sent = r.outputOf('Send reminder');
  check('one reminder to the attendee', sent.length === 1 && sent[0].__params.sendTo === 'ana@example.com' && /Haircut - Ana/.test(sent[0].__params.message), sent.map((s) => s.__params));
});

// --------------------------------------------------------------------------------------------- 4
const W4 = '04-ai-social-media-automation';
scenario(4, W4, {
  id: 'w4drafts00000001', trigger: 'Every Monday at 8:00',
  triggerCode: `return [{ json: {} }];`,
  reads: {
    'Read content plan': `() => [
      { row_number: 2, post_id: 'P1', publish_at: '${iso(new Date(Date.now() + 2 * 86400000))}', topic: 'Spring offer', status: 'idea' },
      { row_number: 3, post_id: 'P2', publish_at: '${iso(new Date(Date.now() + 40 * 86400000))}', topic: 'Later', status: 'idea' },
      { row_number: 4, post_id: 'P3', publish_at: '${iso(new Date(Date.now() + 1 * 86400000))}', topic: 'Done', status: 'published' },
    ]`,
  },
}, (r) => {
  const d = r.outputOf('Save drafts');
  check('one draft written and saved', d.length === 1 && d[0].post_id === 'P1' && d[0].status === 'waiting approval' && d[0].instagram === 'IG text', d);
  const a = r.outputOf('Ask for approval');
  check('one approval email', a.length === 1 && /1 social posts/.test(a[0].__params.subject) && /Spring offer/.test(a[0].__params.message), a.map((x) => x.__params));
});

scenario(4, W4, {
  id: 'w4publish0000001', trigger: 'Every hour',
  triggerCode: `return [{ json: {} }];`,
  reads: {
    'Read approved posts': `() => [
      { post_id: 'P1', publish_at: '${daysAgo(0.01)}', status: 'approved', facebook: 'FB text', instagram: 'IG text', linkedin: 'LI text', x: 'X text', hashtags: '#a', image_url: '' },
      { post_id: 'P2', publish_at: '${iso(new Date(Date.now() + 86400000))}', status: 'approved' },
    ]`,
  },
  code: {
    'Post to Facebook': `return [{ json: { id: '111_222' }, pairedItem: { item: 0 } }];`,
    'Instagram: upload image': `if (!$('Posts due now').first().json.image_url) throw new Error('image_url is required'); return [{ json: { id: '333' }, pairedItem: { item: 0 } }];`,
    'Instagram: publish': `return [{ json: { id: '444' }, pairedItem: { item: 0 } }];`,
    'Post to LinkedIn': `return [{ json: { urn: 'urn:li:share:1' }, pairedItem: { item: 0 } }];`,
  },
}, (r) => {
  check('only the due post is published', r.outputOf('Posts due now').length === 1);
  check('instagram failure went to the error output, publish skipped', r.outputOf('Instagram: upload image', 1).length === 1 && !r.outputOf('Instagram: publish'));
  const res = r.outputOf('Record publishing');
  check('result: partly published with the instagram error, X (disabled) ignored', res[0].post_id === 'P1' && res[0].status === 'partly published' && res[0].published_to === 'facebook, linkedin' && /instagram: image_url is required/.test(res[0].errors), res);
});

scenario(4, W4, {
  id: 'w4publishAll0001', trigger: 'Every hour',
  triggerCode: `return [{ json: {} }];`,
  reads: {
    'Read approved posts': `() => [
      { post_id: 'P1', publish_at: '${daysAgo(0.01)}', status: 'approved', facebook: 'FB text', instagram: 'IG text', linkedin: 'LI text', x: 'X text', hashtags: '#a', image_url: 'https://img/1.jpg' },
      { post_id: 'P2', publish_at: '${daysAgo(0.02)}', status: 'approved', facebook: 'Second' },
    ]`,
  },
  stubs: {
    'Post to Facebook': { id: '111_222' },
    'Instagram: upload image': { id: '333' },
    'Instagram: publish': { id: '444' },
    'Post to LinkedIn': { urn: 'urn:li:share:1' },
  },
}, (r) => {
  check('one post per run', r.outputOf('Posts due now').length === 1);
  const fb = r.outputOf('Post to Facebook')[0].__params;
  check('facebook message includes hashtags', fb.options.queryParameters.parameter[0].value === 'FB text\n\n#a', fb);
  check('instagram publish uses the uploaded container id', r.outputOf('Instagram: publish')[0].__params.options.queryParameters.parameter[0].value === '333');
  const res = r.outputOf('Record publishing')[0];
  check('published everywhere enabled', res.status === 'published' && res.published_to === 'facebook, instagram, linkedin' && res.errors === '', res);
});

scenario(4, W4, {
  id: 'w4graphError0001', trigger: 'Every hour',
  triggerCode: `return [{ json: {} }];`,
  reads: {
    'Read approved posts': `() => [{ post_id: 'P1', publish_at: '${daysAgo(0.01)}', status: 'approved', facebook: 'FB', instagram: 'IG', linkedin: 'LI', image_url: 'https://img/1.jpg' }]`,
  },
  code: {
    // The Facebook node itself catches Graph API errors and returns them on its normal output.
    'Post to Facebook': `return [{ json: { statusCode: 400, message: 'Invalid OAuth access token', type: 'OAuthException' }, pairedItem: { item: 0 } }];`,
    'Instagram: upload image': `return [{ json: { id: '333' }, pairedItem: { item: 0 } }];`,
    'Instagram: publish': `return [{ json: { id: '444' }, pairedItem: { item: 0 } }];`,
    'Post to LinkedIn': `throw new Error('LinkedIn credentials expired');`,
  },
}, (r) => {
  const res = r.outputOf('Record publishing')[0];
  check('graph error on normal output and thrown error both reported', res.status === 'partly published' && res.published_to === 'instagram' && /facebook: Invalid OAuth/.test(res.errors) && /linkedin: LinkedIn credentials expired/.test(res.errors), res);
});

// --------------------------------------------------------------------------------------------- 4 (images, replies)
scenario(4, W4, {
  id: 'w4images00000001', trigger: 'Every Monday at 8:00', triggerCode: `return [{ json: {} }];`,
  reads: { 'Read content plan': `() => [
    { post_id: 'P1', publish_at: '${iso(new Date(Date.now() + 86400000))}', topic: 'Spring offer', status: 'idea', image_url: '' },
    { post_id: 'P2', publish_at: '${iso(new Date(Date.now() + 2 * 86400000))}', topic: 'Team', status: 'idea', image_url: 'https://mine/photo.jpg' },
  ]` },
  stubs: {
    'Store image on Facebook (unpublished)': { id: 'photo123' },
    'Image link': { images: ["={{ [{ source: 'https://scontent.example/photo123.png' }] }}", 'array'] },
  },
}, (r) => {
  const req = lastRequests(3).find((x) => x.url.endsWith('/images/generations'));
  check('image created from the AI image prompt', req && req.body.model === 'gpt-image-1' && /bright modern office desk/.test(req.body.prompt) && !('response_format' in req.body), req && req.body);
  const up = r.outputOf('Store image on Facebook (unpublished)')[0].__params;
  check('image uploaded to the page unpublished as a file', up.sendBinaryData === 'true' && up.binaryPropertyName === 'source:data' && up.options.queryParameters.parameter[0].value === 'false', up);
  const saved = r.outputOf('Save drafts');
  const p1 = saved.find((x) => x.post_id === 'P1'); const p2 = saved.find((x) => x.post_id === 'P2');
  check('new image URL saved for the post without one, own image kept', p1.image_url === 'https://scontent.example/photo123.png' && p2.image_url === 'https://mine/photo.jpg', saved.map((x) => [x.post_id, x.image_url]));
  check('approver email lists the image', /image: https:\/\/scontent.example\/photo123.png/.test(r.outputOf('Ask for approval')[0].__params.message));
});
scenario(4, W4, {
  id: 'w4noimages000001', trigger: 'Every Monday at 8:00', triggerCode: `return [{ json: {} }];`, settings: { generateImages: false },
  reads: { 'Read content plan': `() => [{ post_id: 'P1', publish_at: '${iso(new Date(Date.now() + 86400000))}', topic: 'Spring offer', status: 'idea' }]` },
}, (r) => {
  check('no image created when turned off', !r.outputOf('Create image with AI') && r.outputOf('Save drafts').length === 1);
});
scenario(4, W4, {
  id: 'w4verify00000001', trigger: 'Meta webhook check',
  triggerCode: `return [{ json: { query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'CHOOSE-A-LONG-RANDOM-TOKEN', 'hub.challenge': '987654' } } }];`,
}, (r) => {
  check('Meta verification answered with the challenge', r.outputOf('Confirm webhook')[0].__params.responseBody === '987654' && !r.outputOf('Refuse webhook'));
});
scenario(4, W4, {
  id: 'w4verifyBad00001', trigger: 'Meta webhook check',
  triggerCode: `return [{ json: { query: { 'hub.verify_token': 'wrong', 'hub.challenge': '1' } } }];`,
}, (r) => {
  check('wrong verify token refused with 403', r.outputOf('Refuse webhook')[0].__params.options.responseCode === '403' && !r.outputOf('Confirm webhook'));
});
scenario(4, W4, {
  id: 'w4replies0000001', trigger: 'Meta events',
  settings: { facebookPageId: 'PAGE1' },
  triggerCode: `return [{ json: { body: { object: 'page', entry: [{ changes: [
    { field: 'feed', value: { item: 'comment', verb: 'add', comment_id: 'c1', message: 'Are you open on Sunday?', from: { id: 'u1', name: 'Ana' }, post_id: 'p1' } },
    { field: 'feed', value: { item: 'comment', verb: 'add', comment_id: 'c2', message: 'Our own reply', from: { id: 'PAGE1' } } },
  ], messaging: [ { sender: { id: 'u9' }, message: { text: 'I want a refund, my order never arrived' } } ] }] } } }];`,
}, (r) => {
  const rows = r.outputOf('Log reply');
  check('page’s own comment ignored, two events logged', rows.length === 2, rows.map((x) => x.text));
  const fb = r.outputOf('Reply to Facebook comment');
  check('question answered publicly under the comment', fb && fb.length === 1 && fb[0].__params.node === 'c1' && fb[0].__params.options.queryParameters.parameter[0].value === 'We are open every day from 9:00 to 18:00!', fb && fb[0].__params);
  check('complaint not answered automatically', !r.outputOf('Answer the message'));
  const ask = r.outputOf('Ask you to reply');
  check('complaint sent to you with a suggested reply', ask && ask.length === 1 && /refund/.test(ask[0].__params.message) && /complaint/.test(ask[0].__params.subject), ask && ask[0].__params);
});
scenario(4, W4, {
  id: 'w4dm000000000001', trigger: 'Meta events',
  triggerCode: `return [{ json: { body: { object: 'instagram', entry: [{ messaging: [ { sender: { id: 'igu1' }, message: { text: 'Hi! Are you open today?' } } ] }] } } }];`,
}, (r) => {
  const m = r.outputOf('Answer the message');
  check('Instagram DM answered privately with the Send API format', m && JSON.parse(m[0].__params.options.queryParameters.parameter[0].value).id === 'igu1' && JSON.parse(m[0].__params.options.queryParameters.parameter[1].value).text.startsWith('We are open') && m[0].__params.options.queryParameters.parameter[2].value === 'RESPONSE', m && m[0].__params);
});
scenario(4, W4, {
  id: 'w4manual00000001', trigger: 'Meta events', settings: { autoReply: false },
  triggerCode: `return [{ json: { body: { object: 'page', entry: [{ changes: [ { field: 'feed', value: { item: 'comment', verb: 'add', comment_id: 'c5', message: 'Price?', from: { id: 'u5', name: 'Leo' } } } ] }] } } }];`,
}, (r) => {
  check('with auto-reply off, every reply goes to you first', !r.outputOf('Reply to Facebook comment') && r.outputOf('Ask you to reply').length === 1 && r.outputOf('Log reply')[0].status === 'sent to you for review');
});

// --------------------------------------------------------------------------------------------- 5
const W5 = '05-ai-voice-receptionist';
const nextWeekday = (() => { const d = new Date(Date.now() + 2 * 86400000); while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })();
const vapi = (name, args) => `return [{ json: { headers: {}, body: { message: { type: 'tool-calls', call: { id: 'call1', customer: { number: '+33612345678' } }, toolCallList: [{ id: 'tc1', type: 'function', function: { name: '${name}', arguments: ${JSON.stringify(args)} } }] } } } }];`;
const busyDay = `() => [{ id: 'ev1', summary: 'Busy', start: { dateTime: '${nextWeekday}T10:00:00+01:00' }, end: { dateTime: '${nextWeekday}T12:00:00+01:00' } }]`;

scenario(5, W5, {
  id: 'w5avail000000001', trigger: 'Vapi tools', triggerCode: vapi('check_availability', { date: nextWeekday }),
  reads: { 'Events that day': busyDay },
}, (r) => {
  const body = JSON.parse(r.outputOf('Answer Vapi')[0].__params.responseBody);
  check('answers with free times skipping the busy block', body.results[0].toolCallId === 'tc1' && /09:00/.test(body.results[0].result) && !/10:00|11:00/.test(body.results[0].result) && /12:00/.test(body.results[0].result), body);
  const p = r.outputOf('__probe Events that day')[0].__params;
  check('calendar queried for the whole day in the business zone', p.timeMin.startsWith(nextWeekday + 'T00:00:00') && p.timeMax.startsWith(nextWeekday + 'T23:59:59'), p);
});

scenario(5, W5, {
  id: 'w5bookFree000001', trigger: 'Vapi tools', triggerCode: vapi('book_appointment', { date: nextWeekday, time: '14:00', name: 'Ana', phone: '', service: 'Consultation' }),
  reads: { 'Events on booking day': busyDay }, stubs: { 'Book in calendar': { id: 'new1' } },
}, (r) => {
  const c = r.outputOf('Book in calendar')[0].__params;
  check('event created at the right local time with caller number', c.start.startsWith(nextWeekday + 'T14:00:00') && c.end.startsWith(nextWeekday + 'T15:00:00') && /\+33612345678/.test(c.additionalFields.description), c);
  check('Vapi told it is booked', /Booked:/.test(JSON.parse(r.outputOf('Answer Vapi')[0].__params.responseBody).results[0].result));
});

scenario(5, W5, {
  id: 'w5bookBusy000001', trigger: 'Vapi tools', triggerCode: vapi('book_appointment', { date: nextWeekday, time: '10:00', name: 'Ana' }),
  reads: { 'Events on booking day': busyDay },
}, (r) => {
  check('busy time not booked', !r.outputOf('Book in calendar'));
  check('Vapi told to offer another time', /not available/.test(JSON.parse(r.outputOf('Answer Vapi')[0].__params.responseBody).results[0].result));
});

scenario(5, W5, {
  id: 'w5message0000001', trigger: 'Vapi tools', triggerCode: vapi('take_message', JSON.stringify({ name: 'Paul', message: 'Please call me about a group booking', urgent: true })),
}, (r) => {
  const m = r.outputOf('Email the message')[0].__params;
  check('message emailed with caller number', /Paul/.test(m.subject) && /\+33612345678/.test(m.message) && /Urgent: yes/.test(m.message), m);
  check('Vapi told message passed on', /passed on/.test(JSON.parse(r.outputOf('Answer Vapi')[0].__params.responseBody).results[0].result));
});

scenario(5, W5, {
  id: 'w5callReport0001', trigger: 'Vapi call events',
  triggerCode: `return [{ json: { body: { message: { type: 'end-of-call-report', endedReason: 'customer-ended-call', durationSeconds: 95, analysis: { summary: 'Booked a consultation.' }, transcript: 'AI: Hello...', recordingUrl: 'https://rec/1.wav', call: { id: 'c1', customer: { number: '+33600000000' } } } } } }];`,
}, (r) => {
  const row = r.outputOf('Log call')[0];
  check('call logged', row.call_id === 'c1' && row.caller_number === '+33600000000' && row.summary === 'Booked a consultation.', row);
  check('summary emailed', /Call from \+33600000000/.test(r.outputOf('Email call summary')[0].__params.subject));
});

scenario(5, W5, {
  id: 'w5statusUpdate01', trigger: 'Vapi call events',
  triggerCode: `return [{ json: { body: { message: { type: 'status-update', status: 'in-progress' } } } }];`,
}, (r) => {
  check('other Vapi events are ignored', !r.outputOf('Log call'));
});

// --------------------------------------------------------------------------------------------- 6
const W6 = '06-ai-document-processing';
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n').toString('base64');
scenario(6, W6, {
  id: 'w6upload00000001', trigger: 'Upload form',
  triggerCode: `
const pdf = await this.helpers.prepareBinaryData(Buffer.from('${PDF}', 'base64'), 'facture.pdf', 'application/pdf');
const img = await this.helpers.prepareBinaryData(Buffer.alloc(50000, 1), 'receipt.jpg', 'image/jpeg');
const zip = await this.helpers.prepareBinaryData(Buffer.from('PK'), 'x.zip', 'application/zip');
return [{ json: { Documents: [], submittedAt: new Date().toISOString() }, binary: { Documents_0: pdf, Documents_1: img, Documents_2: zip } }];`,
  stubs: {
    'Save to Google Drive': { id: 'drv_x', webViewLink: 'https://drive.google.com/file/d/x/view' },
  },
}, (r) => {
  check('two supported files, zip skipped', r.outputOf('One item per file').length === 2);
  const reqs = lastRequests(2).map((x) => x.body.messages[1].content[1]);
  check('PDF sent as file part, image as image part', reqs[0].type === 'file' && reqs[0].file.file_data.startsWith('data:application/pdf;base64,JVBERi') && reqs[1].type === 'image_url' && reqs[1].image_url.url.startsWith('data:image/jpeg;base64,'), reqs.map((x) => x.type));
  const d = r.outputOf('Save to Google Drive');
  check('file named date_supplier_number and uploaded to the folder', d[0].__params.name === '2026-03-01_Acme-Ltd_INV-7.pdf' && d[1].__params.name === '2026-03-01_Acme-Ltd_INV-7.jpg' && d[0].__params.folderId.value === 'YOUR_DRIVE_FOLDER_ID', d.map((x) => x.__params.name));
  const rows = r.outputOf('Log in sheet');
  check('logged with ok status and drive link', rows.length === 2 && rows[0].status === 'ok' && rows[0].total === 120 && rows[0].drive_link.startsWith('https://drive.google.com') && rows[0].source === 'upload', rows[0]);
  check('no review email when data adds up', !r.outputOf('Ask for a review'));
});

scenario(6, W6, {
  id: 'w6email000000001', trigger: 'Document received by email',
  triggerCode: `
const pdf = await this.helpers.prepareBinaryData(Buffer.from('${PDF}', 'base64'), 'invoice.pdf', 'application/pdf');
const logo = await this.helpers.prepareBinaryData(Buffer.alloc(2000, 1), 'logo.png', 'image/png');
return [{ json: { from: { text: 'Acme <billing@acme.com>' }, subject: 'Invoice INV-7' }, binary: { attachment_0: pdf, attachment_1: logo } }];`,
  stubs: { 'Save to Google Drive': { id: 'drv1' } },
}, (r) => {
  check('small logo image skipped', r.outputOf('One item per file').length === 1);
  const row = r.outputOf('Log in sheet')[0];
  check('email sender recorded and link built from file id', row.received_from === 'Acme <billing@acme.com>' && row.drive_link === 'https://drive.google.com/file/d/drv1/view', row);
});

// --------------------------------------------------------------------------------------------- 7
const W7 = '07-ai-security-monitoring-workflows';
const MUTE_HOST = 'nas-' + Date.now();
scenario(7, W7, {
  id: 'w7wazuhPublic001', trigger: 'Security alert',
  triggerCode: `return [{ json: { headers: {}, body: { timestamp: '2026-03-10T08:00:00Z', rule: { level: 10, description: 'sshd: brute force trying to get access', id: '5712-' + Date.now() }, agent: { name: 'web-1' }, data: { srcip: '45.155.205.233' }, full_log: 'Failed password for root' } } }];`,
  stubs: { 'IP reputation (VirusTotal)': { data: ["={{ { attributes: { last_analysis_stats: { malicious: 7, suspicious: 1, harmless: 50 }, country: 'NL', as_owner: 'Hosting' } } }}", 'object'] } },
}, (r) => {
  check('VirusTotal queried for the public IP', r.outputOf('IP reputation (VirusTotal)')[0].__params.url === 'https://www.virustotal.com/api/v3/ip_addresses/45.155.205.233');
  const req = lastRequests(1)[0];
  check('AI got the alert and reputation', /"malicious":7/.test(req.body.messages[1].content) && /brute force/.test(req.body.messages[1].content), req.body.messages[1].content.slice(0, 300));
  const inc = r.outputOf('Log incident')[0];
  check('incident logged with AI triage', inc.severity === 'high' && inc.host === 'web-1' && inc.ip_malicious_votes === 7 && inc.recommended_actions === 'Block the IP | Check auth logs', inc);
  const mail = r.outputOf('Email the alert');
  check('high alert emailed with action list', mail && /^\[HIGH\] sshd/.test(mail[0].__params.subject) && /- Block the IP\n- Check auth logs/.test(mail[0].__params.message) && /7 VirusTotal engines/.test(mail[0].__params.message), mail && mail[0].__params);
});

scenario(7, W7, {
  id: 'w7privateIp00001', trigger: 'Security alert',
  triggerCode: `return [{ json: { headers: {}, body: { alerts: [{ status: 'firing', labels: { alertname: 'HighCPU', severity: 'critical', instance: '10.0.0.' + (Date.now() % 250) + ':9100' }, annotations: { description: 'CPU at 99% for 10 minutes' } }] } } }];`,
}, (r) => {
  check('private IP not sent to VirusTotal', !r.outputOf('IP reputation (VirusTotal)'));
  const inc = r.outputOf('Log incident')[0];
  check('critical from the tool is kept even if AI says high', inc.severity === 'critical' && inc.source === 'alertmanager', inc);
  check('critical alert emailed', /^\[CRITICAL\] HighCPU/.test(r.outputOf('Email the alert')[0].__params.subject));
});

scenario(7, W7, {
  id: 'w7muteRepeat0001', trigger: 'Security alert',
  triggerCode: `const a = { title: 'Disk almost full', severity: 'low', host: '${MUTE_HOST}' };
return [{ json: { headers: {}, body: { alerts: undefined, ...a } } }];`,
}, (r) => {
  // First delivery of this alert in the current hour: it goes through. (A second run within 30 minutes is muted; see next scenario.)
  check('new alert passes the mute filter', r.outputOf('Normalize and mute repeats').length === 1);
});

scenario(7, W7, {
  id: 'w7muteRepeat0001', trigger: 'Security alert',
  triggerCode: `const a = { title: 'Disk almost full', severity: 'low', host: '${MUTE_HOST}' };
return [{ json: { headers: {}, body: { alerts: undefined, ...a } } }];`,
}, (r) => {
  check('the same alert again is muted (static data persists between executions)', r.outputOf('Normalize and mute repeats').length === 0 && !r.outputOf('Triage with AI'));
});

scenario(7, W7, {
  id: 'w7weekly00000001', trigger: 'Every Monday at 8:00',
  triggerCode: `return [{ json: {} }];`,
  reads: {
    'Read incidents': `() => [
      { received_at: '${daysAgo(1)}', severity: 'high', host: 'web-1', title: 'SSH brute force', status: 'open' },
      { received_at: '${daysAgo(2)}', severity: 'low', host: 'web-1', title: 'Port scan', status: 'closed' },
      { received_at: '${daysAgo(30)}', severity: 'critical', host: 'db', title: 'Old', status: 'open' },
    ]`,
  },
}, (r) => {
  const m = r.outputOf('Email weekly summary')[0].__params;
  check('weekly summary counts last 7 days only', /2 alerts/.test(m.subject) && /Alerts in the last 7 days: 2 \(high: 1, low: 1\)/.test(m.message) && /SSH brute force on web-1/.test(m.message) && !/Old/.test(m.message), m);
});

// --------------------------------------------------------------------------------------------- 8
const W8 = '08-ai-lead-management-assistant';
const gmailFull = (from, name, subject, text, extra = {}) => `{ json: { id: 'msg-${Math.random().toString(36).slice(2, 7)}', threadId: 'thr-1', subject: ${JSON.stringify(subject)}, from: { value: [{ address: ${JSON.stringify(from)}, name: ${JSON.stringify(name)} }], text: ${JSON.stringify(from)} }, text: ${JSON.stringify(text)}, date: new Date().toISOString(), ...${JSON.stringify(extra)} } }`;
scenario(8, W8, {
  id: 'w8email000000001', trigger: 'New enquiry email',
  triggerCode: `return [${gmailFull('ana@acme.io', 'Ana', 'Quote for automations', 'Hello, we need a quote for 3 workflows.\n\nOn Mon, 1 Jan 2026 Bob wrote:\n> old')}];`,
}, (r) => {
  const row = r.outputOf('Log enquiry')[0];
  check('enquiry logged with AI category and priority', row.email === 'ana@acme.io' && row.category === 'quote request' && row.priority === 'high' && row.message === 'Hello, we need a quote for 3 workflows.' && row.source === 'email', row);
  const d = r.outputOf('Draft the reply')[0].__params;
  check('reply drafted in the same thread', d.options.threadId === 'thr-1' && d.options.sendTo === 'ana@acme.io' && d.subject === 'Re: Quote for automations' && /quote today/.test(d.message), d);
  check('team alerted for high priority', /High priority enquiry/.test(r.outputOf('Alert the team')[0].__params.subject));
});
scenario(8, W8, {
  id: 'w8form0000000001', trigger: 'Website form webhook',
  triggerCode: `return [{ json: { headers: {}, body: { name: 'Leo', email: 'leo@shop.fr', company: 'Shop', message: 'Do you do chatbots?' } } }];`,
}, (r) => {
  const row = r.outputOf('Log enquiry')[0];
  check('form enquiry logged', row.source === 'website form' && row.subject === 'Website enquiry from Shop' && row.thread_id === '', row);
  check('draft without thread for form enquiries', r.outputOf('Draft the reply')[0].__params.options.sendTo === 'leo@shop.fr');
});

// --------------------------------------------------------------------------------------------- 9
const W9 = '09-lead-enrichment-qualification';
scenario(9, W9, {
  id: 'w9withSite000001', trigger: 'New lead webhook',
  triggerCode: `return [{ json: { headers: {}, body: { name: 'Ana', email: 'ana@acmehomes.fr', company: 'Acme', message: 'Need more leads' } } }];`,
  code: { 'Read company website': `return $input.all().map((it, i) => ({ json: { data: '<html><script>x()</script><h1>Acme Homes</h1><p>Real estate in Lyon</p></html>' }, pairedItem: { item: i } }));` },
}, (r) => {
  const prep = r.outputOf('Prepare enrichment')[0];
  check('website text read from the email domain', prep.domain === 'acmehomes.fr' && prep.website_read === 'yes' && /Acme Homes Real estate in Lyon/.test(JSON.stringify(prep.request)), prep.website_read);
  const row = r.outputOf('Log lead')[0];
  check('scored, qualified and routed by industry rule', row.fit_score === 82 && row.qualified === 'yes' && row.owner === 'alice@yourbusiness.com', row);
  check('salesperson emailed', r.outputOf('Send to salesperson')[0].__params.sendTo === 'alice@yourbusiness.com');
});
scenario(9, W9, {
  id: 'w9freeMail000001', trigger: 'Lead form',
  triggerCode: `return [{ json: { Name: 'Sam', Email: 'sam@gmail.com', Company: '', Website: '', 'How can we help?': 'Hi' } }];`,
}, (r) => {
  check('no website fetch for free mail', !r.outputOf('Read company website'));
  check('still enriched (from message only)', r.outputOf('Prepare enrichment')[0].website_read === 'no' && r.outputOf('Log lead').length === 1);
});

// --------------------------------------------------------------------------------------------- 10
const W10 = '10-social-media-content-scheduler';
scenario(10, W10, {
  id: 'w10publish000001', trigger: 'Every hour', triggerCode: `return [{ json: {} }];`,
  reads: { 'Read schedule': `() => [
    { post_id: 'P1', publish_at: '${daysAgo(0.01)}', status: 'scheduled', facebook: 'FB', instagram: 'IG', linkedin: 'LI', hashtags: '#x', image_url: 'https://img/1.jpg' },
    { post_id: 'P2', publish_at: '${daysAgo(0.01)}', status: 'idea', facebook: 'not scheduled' },
  ]` },
  stubs: { 'Post to Facebook': { id: '1_2' }, 'Instagram: upload image': { id: '3' }, 'Instagram: publish': { id: '4' }, 'Post to LinkedIn': { urn: 'urn:li:share:9' } },
}, (r) => {
  check('only scheduled posts are published', r.outputOf('Posts due now').length === 1 && r.outputOf('Posts due now')[0].post_id === 'P1');
  const res = r.outputOf('Record publishing')[0];
  check('published and recorded in the Schedule tab', res.status === 'published' && res.__params.sheetName.value === 'Schedule', res);
});

// --------------------------------------------------------------------------------------------- 11
const W11 = '11-review-reputation-monitor';
const placeReviews = `return [{ json: { rating: 4.3, userRatingCount: 120, reviews: [
  { name: 'places/x/reviews/R1-${Date.now()}', rating: 2, text: { text: 'Waited 40 minutes.' }, authorAttribution: { displayName: 'Ann' }, publishTime: '2026-03-01T10:00:00Z' },
  { name: 'places/x/reviews/R2-${Date.now()}', rating: 5, text: { text: 'Great!' }, authorAttribution: { displayName: 'Bo' }, publishTime: '2026-03-02T10:00:00Z' },
] }, pairedItem: { item: 0 } }];`;
scenario(11, W11, {
  id: 'w11reviews000001', trigger: 'Every morning', triggerCode: `return [{ json: {} }];`,
  code: { 'Get Google reviews': placeReviews },
}, (r) => {
  check('two new reviews analysed and logged', r.outputOf('Log review').length === 2 && r.outputOf('Log review')[0].sentiment === 'negative');
  const low = r.outputOf('Alert about low rating');
  check('low rating alert only for the 2-star review', low && low.length === 1 && /^2-star review from Ann/.test(low[0].__params.subject) && /sorry about the wait/i.test(low[0].__params.message), low && low.map((x) => x.__params.subject));
  const d = r.outputOf('Email the digest');
  check('one digest with both reviews', d.length === 1 && /2 new Google review/.test(d[0].__params.subject) && /Average rating: 4.3/.test(d[0].__params.message), d.map((x) => x.__params));
});
scenario(11, W11, {
  id: 'w11reviews000001', trigger: 'Every morning', triggerCode: `return [{ json: {} }];`,
  code: { 'Get Google reviews': placeReviews },
}, (r) => {
  check('the same reviews on the next run are skipped (static data)', r.outputOf('New reviews').length === 0 && !r.outputOf('Analyse with AI'));
});

// --------------------------------------------------------------------------------------------- 12
const W12 = '12-customer-support-ticket-triage';
scenario(12, W12, {
  id: 'w12ticket0000001', trigger: 'New support email',
  triggerCode: `return [${gmailFull('kim@example.com', 'Kim', 'Broken mug', 'My mug arrived broken, I want a refund.')}];`,
}, (r) => {
  const row = r.outputOf('Log ticket')[0];
  check('ticket logged with triage', row.category === 'refund or return' && row.urgency === 'urgent' && row.status === 'new' && row.thread_id === 'thr-1', row);
  check('reply drafted in thread', r.outputOf('Draft the reply')[0].__params.options.threadId === 'thr-1');
  const a = r.outputOf('Alert the person on duty');
  check('urgent ticket alerted', a && /^\[URGENT\] refund or return/.test(a[0].__params.subject), a && a[0].__params.subject);
});

// --------------------------------------------------------------------------------------------- 13
const W13 = '13-ecommerce-order-inventory-sync';
const inventory = `() => [
  { row_number: 2, sku: 'MUG-1', product: 'Mug', stock: 12, low_stock_threshold: 10 },
  { row_number: 3, sku: 'TEE-1', product: 'Tee', stock: 100, low_stock_threshold: 10 },
]`;
scenario(13, W13, {
  id: 'w13shopify000001', trigger: 'New Shopify order',
  triggerCode: `return [{ json: { id: 1, name: '#1001', email: 'c@x.io', total_price: '30.00', currency: 'EUR', created_at: '2026-03-10T09:00:00Z', line_items: [{ sku: 'MUG-1', quantity: 3, title: 'Mug' }, { sku: 'TEE-1', quantity: 1, title: 'Tee' }, { sku: 'GIFT', quantity: 1, title: 'Gift card' }] } }];`,
  reads: { 'Read inventory': inventory },
}, (r) => {
  check('order logged', r.outputOf('Log order')[0].order_id === '#1001' && r.outputOf('Log order')[0].source === 'shopify');
  const u = r.outputOf('Update stock');
  check('stock reduced per SKU, matched on sku', u.length === 2 && u.find((x) => x.sku === 'MUG-1').stock === 9 && u.find((x) => x.sku === 'TEE-1').stock === 99 && u[0].__params.columns.matchingColumns[0] === 'sku', u);
  const a = r.outputOf('Email stock alert');
  check('alert lists low stock and unknown SKU', a && /MUG-1 Mug: 9 left/.test(a[0].__params.message) && /not in the inventory sheet: GIFT/.test(a[0].__params.message), a && a[0].__params.message);
});
scenario(13, W13, {
  id: 'w13woo0000000001', trigger: 'New WooCommerce order',
  triggerCode: `return [{ json: { id: 55, number: '55', billing: { email: 'w@x.io' }, total: '20.00', currency: 'EUR', line_items: [{ sku: 'TEE-1', quantity: 2, name: 'Tee' }] } }];`,
  reads: { 'Read inventory': inventory },
}, (r) => {
  check('woocommerce order handled', r.outputOf('Log order')[0].source === 'woocommerce' && r.outputOf('Update stock')[0].stock === 98);
  check('no alert when stock is fine', !r.outputOf('Email stock alert'));
});

// --------------------------------------------------------------------------------------------- 14
const W14 = '14-abandoned-cart-recovery';
scenario(14, W14, {
  id: 'w14checkout00001', trigger: 'Checkout updated',
  triggerCode: `return [{ json: { token: 'tok1', email: 'ana@example.com', customer: { first_name: 'Ana' }, line_items: [{ quantity: 1, title: 'Mug' }], total_price: '12.00', currency: 'EUR', abandoned_checkout_url: 'https://shop/r/tok1', created_at: '2026-03-10T08:00:00Z' } }];`,
}, (r) => {
  const c = r.outputOf('Save cart')[0];
  check('cart upserted by checkout_id without resetting reminders', c.checkout_id === 'tok1' && !('reminders' in c) && !('status' in c) && c.__params.operation === 'appendOrUpdate', c);
});
scenario(14, W14, {
  id: 'w14order00000001', trigger: 'Order placed',
  triggerCode: `return [{ json: { id: 9, name: '#1009', checkout_token: 'tok1', email: 'ana@example.com' } }];`,
  reads: { 'Read carts (order)': `() => [{ checkout_id: 'tok1', email: 'ana@example.com', status: '' }, { checkout_id: 'tok2', email: 'other@example.com', status: 'open' }]` },
}, (r) => {
  const m = r.outputOf('Mark recovered');
  check('matching cart marked recovered', m.length === 1 && m[0].checkout_id === 'tok1' && m[0].recovered_order === '#1009', m);
});
scenario(14, W14, {
  id: 'w14remind0000001', trigger: 'Every hour', triggerCode: `return [{ json: {} }];`,
  reads: { 'Read carts': `() => [
    { checkout_id: 'tok1', email: 'ana@example.com', first_name: 'Ana', items: '1 x Mug', total: '12', currency: 'EUR', recovery_url: 'https://shop/r/tok1', created_at: '${daysAgo(0.1)}', status: '', reminders: '' },
    { checkout_id: 'tok2', email: 'b@example.com', recovery_url: 'https://shop/r/tok2', created_at: '${daysAgo(0.01)}', status: '', reminders: '' },
    { checkout_id: 'tok3', email: 'c@example.com', recovery_url: 'https://shop/r/tok3', created_at: '${daysAgo(3)}', status: 'recovered', reminders: 1 },
  ]` },
}, (r) => {
  const sent = r.outputOf('Send reminder');
  check('only the cart older than an hour gets a reminder, with the link', sent.length === 1 && sent[0].__params.sendTo === 'ana@example.com' && /https:\/\/shop\/r\/tok1/.test(sent[0].__params.message), sent.map((x) => x.__params));
  const u = r.outputOf('Record reminder')[0];
  check('reminder count recorded', u.checkout_id === 'tok1' && u.reminders === 1 && u.status === 'open', u);
});

// --------------------------------------------------------------------------------------------- 15
const W15 = '15-meeting-notes-task-assistant';
scenario(15, W15, {
  id: 'w15form00000001', trigger: 'Meeting notes form',
  triggerCode: `return [{ json: { 'Meeting title': 'Kickoff', 'Meeting date': '2026-03-10', 'Attendees (emails, comma separated)': 'ana@example.com, bob@example.com', 'Transcript or notes': 'Ana: we start in March. I will send the quote by the 12th.' } }];`,
}, (r) => {
  const mail = r.outputOf('Email the notes')[0].__params;
  check('notes emailed to attendees and the notes address', mail.sendTo === 'ana@example.com,bob@example.com,you@yourbusiness.com' && /Action items\n- Send the quote \(ana@example.com\), due 2026-03-12/.test(mail.message), mail);
  const t = r.outputOf('Add tasks');
  check('one task row per action item', t.length === 2 && t[0].task === 'Send the quote' && t[0].meeting === 'Kickoff' && t[1].owner === '', t);
});

// --------------------------------------------------------------------------------------------- 16
const W16 = '16-invoice-receipt-data-extraction';
scenario(16, W16, {
  id: 'w16drive00000001', trigger: 'Watch the inbox folder',
  triggerCode: `return [{ json: { id: 'f1', name: 'facture.pdf' } }, { json: { id: 'f2', name: 'notes.txt' } }];`,
  code: { 'Download file': `const out = [];
for (const [i, item] of $input.all().entries()) {
  const isPdf = item.json.name.endsWith('.pdf');
  const data = await this.helpers.prepareBinaryData(Buffer.from(isPdf ? '${PDF}' : 'aGVsbG8=', 'base64'), item.json.name, isPdf ? 'application/pdf' : 'text/plain');
  out.push({ json: item.json, binary: { data }, pairedItem: { item: i } });
}
return out;` },
}, (r) => {
  check('only the PDF is processed', r.outputOf('Supported files').length === 1);
  const row = r.outputOf('Log in sheet')[0];
  check('logged with drive link and source', row.source === 'drive' && row.drive_link === 'https://drive.google.com/file/d/f1/view' && row.status === 'ok' && row.supplier_name === 'Acme Ltd', row);
  const mv = r.outputOf('Move to processed')[0].__params;
  check('file moved to the processed folder', mv.fileId.value === 'f1' && mv.folderId.value === 'YOUR_PROCESSED_FOLDER_ID', mv);
});

// --------------------------------------------------------------------------------------------- 18
const W18 = '18-website-uptime-incident-notifier';
const SITE = 'https://site-' + Date.now() + '.example';
const SHOP = 'https://shop-' + Date.now() + '.example';
// The three checks run the same workflow, so its static data (failure counts) carries over like in production.
const uptime = (key, code) => scenario(18, W18, {
  id: 'w18uptime0000001', trigger: 'Every 5 minutes', triggerCode: `return [{ json: {} }];`,
  settings: { sites: `${SITE}\n${SHOP} | Add to cart` },
  code: { 'Check site': code },
}, (r) => { results[key] = r; });
const results = {};
const down = `return $input.all().map((it, i) => ({ json: i === 0 ? { statusCode: 503, body: 'Service Unavailable' } : { statusCode: 200, body: 'Add to cart' }, pairedItem: { item: i } }));`;
uptime('w18check00000001', down);
uptime('w18check00000002', down);
uptime('w18check00000003', `return $input.all().map((it, i) => ({ json: { statusCode: 200, body: i === 0 ? 'ok' : 'Add to cart' }, pairedItem: { item: i } }));`);
if (results.w18check00000001) {
  check('first failure is not reported yet', !results.w18check00000001.outputOf('Email the alert'));
  const a2 = results.w18check00000002.outputOf('Email the alert');
  check('second failure in a row: DOWN alert and incident', a2 && a2.length === 1 && a2[0].__params.subject === 'DOWN: ' + SITE && /HTTP 503/.test(a2[0].__params.message), a2 && a2.map((x) => x.__params.subject));
  const a3 = results.w18check00000003.outputOf('Email the alert');
  check('recovery reported', a3 && a3.length === 1 && a3[0].__params.subject === 'RECOVERED: ' + SITE, a3 && a3.map((x) => x.__params.subject));
}

// --------------------------------------------------------------------------------------------- 19
const W19 = '19-phishing-email-analyzer';
scenario(19, W19, {
  id: 'w19phish00000001', trigger: 'Reported email',
  triggerCode: `return [${gmailFull('emp@corp.com', 'Emp', 'Fwd: Your mailbox is full', '---------- Forwarded message ---------\nFrom: IT Support <it@micros0ft-help.com>\nClick https://micros0ft-help.com/fix now or lose access.')}];`,
  code: { 'Link reputation (VirusTotal)': `return $input.all().map((it, i) => ({ json: { data: { attributes: { last_analysis_stats: { malicious: 6, suspicious: 1 } } } }, pairedItem: { item: i } }));` },
}, (r) => {
  check('the link was checked on VirusTotal with its URL id', r.outputOf('Links to check')[0].vt_id === Buffer.from('https://micros0ft-help.com/fix').toString('base64url'));
  const row = r.outputOf('Log report')[0];
  check('malicious link forces a phishing verdict', row.verdict === 'phishing' && row.malicious_links === 'https://micros0ft-help.com/fix' && row.claimed_sender === 'IT Support <it@micros0ft-help.com>', row);
  const reply = r.outputOf('Answer the employee')[0].__params;
  check('employee gets the verdict and advice', reply.sendTo === 'emp@corp.com' && /\[PHISHING\]/.test(reply.subject) && /Do not click/.test(reply.message), reply);
  const alert = r.outputOf('Alert the security team');
  check('security team alerted with actions', alert && /- Block the sender domain/.test(alert[0].__params.message), alert && alert[0].__params);
});
scenario(19, W19, {
  id: 'w19nolink0000001', trigger: 'Reported email',
  triggerCode: `return [${gmailFull('emp2@corp.com', 'Emp2', 'Fwd: Invoice', 'From: Supplier <billing@supplier.com>\nPlease pay the attached invoice today.')}];`,
}, (r) => {
  check('report without links skips VirusTotal and is still judged', !r.outputOf('Link reputation (VirusTotal)') && r.outputOf('Log report')[0].links_checked === 0 && r.outputOf('Log report')[0].verdict === 'suspicious');
});

// --------------------------------------------------------------------------------------------- 20
const W20 = '20-website-security-ssl-scanner';
const goodHeaders = { 'strict-transport-security': 'max-age=63072000', 'content-security-policy': "default-src 'self'; frame-ancestors 'none'", 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin', 'permissions-policy': 'camera=()' };
const certFor = (host, days) => JSON.stringify([{ name_value: host, not_after: new Date(Date.now() + days * 86400000).toISOString().slice(0, 19) }]);
scenario(20, W20, {
  id: 'w20form00000001', trigger: 'Scan a website',
  triggerCode: `return [{ json: { Website: 'acme.example', 'Email for the report': 'owner@acme.example' } }];`,
  code: {
    'HTTPS response': `return $input.all().map((it, i) => ({ json: { statusCode: 200, headers: ${JSON.stringify(goodHeaders)}, body: '<html>' }, pairedItem: { item: i } }));`,
    'HTTP redirect': `return $input.all().map((it, i) => ({ json: { statusCode: 301, headers: { location: 'https://acme.example/' }, body: '' }, pairedItem: { item: i } }));`,
    'Certificates (crt.sh)': `return $input.all().map((it, i) => ({ json: { data: ${JSON.stringify(certFor('acme.example', 60))} }, pairedItem: { item: i } }));`,
  },
}, (r) => {
  check('form URL normalized to https', r.outputOf('Sites to scan')[0].url === 'https://acme.example' && r.outputOf('Sites to scan')[0].host === 'acme.example');
  const g = r.outputOf('Grade')[0];
  check('good site graded A', g.grade === 'A' && g.cert_days_left >= 59, g);
  const mail = r.outputOf('Email the report')[0].__params;
  check('report emailed to the requester', mail.sendTo === 'owner@acme.example' && /acme.example A/.test(mail.subject), mail);
  check('scan logged with requester', r.outputOf('Log scans')[0].requested_by === 'owner@acme.example');
});
scenario(20, W20, {
  id: 'w20weekly0000001', trigger: 'Every Monday at 7:00', triggerCode: `return [{ json: {} }];`,
  settings: { sites: 'https://good.example\nhttps://old.example' },
  code: {
    'HTTPS response': `return $input.all().map((it, i) => ({ json: i === 0 ? { statusCode: 200, headers: ${JSON.stringify(goodHeaders)} } : { statusCode: 200, headers: { server: 'Apache/2.2.15' } }, pairedItem: { item: i } }));`,
    'HTTP redirect': `return $input.all().map((it, i) => ({ json: i === 0 ? { statusCode: 301, headers: { location: 'https://good.example/' } } : { statusCode: 200, headers: {} }, pairedItem: { item: i } }));`,
    'Certificates (crt.sh)': `return $input.all().map((it, i) => ({ json: { data: i === 0 ? ${JSON.stringify(certFor('good.example', 90))} : ${JSON.stringify(certFor('old.example', 5))} }, pairedItem: { item: i } }));`,
  },
}, (r) => {
  const g = r.outputOf('Grade');
  check('each site graded on its own responses', g.length === 2 && g[0].grade === 'A' && g[1].grade === 'F' && g[1].cert_days_left <= 5, g.map((x) => [x.url, x.grade, x.cert_days_left]));
  const mail = r.outputOf('Email the report');
  check('one weekly report, certificate warning first', mail.length === 1 && mail[0].__params.sendTo === 'it@yourcompany.com' && /^Certificate expiring soon/.test(mail[0].__params.subject) && /\[high\] Certificate valid/.test(mail[0].__params.message), mail.map((x) => x.__params.subject));
});

// --------------------------------------------------------------------------------------------- 21
const W21 = '21-vulnerability-watch-cve-kev';
const kevStub = `return [{ json: { vulnerabilities: [
  { cveID: 'CVE-2026-1001', vendorProject: 'Fortinet', product: 'FortiOS', vulnerabilityName: 'FortiOS SSL-VPN RCE', dateAdded: new Date().toISOString().slice(0, 10), shortDescription: 'Heap overflow allows remote code execution.', requiredAction: 'Apply updates per vendor instructions.', dueDate: '2026-11-20', knownRansomwareCampaignUse: 'Known' },
  { cveID: 'CVE-2020-0001', vendorProject: 'Fortinet', product: 'FortiOS', vulnerabilityName: 'Old one', dateAdded: '2021-11-03' },
] }, pairedItem: { item: 0 } }];`;
const nvdStub = `return [{ json: { vulnerabilities: [
  { cve: { id: 'CVE-2026-2002', descriptions: [{ lang: 'en', value: 'A race condition in OpenSSH sshd allows unauthenticated RCE.' }], metrics: { cvssMetricV31: [{ cvssData: { baseScore: 8.1, baseSeverity: 'HIGH' } }] } } },
  { cve: { id: 'CVE-2026-2003', descriptions: [{ lang: 'en', value: 'Unrelated product flaw.' }], metrics: { cvssMetricV31: [{ cvssData: { baseScore: 9.8, baseSeverity: 'CRITICAL' } }] } } },
] }, pairedItem: { item: 0 } }];`;
const VULN_ID = ('w21' + Date.now().toString(36) + '0000000000').slice(0, 16);
const vulnRun = () => ({ id: VULN_ID, trigger: 'Every morning', triggerCode: `return [{ json: {} }];`, code: { 'Exploited vulnerabilities (CISA KEV)': kevStub, 'New CVEs (NVD)': nvdStub } });
scenario(21, W21, vulnRun(), (r) => {
  const v = r.outputOf('Relevant vulnerabilities')[0].vulns;
  check('exploited Fortinet CVE and high OpenSSH CVE matched, old and unrelated skipped', v.map((x) => x.cve).join() === 'CVE-2026-1001,CVE-2026-2002', v.map((x) => x.cve));
  const mail = r.outputOf('Email the advisory')[0].__params;
  check('advisory flags exploited first with what to do', /^\[ACTION\] 1 exploited/.test(mail.subject) && /EXPLOITED IN THE WILD/.test(mail.message) && /Apply the FortiOS patch/.test(mail.message), mail.subject);
  check('both CVEs logged', r.outputOf('Log vulnerabilities').length === 2);
});
scenario(21, W21, vulnRun(), (r) => {
  check('next day: same CVEs are not reported again', r.outputOf('Relevant vulnerabilities').length === 0 && !r.outputOf('Email the advisory'));
});

// --------------------------------------------------------------------------------------------- 22
const W22 = '22-data-breach-monitor';
const hibpStub = `return $input.all().map((it, i) => ({ json: it.json.email === 'ceo@yourcompany.com'
  ? { statusCode: 200, body: JSON.stringify([{ Name: 'Adobe-${Date.now()}', Title: 'Adobe', Domain: 'adobe.com', BreachDate: '2013-10-04', AddedDate: '2013-12-04', DataClasses: ['Email addresses', 'Passwords'], IsVerified: true }]) }
  : { statusCode: 404, body: '' }, pairedItem: { item: i } }));`;
scenario(22, W22, {
  id: 'w22breach0000001', trigger: 'Every Monday at 8:15', triggerCode: `return [{ json: {} }];`,
  code: { 'Have I Been Pwned': hibpStub },
}, (r) => {
  check('three addresses checked', r.outputOf('Emails to check').length === 3);
  const rows = r.outputOf('Log breaches');
  check('only the breached address logged, with advice', rows.length === 1 && rows[0].email === 'ceo@yourcompany.com' && rows[0].passwords === true && /Change the password/.test(rows[0].advice), rows);
  check('people not notified when the option is off', !r.outputOf('Notify the person'));
  const mail = r.outputOf('Email the security team')[0].__params;
  check('security team summary', /1 new breach\(es\) affecting 1 address\(es\), passwords exposed/.test(mail.subject), mail.subject);
});
scenario(22, W22, {
  id: 'w22notify0000001', trigger: 'Every Monday at 8:15', triggerCode: `return [{ json: {} }];`, settings: { notifyPeople: true },
  code: { 'Have I Been Pwned': hibpStub.replace('Adobe-', 'Adobe2-') },
}, (r) => {
  const n = r.outputOf('Notify the person');
  check('affected person notified when the option is on', n && n.length === 1 && n[0].__params.sendTo === 'ceo@yourcompany.com' && /Adobe/.test(n[0].__params.subject), n && n[0].__params);
});

// --------------------------------------------------------------------------------------------- 23
const W23 = '23-lookalike-domain-monitor';
scenario(23, W23, {
  id: 'w23domains000001', trigger: 'Every day', triggerCode: `return [{ json: {} }];`,
  settings: { brandDomains: 'acme.com', searchTerms: 'acme', allowlist: 'acme-partner.com' },
  code: { 'Certificate logs (crt.sh)': `return [{ json: { data: JSON.stringify([
    { name_value: 'acme.com\\nwww.acme.com' }, { name_value: 'acme-login-${Date.now()}.net' }, { name_value: 'shop.acme-partner.com' }, { name_value: 'acme${Date.now()}.shop' },
  ]) }, pairedItem: { item: 0 } }];` },
}, (r) => {
  const rows = r.outputOf('Log domains');
  check('own and allowlisted domains ignored, lookalikes logged', rows.length === 2 && rows.every((x) => !/^(www\.)?acme\.com$|partner/.test(x.domain)), rows.map((x) => x.domain));
  check('login lookalike is high risk', rows.find((x) => x.domain.startsWith('acme-login')).risk === 'high');
  check('alert emailed', /2 new lookalike domain\(s\), 1 high risk/.test(r.outputOf('Email the alert')[0].__params.subject));
});

console.log(`\n${passed} checks passed, ${failed} failed`);
mock.kill();
process.exit(failed ? 1 : 0);
