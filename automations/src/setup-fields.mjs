// Plain-language setup form for every value in the workflows' Settings nodes.
// Each workflow's form (setup.json) is built from these entries by setup.mjs, in the order of its Settings node.
//
//   label     what the customer sees
//   help      one or two sentences, with an example; written for people who are not technical
//   type      text | textarea | email | url | number | boolean
//   required  must be filled before downloading
//   keep      true: use the workflow's value as the pre-filled default (sensible defaults);
//             otherwise the workflow's value is only a placeholder and the field starts empty
//   min/max   for numbers
//   hidden    technical values the customer never needs to change; the workflow keeps its default
//
// Hidden values that need to be unique per customer (metaVerifyToken) are generated at download time.

export const FIELDS = {
  // ---- about the business
  businessName: { label: "Business name", help: "As your customers know it. Example: Ranime Jemal Agency", type: "text", required: true },
  businessDescription: { label: "What your business does", help: "One or two sentences the AI uses to write in your name. Example: We build AI automations for small businesses in France and Tunisia.", type: "textarea", required: true },
  idealCustomer: { label: "Your ideal customer", help: "Who is a good fit: industry, size, need, budget. Example: Real-estate agencies with 5 to 50 agents that want more qualified buyers.", type: "textarea", required: true },
  organisationName: { label: "Company name", help: "Used in the reports and alerts. Example: Acme SARL", type: "text", required: true },
  storeName: { label: "Shop name", help: "As it appears on your website. Example: Maison Lina", type: "text", required: true },
  teamName: { label: "Team name", help: "Shown at the top of the meeting notes. Example: Sales team", type: "text", required: true },
  senderName: { label: "Sender name on emails", help: "The name people see in their inbox. Example: Sarah from Maison Lina", type: "text", required: true },

  // ---- emails
  teamEmail: { label: "Your team's email", help: "Where alerts and copies are sent. Example: hello@yourbusiness.com", type: "email", required: true },
  approverEmail: { label: "Who approves the posts", help: "This person gets the drafts to approve before anything is published.", type: "email", required: true },
  alertEmail: { label: "Email for alerts", help: "Where urgent alerts are sent. Use an address someone reads every day.", type: "email", required: true },
  contactEmail: { label: "Contact email shown in replies", help: "Customers are invited to write here when a review needs a follow-up.", type: "email", required: true },
  urgentEmail: { label: "Email for urgent tickets", help: "The person or inbox on duty for urgent customer problems.", type: "email", required: true },
  notesEmail: { label: "Send the notes to", help: "The meeting notes are emailed here (you can forward them to the attendees).", type: "email", required: true },
  securityTeamEmail: { label: "Security contact email", help: "The person or team who handles security problems.", type: "email", required: true },
  reportEmail: { label: "Send the reports to", help: "Where the weekly security report is emailed.", type: "email", required: true },
  defaultOwner: { label: "Default salesperson email", help: "Qualified leads that match no routing rule are sent here.", type: "email", required: true },

  // ---- Google
  googleSheetUrl: { label: "Google Sheet link", help: "Create an empty Google Sheet, add the tabs from the guide, then copy the link from your browser's address bar and paste it here.", type: "url", required: true },
  driveFolderId: { label: "Google Drive folder ID (filed documents)", help: "Open the folder in Google Drive and copy the last part of the link, after /folders/. Example: 1AbCdEfGhIjKlMnOp", type: "text", required: true },
  processedFolderId: { label: "Google Drive folder ID (processed documents)", help: "Open the folder where finished documents should go and copy the last part of the link, after /folders/.", type: "text", required: true },
  calendarId: { label: "Google Calendar to use", help: "Leave \"primary\" to use your main calendar. For another calendar: Google Calendar, Settings, the calendar, Integrate calendar, Calendar ID.", type: "text", required: true, keep: true },
  googlePlaceId: { label: "Google Place ID of your business", help: "Search your business on Google's \"Place ID Finder\" page and copy the ID it shows. Example: ChIJN1t_tDeuEmsRUsoyG83frY4", type: "text", required: true },

  // ---- lead generation and sales
  bookingLink: { label: "Booking link", help: "Where leads book a call with you, e.g. your Calendly or Google Calendar booking page.", type: "url", required: true },
  autoSendReplies: { label: "Send the first reply automatically", help: "On: the AI's reply is sent right away. Off: it is saved as a Gmail draft for you to check first (recommended for the first days).", type: "boolean", keep: true },
  followUpDays: { label: "Days between follow-ups", help: "How long to wait before reminding a lead who has not answered.", type: "number", keep: true, min: 1, max: 30 },
  maxFollowUps: { label: "Maximum follow-ups per lead", help: "After this many reminders, the lead is left alone.", type: "number", keep: true, min: 0, max: 10 },
  minFitScore: { label: "Minimum fit score (0 to 100)", help: "Leads scoring at least this are sent to a salesperson. 60 is a good start.", type: "number", keep: true, min: 0, max: 100 },
  routingRules: { label: "Who gets which leads", help: "One rule per line: a keyword, then = and the salesperson's email. Example: real estate = alice@yourbusiness.com. Leave empty to send every qualified lead to the default salesperson.", type: "textarea" },
  categories: { label: "Categories to sort into", help: "Separated by commas. Example: quote request, product question, support, partnership", type: "textarea", required: true, keep: true },

  // ---- customer service and support
  openingHours: { label: "Opening hours", help: "Example: Monday to Friday, 9:00 to 18:00", type: "text", required: true, keep: true },
  contactDetails: { label: "How customers can reach a person", help: "Email and/or phone the chatbot gives when it hands over. Example: support@yourbusiness.com, +216 00 000 000", type: "text", required: true },
  tone: { label: "Tone of the answers", help: "Example: friendly, short and clear", type: "text", keep: true },
  policies: { label: "Your policies", help: "Returns, refunds, delivery, warranty: the AI uses them to draft correct replies. Example: Returns within 30 days. Delivery in 2 to 4 days.", type: "textarea", required: true },
  replyTone: { label: "Tone of review replies", help: "Example: warm, professional, short", type: "text", keep: true },
  lowRating: { label: "Alert me for reviews of this many stars or fewer", help: "You get an email at once for these. 3 is a good start.", type: "number", keep: true, min: 1, max: 5 },

  // ---- booking
  services: { label: "Your services and their length", help: "Separated by commas. Example: Haircut (45 min), Colour (90 min), Consultation (30 min)", type: "textarea", required: true },
  address: { label: "Address", help: "Given to customers when they book.", type: "text", required: true },
  timezone: { label: "Time zone", help: "Example: Africa/Tunis, Europe/Paris, Europe/London, America/New_York", type: "text", required: true, keep: true },
  openDays: { label: "Open days", help: "Example: Monday to Saturday", type: "text", required: true, keep: true },
  openTime: { label: "Opening time", help: "24-hour format. Example: 09:00", type: "text", required: true, keep: true },
  closeTime: { label: "Closing time", help: "24-hour format. Example: 18:00", type: "text", required: true, keep: true },
  slotMinutes: { label: "Length of an appointment (minutes)", help: "Example: 30 or 60", type: "number", keep: true, min: 5, max: 480 },
  reminderHoursBefore: { label: "Send the reminder this many hours before", help: "24 means the day before.", type: "number", keep: true, min: 1, max: 168 },

  // ---- social media
  brandVoice: { label: "Your brand's voice", help: "How you talk to customers. Example: warm, confident, no jargon", type: "text", keep: true },
  language: { label: "Language", help: "Example: English, French, Arabic", type: "text", keep: true },
  defaultCallToAction: { label: "Default call to action", help: "Added at the end of posts when nothing else is planned. Example: Book your free consultation today.", type: "text", keep: true },
  facebookPageId: { label: "Facebook Page ID", help: "On your Facebook Page: About, Page transparency, Page ID. Leave empty if you do not post on Facebook.", type: "text" },
  instagramAccountId: { label: "Instagram business account ID", help: "In Meta Business Suite: Settings, Instagram accounts. Leave empty if you do not post on Instagram.", type: "text" },
  linkedinOrganizationId: { label: "LinkedIn company page ID", help: "The number in your company page's admin link (linkedin.com/company/12345678/admin). Leave empty if you do not post on LinkedIn.", type: "text" },
  daysAhead: { label: "Plan posts this many days ahead", help: "Every Monday the AI writes the posts planned for the coming days.", type: "number", keep: true, min: 1, max: 31 },
  generateImages: { label: "Create an AI image for each post", help: "On: posts without a picture get one made by AI.", type: "boolean", keep: true },
  imageStyle: { label: "Style of the AI images", help: "Example: clean, modern, bright photo with natural light", type: "text", keep: true },
  autoReply: { label: "Reply to comments and messages automatically", help: "On: simple questions get an AI reply at once; complaints always come to you. Off: every reply waits for your approval.", type: "boolean", keep: true },
  replyKnowledge: { label: "What the AI may tell customers", help: "Opening hours, prices, delivery, services, booking link: anything customers often ask.", type: "textarea", required: true },

  // ---- documents
  // ---- security
  muteRepeatsMinutes: { label: "Ignore repeats of the same alert for (minutes)", help: "Stops the same alert from flooding your inbox. 30 is a good start.", type: "number", keep: true, min: 0, max: 1440 },
  sites: { label: "Websites to check", help: "One per line. To also check that a page shows some text, add | and the text. Example: https://www.yourshop.com | Add to cart", type: "textarea", required: true },
  confirmFailures: { label: "Failed checks before alerting", help: "2 avoids false alarms from a single slow response.", type: "number", keep: true, min: 1, max: 10 },
  certWarningDays: { label: "Warn this many days before a certificate expires", help: "21 days gives you time to renew.", type: "number", keep: true, min: 1, max: 90 },
  environment: { label: "Your IT environment", help: "What you use, in plain words. Example: Microsoft 365, Windows laptops, a FortiGate firewall, a WordPress website.", type: "textarea", required: true },
  watchlist: { label: "Products to watch", help: "One per line: the software and devices you use. Example: fortigate, wordpress, windows server", type: "textarea", required: true },
  minCvss: { label: "Minimum severity (0 to 10)", help: "New vulnerabilities below this score are ignored. 7 means high and critical only.", type: "number", keep: true, min: 0, max: 10 },
  emails: { label: "Email addresses to check", help: "One per line: your team's work addresses.", type: "textarea", required: true },
  notifyPeople: { label: "Also tell each person when their address is found", help: "On: each person gets a short, friendly email with what to do.", type: "boolean", keep: true },
  brandDomains: { label: "Your domain names", help: "One per line. Example: yourcompany.com", type: "textarea", required: true },
  searchTerms: { label: "Brand words to look for", help: "One per line: the words someone would put in a fake domain. Example: yourcompany", type: "textarea", required: true },
  allowlist: { label: "Domains that are yours or trusted", help: "One per line. These are never reported.", type: "textarea" },

  // ---- e-commerce
  firstDelayHours: { label: "First reminder after (hours)", help: "How long after the cart was left. 1 is a good start.", type: "number", keep: true, min: 1, max: 72 },
  repeatHours: { label: "Then every (hours)", help: "Time between the next reminders.", type: "number", keep: true, min: 1, max: 168 },
  maxReminders: { label: "Maximum reminders per cart", help: "2 is enough for most shops.", type: "number", keep: true, min: 1, max: 5 },
  discountCode: { label: "Discount code (optional)", help: "Offered from the second reminder. Create it in Shopify first. Leave empty for no discount.", type: "text" },
  discountText: { label: "What the discount gives", help: "Example: 10% off your order", type: "text", keep: true },

  // ---- hidden technical values
  openAiModel: { hidden: true },
  openAiBaseUrl: { hidden: true },
  imageModel: { hidden: true },
  minImageKb: { hidden: true },
  metaVerifyToken: { hidden: true, generate: "token" },
};

// Where the same Settings value means something different in one workflow, that workflow's wording wins.
export const OVERRIDES = {
  "ai-voice-receptionist": {
    openDays: { help: "Day numbers separated by commas: 1 = Monday, 2 = Tuesday … 7 = Sunday. Example: 1,2,3,4,5 for Monday to Friday." },
  },
  "website-security-ssl-scanner": {
    sites: { help: "One website per line. Example: https://www.yourcompany.com" },
  },
};

/** Settings key (camelCase) to form key (snake_case), as the marketplace's form format requires. */
export const formKey = (name) => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
