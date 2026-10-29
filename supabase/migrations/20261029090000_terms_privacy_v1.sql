-- Terms of Service and Privacy Policy, version 1.0 (draft for legal review), as written by the owner.
-- The previous placeholder versions stay in the table for the record; only the current flag moves.

update agreements set is_current = false where kind in ('terms', 'privacy') and is_current;

insert into agreements (kind, version, title, body, is_current) values
('privacy', '1.0-draft', 'Privacy Policy', $doc$Last updated: 29 October 2026.


## 1. Introduction
Ranime Jemal Agency ("we," "us," or "our") operates the AI Automation Marketplace available at:
https://rja-wd2u.vercel.app/
This Privacy Policy explains how we collect, use, store, disclose, and protect personal information when you visit our website, create an account, purchase an automation, sell products, or interact with our services.
The Platform connects buyers with digital automation products, including AI-powered workflows, n8n templates, and related services. It also allows approved independent creators to offer products for sale.
We aim to collect only the information reasonably necessary to operate the Platform, provide requested services, protect users, and meet applicable legal obligations.
Please read this policy carefully.

## 2. Who Is Responsible for Your Information?
The entity responsible for operating the Platform is:
Business name: Ranime Jemal Agency
Legal operator: [Insert the full legal name of the individual or registered legal entity]
Email: ranimejmal@gmail.com
Phone: +216 97 017 061
Website: https://rja-wd2u.vercel.app/
Business address: [Insert business address, if required]
For privacy questions, data-access requests, or concerns about how your information is used, contact us using the details above.
Where another organization independently determines how it processes your personal information, that organization may have its own responsibilities and privacy policy.

## 3. Personal Information We May Collect
The information we collect depends on how you use the Platform.

### 3.1 Account Information
When you create an account, we may collect:
- Name or display name.
- Email address.
- Username.
- Password-related authentication information.
- Account role and preferences.
- Account creation date.
- Account status and security records.
We should not store passwords in plain text. Authentication information must be handled using appropriate security measures.

### 3.2 Buyer Information
When you purchase or access a product, we may collect:
- Order and transaction references.
- Purchased products and applicable licenses.
- Purchase date and payment status.
- Billing information required for the transaction.
- Download and product-access records.
- Support requests and communications.
- Product reviews and feedback.
Payment-card details are handled by the applicable payment provider where the payment integration is designed to keep those details outside our systems.
The precise information processed depends on the selected payment method.

### 3.3 Seller Information
If you apply to sell products on the Platform, we may collect:
- Creator or business name.
- Contact details.
- Seller profile and biography.
- Product listings and portfolio information.
- Seller application and verification status.
- Agreement acceptance records.
- Sales, commissions, and payout records.
- Information required for applicable tax, fraud-prevention, or payment-provider checks.
Identity documents, banking details, and other sensitive verification information should be collected only when necessary and through an appropriate secure process.
Where a payment provider performs identity verification, it may process the relevant information under its own privacy policy.

### 3.4 Technical and Usage Information
When you access the Platform, certain technical information may be collected, depending on our hosting, analytics, and security configuration.
This may include:
- IP address.
- Browser and device information.
- Operating system.
- Approximate location derived from technical information.
- Pages visited and interactions.
- Login timestamps.
- Error reports.
- Security and fraud-prevention logs.
We use such information only for appropriate purposes, including operating the website, diagnosing technical issues, protecting accounts, and understanding how the Platform is used.

### 3.5 Communications
If you contact us, we may retain the information you provide, including your email address, message content, attachments, and relevant support history.
We use this information to respond to your request and maintain appropriate records.

### 3.6 Product and Automation Information
When you purchase or configure an automation, the Platform may store product settings and configuration information that you choose to provide.
Depending on the product, this may include:
- Business name.
- Business contact information.
- Integration preferences.
- Workflow configuration settings.
- Technical compatibility information.
- Installation or support information.
We aim to avoid collecting passwords, API secrets, private keys, or other sensitive credentials through ordinary configuration forms.
If a feature requires credentials or access to external services, the relevant feature must explain how that information is handled before you connect the service.
**Important:** Unless we explicitly provide a hosted automation service with appropriate safeguards, the Platform does not automatically receive every piece of information processed by a workflow you download and run in your own environment. Information may nevertheless be transmitted directly to third-party services according to the workflow's configuration.
You should review a workflow's data flows before using it.

## 4. How We Use Personal Information
We may use personal information for the following purposes:

### Account Management
- Create and maintain user accounts.
- Authenticate users.
- Manage account preferences and roles.
- Provide account-related communications.

### Purchases and Delivery
- Process orders.
- Confirm payment status.
- Provide access to purchased products.
- Maintain transaction and license records.
- Handle refunds and disputes.

### Seller Services
- Review seller applications.
- Manage product listings.
- Calculate commissions and record earnings.
- Administer payouts where supported.
- Communicate with creators about their products.

### Customer Support
- Respond to inquiries.
- Investigate reported issues.
- Provide technical support where included.
- Manage complaints and refund requests.

### Security and Fraud Prevention
- Detect suspicious activity.
- Investigate unauthorized access.
- Protect accounts and files.
- Enforce our Terms of Service.
- Maintain appropriate audit records.

### Platform Improvement
- Diagnose errors.
- Improve website usability.
- Understand product and feature performance.
- Develop new services.
Where analytics or similar technologies require consent under applicable law, we will obtain the appropriate consent before using them.

### Marketing
We may send service-related messages necessary for account management, purchases, security, and support.
We will send promotional communications only where we have an appropriate legal basis and any consent required by applicable law.
You may unsubscribe from promotional emails using the available unsubscribe mechanism or by contacting us.
Unsubscribing from marketing does not prevent us from sending essential transactional or security messages.

### Legal Compliance
We may process information when reasonably necessary to meet legal obligations, respond to lawful requests, establish or defend legal claims, or protect users and our legitimate interests, subject to applicable law.

## 5. Legal Basis for Processing
Where applicable data-protection law requires a legal basis for processing, we will rely on an appropriate basis for each activity.
Depending on the circumstances, this may include:
- **Contract:** Processing needed to create your account, fulfill a purchase, or provide a requested service.
- **Legal obligation:** Processing required by applicable laws or lawful regulatory requirements.
- **Consent:** Processing based on your freely given consent, where required or appropriate.
- **Legitimate interests:** Processing necessary for purposes such as website security, fraud prevention, or service improvement, where permitted and where your rights do not override those interests.
Where consent is the basis for processing, you may withdraw it subject to applicable law. Withdrawal does not invalidate processing that lawfully occurred before withdrawal.
Applicable legal bases and procedures will be finalized according to the laws governing the Platform and the locations of its users.

## 6. Cookies and Similar Technologies
The Platform may use cookies or similar technologies to:
- Maintain login sessions.
- Remember preferences.
- Support security features.
- Improve website functionality.
- Measure website usage.
- Support analytics or marketing, where enabled.
Strictly necessary technologies may be required for the website to function.
Where applicable law requires consent for non-essential cookies or similar technologies, we will request consent before activating them.
You may be able to manage cookies through your browser settings or the Platform's cookie preferences, where available.
Blocking certain cookies may affect some website features.
The actual cookie practices will depend on the technologies implemented on the Platform.

## 7. When We Share Personal Information
We do not sell personal information to third parties as a standalone data product.
We may disclose information to the following categories of recipients where necessary and lawful.

### Service Providers
We may use service providers to support:
- Website hosting and infrastructure.
- Database and file storage.
- Authentication.
- Payment processing.
- Transactional email.
- Security and monitoring.
- Customer support.
- Analytics, where enabled.
These providers may process information on our behalf according to the applicable arrangements and legal requirements.

### Independent Creators
When you purchase a third-party product, the relevant creator may receive limited information necessary to fulfill the transaction or provide the support described in the listing.
This may include a transaction reference, product details, or information you voluntarily provide through a support request.
We aim to avoid sharing unnecessary buyer information with creators.
Creators must handle any personal information they receive lawfully and only for appropriate purposes.

### Payment Providers
Payment providers may process transaction information, payment details, and relevant verification data to complete payments, prevent fraud, or comply with their obligations.
Their processing is governed by their own applicable terms and privacy policies.

### Legal and Security Disclosures
We may disclose information when reasonably necessary to:
- Comply with applicable law or a valid legal request.
- Protect the rights, safety, and security of users.
- Investigate suspected fraud or unlawful activity.
- Establish or defend legal claims.
- Enforce our agreements.

### Business Transfers
If the Platform or its operating business is involved in a merger, restructuring, sale, or transfer, relevant information may be transferred as part of that transaction, subject to appropriate safeguards and applicable law.

## 8. International Data Transfers
Some service providers may store or process information outside Tunisia or outside your country of residence.
Where personal information is transferred internationally, we will take the steps required by the applicable law, including any required authorizations, declarations, safeguards, or other legal formalities.
We will not assume that using a well-known cloud provider automatically makes every international data transfer lawful.
The countries involved and the applicable safeguards depend on the providers actually used by the Platform.
If applicable law requires additional information or consent regarding a transfer, we will provide it through the appropriate process.

## 9. Data Retention
We retain personal information only for as long as reasonably necessary for the purposes described in this policy, subject to applicable law.
Retention periods may differ by information category.
Examples include:
- **Account information:** While the account remains active and for an appropriate period afterward where necessary.
- **Order and financial records:** For the period required by applicable accounting, tax, payment, and legal obligations.
- **Support communications:** For the period needed to resolve requests and maintain appropriate records.
- **Security logs:** For a period appropriate to security monitoring and incident investigation.
- **Seller and agreement records:** For the period needed to administer seller relationships and address legal or financial claims.
- **Marketing preferences:** Until consent is withdrawn or the information is no longer needed, subject to applicable requirements.
When information is no longer necessary, we will delete, anonymize, or otherwise handle it in accordance with applicable law and our retention procedures.
Some records may need to be retained after account closure where legally required or necessary to establish or defend legal claims.

## 10. Data Security
We take reasonable technical and organizational measures to protect personal information against unauthorized access, loss, alteration, disclosure, or destruction.
Depending on the feature and technical environment, safeguards may include:
- Access controls.
- Secure authentication.
- Encryption where appropriate.
- Restricted administrative permissions.
- Secure handling of secrets and credentials.
- Backup and recovery procedures.
- Monitoring and incident response.
- Appropriate security controls for file downloads and transactions.
No method of internet transmission or electronic storage can be guaranteed completely secure.
You are responsible for maintaining the security of your account credentials and for reviewing the permissions granted to third-party services you connect.
If we become aware of a personal-data incident, we will take appropriate steps in accordance with applicable legal requirements.

## 11. Your Privacy Rights
Depending on the laws applicable to you, you may have rights concerning your personal information, including the right to:
- Request information about the processing of your personal data.
- Access personal information held about you.
- Request correction of inaccurate or incomplete information.
- Request deletion where legally available.
- Object to or request restriction of certain processing.
- Withdraw consent where processing is based on consent.
- Request a copy of certain information in a portable format where applicable.
- Complain to a competent data-protection authority.
These rights are subject to applicable legal conditions and exceptions.
To submit a request, contact us at:
Email: ranimejmal@gmail.com
Please describe your request and provide sufficient information for us to verify your identity appropriately.
We may request additional information where reasonably necessary to protect your account and prevent unauthorized disclosure.
We will respond in accordance with the time limits and procedures required by applicable law.

## 12. Account Closure and Data Deletion
You may request account closure through the available account settings or by contacting us.
Closing an account may affect your ability to access certain Platform features and purchase records.
We may retain information where required by law or where reasonably necessary for legitimate purposes such as fraud prevention, transaction records, dispute resolution, and legal claims.
Deleting an account does not automatically delete records that we are legally required to retain.
Where a deletion request cannot be fully granted, we will handle the request in accordance with applicable law and explain any relevant limitations where required.

## 13. Third-Party Websites and Integrations
The Platform may link to or integrate with third-party services, including AI providers, automation tools, payment providers, and external applications.
These services operate under their own terms, privacy policies, and data-handling practices.
When you connect a third-party service or use a downloaded workflow, information may be transmitted directly between the systems you have configured.
We do not control the privacy practices of independent third parties and encourage you to review their policies before connecting an account or submitting information.

## 14. AI Features and Automated Processing
Certain products may use AI models or automated processes to classify information, generate content, summarize documents, or perform other tasks.
The information processed by these products depends on how they are configured and operated.
If you use a downloadable workflow in your own environment, the workflow may transmit information to the external services configured within it.
If the Platform later introduces hosted automation execution, we will provide additional information about the data processed by that service, its purposes, and the relevant providers.
You should not submit confidential, personal, or sensitive information to an AI service unless you have the necessary rights and have reviewed the applicable service terms.
Where applicable law requires additional information or safeguards for automated decision-making, we will implement the relevant requirements.

## 15. Children's Privacy
The Platform is intended for people who can lawfully enter into the relevant agreements.
We do not knowingly collect personal information from children in circumstances where such collection is prohibited by applicable law.
If you believe a child has provided personal information in violation of applicable requirements, contact us so we can assess the situation and take appropriate action.

## 16. Changes to This Privacy Policy
We may update this Privacy Policy when our services, technologies, business operations, or legal obligations change.
The latest version will be published on this page with an updated effective date.
Where legally required, we will notify users or obtain consent before implementing material changes to our processing practices.
We encourage you to review this policy periodically.

## 17. Contact and Complaints
For questions, requests, or complaints regarding privacy and personal information, contact:
Ranime Jemal Agency
Email: ranimejmal@gmail.com
Phone: +216 97 017 061
Website: https://rja-wd2u.vercel.app/
Legal operator: [Insert full legal name]
Business address: [Insert business address, if required]
You may also have the right to contact the competent data-protection authority in your jurisdiction.

**This document is a draft for legal review. It must be checked against the Platform's actual data collection, hosting, authentication, payment, analytics, email, and automation integrations before publication.**
$doc$, true),
('terms', '1.0-draft', 'Terms of Service', $doc$Last updated: 29 October 2026.


## 1. Introduction
Welcome to Ranime Jemal Agency's AI Automation Marketplace (the "Platform").
These Terms of Service ("Terms") govern your access to and use of the Platform, including its website, accounts, marketplace, digital products, creator services, and related features.
The Platform allows customers to discover and purchase AI automations, n8n workflows, digital templates, and related products. It also allows approved independent creators to offer their own products for sale.
The Platform is operated by Ranime Jemal Agency ("we," "us," or "our").
Contact email: ranimejmal@gmail.com
Contact phone: +216 97 017 061
Business address: [Insert your business address, if required]
Legal operator: [Insert the full legal name of the individual or registered business operating the Platform]
By accessing or using the Platform, you agree to these Terms and the policies applicable to your activities. If you do not agree, you must not use the Platform.

## 2. Eligibility and Accounts
You must provide accurate information when creating an account and keep your account details reasonably up to date.
You are responsible for:
- Maintaining the confidentiality of your login credentials.
- Securing access to your account.
- Activities performed through your account, subject to applicable law.
- Notifying us promptly if you suspect unauthorized access.
You must not impersonate another person, provide deliberately misleading registration information, or create accounts for fraudulent purposes.
You must be legally capable of entering into a binding agreement to use paid services. If you are not legally able to do so independently, you may use the Platform only where permitted by applicable law and with any required authorization.
We may request reasonable information to verify accounts, investigate fraud, comply with legal obligations, or administer the marketplace.

## 3. Platform Services
The Platform may provide:
- Listings for AI automations and n8n workflows.
- Digital product purchases and downloads.
- Creator registration and product publishing tools.
- Product customization features.
- Installation documentation and configuration instructions.
- Ratings, reviews, and product discovery features.
- Customization, implementation, or consulting services.
- Additional features introduced from time to time.
Some features may require an account, a payment, seller approval, or acceptance of additional terms.
We may add, modify, suspend, or discontinue features when reasonably necessary for maintenance, security, business operations, or legal compliance, subject to applicable law and any specific commitments made to users.

## 4. Marketplace Products and Sellers
The Platform may offer two categories of products.

### 4.1 Platform-Owned Products
These products are offered by Ranime Jemal Agency or the relevant rights holder.
The applicable product page describes the product, price, included files, requirements, license, and available support.

### 4.2 Independent Creator Products
Independent creators may list products for sale after completing the applicable seller onboarding and approval process.
Unless expressly stated otherwise, independent creators are responsible for their own products, including their descriptions, authorization to distribute them, documentation, compatibility information, and support obligations.
Creators must accept the applicable Seller Agreement before selling through the Platform.
We may review, approve, reject, suspend, or remove product listings in accordance with our policies and applicable law.
A product's presence on the Platform does not necessarily mean that we have independently verified every claim made by its creator.
We may introduce product verification or testing programs and will describe their meaning and limitations where offered.

## 5. Purchases and Digital Delivery
Prices, currencies, product contents, applicable licenses, and material requirements will be presented on the relevant product page or during checkout.
By completing a purchase, you agree to pay the amount displayed at checkout, including any applicable charges disclosed before confirmation.
After successful payment, the Platform may provide access to downloadable files, product documentation, configuration tools, or other deliverables described in the listing.
Delivery may depend on payment confirmation, account status, technical availability, and any additional requirements disclosed before purchase.
You are responsible for reviewing the product description and checking whether you have the software, accounts, technical environment, and external services needed to use the product.
We do not guarantee compatibility with every device, software version, API, or third-party platform unless expressly stated.

## 6. Payments, Fees, and Taxes
Payments may be processed by third-party payment providers.
We do not intend to store raw payment-card details on the Platform. Payment information is handled according to the relevant payment provider's processes and policies.
You must not use fraudulent payment methods or attempt to manipulate payment confirmations.
Prices, commissions, refunds, and seller earnings are calculated according to the applicable transaction terms and Platform policies.
Taxes, duties, or other charges may apply depending on the transaction and applicable law. Their treatment will be determined by the relevant legal and payment arrangements.
Where required, users must provide accurate billing, business, or tax information.

## 7. Creator Commission and Payouts
The Platform may charge a commission on sales made by independent creators.
The applicable commission rate, calculation method, payout requirements, and any relevant deductions will be disclosed through the Seller Agreement or seller dashboard.
Unless expressly stated otherwise, revenue from Platform-Owned Products is not subject to a third-party creator commission.
Creator earnings may be affected by payment processing fees, refunds, chargebacks, taxes, and other disclosed adjustments.
Payouts are subject to applicable verification requirements, payment-provider capabilities, and legal obligations.
The Platform will not represent a payout as completed until the applicable payment process confirms completion.
Additional terms governing creator participation, product ownership, intellectual property, and payouts are set out in the Seller Agreement.

## 8. Product Licenses and Intellectual Property
Purchasing a product does not automatically transfer ownership of its underlying intellectual property.
Each product is subject to the Buyer License Agreement and any additional product-specific license terms presented before purchase.
Unless expressly authorized, buyers may not redistribute, resell, sublicense, or publicly share purchased workflow files or other protected product materials.
Creators retain the rights they own in their products, subject to the licenses granted to buyers and any applicable third-party licenses.
The Platform name, branding, website design, and Platform-Owned Products may be protected by intellectual property rights.
You must not copy or use our branding in a way that falsely suggests sponsorship, affiliation, or authorization.
Nothing in these Terms overrides rights that cannot lawfully be restricted.

## 9. Acceptable Use
You may use the Platform only for lawful purposes.
You must not:
- Use the Platform to commit fraud or facilitate illegal activity.
- Upload malware or deliberately harmful workflows.
- Attempt to access another user's account, files, or private information without authorization.
- Interfere with Platform security or availability.
- Circumvent access controls or payment requirements.
- Manipulate reviews, ratings, sales figures, or commission calculations.
- Infringe intellectual property, privacy, or other rights.
- Use purchased products in violation of applicable third-party licenses.
- Upload material you do not have the right to distribute.
- Use the Platform to distribute spam, phishing content, or unauthorized communications.
We may investigate suspected violations and take proportionate action, including removing content, restricting access, suspending accounts, or referring matters to appropriate authorities where legally required.

## 10. AI Automations and Third-Party Services
Products may rely on external software, APIs, cloud services, AI models, or other providers.
Examples may include n8n, AI model providers, email services, CRM systems, cloud platforms, and business applications.
Unless expressly included in the product description, third-party subscriptions, API usage, hosting, and other external charges are not included in the purchase price.
Third-party services are governed by their own terms, privacy policies, licensing requirements, and technical limitations.
Changes to external services may affect product availability or functionality.
Before using a workflow in a production environment, you should review its permissions, credentials, data flows, and expected behavior.
You must ensure that you have the necessary rights and authorization to connect external accounts or process information through an automation.
We do not guarantee that every third-party workflow is free from defects or suitable for every business purpose.

## 11. AI-Generated Outputs
Some products may use artificial intelligence to produce text, recommendations, classifications, summaries, code, or other outputs.
AI-generated outputs can be inaccurate, incomplete, misleading, or inappropriate.
You are responsible for reviewing outputs before relying on them, particularly for financial, legal, medical, security, employment, or other consequential decisions.
Unless expressly agreed otherwise, the Platform does not guarantee the accuracy, originality, legality, or suitability of AI-generated outputs.
You must not use AI products to violate applicable law or the rights of others.

## 12. Customization and Professional Services
Some products offer guided configuration, customization, implementation, or support.
The scope of included customization will be described on the relevant product page or service agreement.
Purchasing a downloadable template does not automatically include installation, custom development, ongoing maintenance, or unlimited support.
Where customization services are purchased separately, the applicable agreement should specify the scope, deliverables, fees, ownership arrangements, and support expectations.
Any use of n8n or other third-party software must comply with the applicable licensing terms.

## 13. Reviews and User Content
If the Platform permits reviews, comments, product descriptions, or other user submissions, you must ensure that your submissions are lawful, accurate to the best of your knowledge, and do not infringe third-party rights.
You must not submit fake reviews, undisclosed promotional endorsements, defamatory content, malicious files, or confidential information belonging to another person.
You retain ownership of content you own. By submitting content to the Platform, you grant us a non-exclusive permission to host, display, reproduce, and use that content as reasonably necessary to operate, promote, and improve the relevant Platform features, subject to applicable law and our Privacy Policy.
This permission does not transfer ownership of your content to us.
We may remove or restrict content where reasonably necessary to enforce these Terms, protect users, address legal claims, or maintain the Platform.

## 14. Refunds and Consumer Rights
Purchases are subject to the Refund Policy published on the Platform and any mandatory rights applicable to the transaction.
Digital products may be delivered immediately after payment. Refund eligibility can depend on the nature of the product, delivery status, the applicable law, and the circumstances of the request.
Where the law requires specific consent or acknowledgment before immediate delivery of digital content, we will collect it through the appropriate checkout process.
Nothing in these Terms removes a consumer right or remedy that cannot lawfully be excluded.
Refund requests may be submitted through [Insert Support Email or Refund Request Page].

## 15. Privacy and Data Protection
Our collection and use of personal information are described in the Privacy Policy:
https://rja-wd2u.vercel.app/legal/privacy
By using the Platform, you acknowledge that personal information may be processed as described in that policy and subject to applicable law.
You must not submit personal or confidential information through a workflow unless you have the necessary rights and authorization.
Creators are responsible for complying with applicable data-protection obligations when handling buyer information outside the Platform.

## 16. Security and Account Suspension
We may take reasonable measures to protect the Platform, including authentication controls, monitoring, rate limits, file restrictions, and account verification.
No online service can guarantee absolute security.
You must notify us promptly if you discover unauthorized access or a security issue affecting your account.
We may restrict or suspend access where reasonably necessary to investigate suspected fraud, protect users, address security threats, enforce these Terms, or comply with legal obligations.
Where appropriate and legally required, we will provide notice and an opportunity to remedy the issue.

## 17. Availability and Changes
We aim to maintain a reliable Platform but do not guarantee uninterrupted access or that every feature will always be available.
Maintenance, technical failures, third-party outages, security incidents, and circumstances beyond our reasonable control may affect availability.
We may change these Terms from time to time. The updated version will be published with a revised effective date.
Where legally required, we will provide notice or obtain additional consent before applying material changes.
Changes will not retroactively remove rights that have already accrued without a lawful basis.

## 18. Disclaimers and Limitation of Liability
To the extent permitted by applicable law, the Platform is provided according to the features and descriptions made available at the relevant time.
We do not guarantee that every product will meet every user's requirements, produce a specific business outcome, remain compatible with all future software versions, or operate without interruption.
To the extent permitted by law, we are not responsible for losses caused by a user's misuse of a product, unauthorized modifications, failure to secure credentials, or the independent acts or failures of third-party services.
Nothing in these Terms excludes or limits liability, warranties, or remedies that cannot lawfully be excluded or limited, including applicable consumer rights.
Any liability limitation will apply only to the extent permitted by the law governing the relevant claim.

## 19. Indemnification
To the extent permitted by applicable law, you may be responsible for claims, losses, or reasonable costs resulting from your unlawful use of the Platform, infringement of third-party rights, fraudulent activity, or material breach of these Terms.
This section does not transfer responsibility to you for matters caused by our own unlawful conduct or liabilities that cannot lawfully be transferred.

## 20. Termination
You may stop using the Platform at any time.
You may request account closure using the available account settings or by contacting us. Certain transaction, tax, security, or legal records may need to be retained as described in our Privacy Policy.
We may suspend or terminate access where reasonably necessary for legal compliance, security, fraud prevention, or a material breach of these Terms.
Termination does not automatically cancel rights or obligations that accrued before termination, and it does not remove mandatory statutory rights.
Product licenses and access to hosted services may be affected by termination according to the applicable license or service agreement.

## 21. Governing Law and Disputes
These Terms are subject to the laws identified here: [Insert the governing law after legal review].
Mandatory consumer protections and other laws that apply to a particular user or transaction remain unaffected.
If a dispute arises, the parties should first attempt to resolve it through good-faith communication.
If the dispute cannot be resolved informally, it may be referred to the competent court or other dispute-resolution process under applicable law.
Nothing in this section removes a consumer's mandatory right to bring a claim before a competent authority or court.

## 22. Contact
For questions about these Terms, purchases, or Platform use, contact:
Ranime Jemal Agency
Email: ranimejmal@gmail.com
Phone: +216 97 017 061
Website: https://rja-wd2u.vercel.app/
Legal operator: [Insert full legal name]
Business address: [Insert address, if required]

**This document is a draft for legal review. It should be finalized to reflect the Platform's actual business registration, payment providers, seller arrangements, refund process, and applicable legal requirements before being used as a binding agreement.**
$doc$, true);
