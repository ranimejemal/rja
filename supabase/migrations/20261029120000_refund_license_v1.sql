-- Refund Policy and Buyer License Agreement, version 1.0, as written by the owner.
-- Earlier versions stay in the table for the record; only the current flag moves.

update agreements set is_current = false where kind in ('refund_policy', 'buyer_license') and is_current;

insert into agreements (kind, version, title, body, is_current) values
('refund_policy', '1.0', 'Refund Policy', $doc$Last updated: 29 October 2026.


## 1. Introduction
At Ranime Jemal Agency's AI Automation Marketplace ("Platform"), we want customers to understand exactly what they are purchasing and what options are available if something goes wrong.
This Refund Policy explains how refund requests are handled for digital products and services purchased through our Platform.
The Platform offers products and services that may include:
- AI automations and AI agents.
- n8n workflows and automation templates.
- Downloadable digital products.
- Configuration files and documentation.
- Customization and implementation services.
- Hosted automation services and subscriptions, where available.
- Products sold by independent marketplace creators.
This policy applies to purchases made through the Platform, subject to the applicable product terms, payment-provider requirements, and mandatory consumer rights.
Contact email: ranimejmal@gmail.com
Website: https://rja-wd2u.vercel.app/

## 2. General Refund Principles
Because our products may consist of digital files or services delivered electronically, refund eligibility depends on the type of purchase and the circumstances of the request.
We aim to handle refund requests fairly, consistently, and transparently.
A refund may be available when, for example:
- A payment was processed more than once for the same order.
- A purchase was made fraudulently or without authorization.
- A paid product cannot be accessed or downloaded because of a problem attributable to the Platform.
- A product materially differs from its published description.
- A product has a substantial defect that prevents its advertised core functionality from working under the stated requirements.
- A purchase qualifies for a refund under applicable law or an express product-specific guarantee.
Every request is assessed according to the circumstances, the applicable terms, and the law governing the transaction.
Nothing in this policy removes a refund, withdrawal, repair, replacement, or other remedy that a customer is legally entitled to receive.

## 3. Refunds for Downloadable Digital Products
Downloadable products may include n8n workflow files, AI automation templates, configuration files, documentation, and other digital deliverables.
Before purchasing, customers should review the product description, supported integrations, technical requirements, license terms, and included features.

### 3.1 When a Refund May Be Approved
A refund may be approved when:
- The purchased files are missing or corrupted and we cannot provide a working replacement within a reasonable time.
- The product cannot perform a core function explicitly advertised on its product page, and the issue cannot reasonably be resolved.
- The delivered product is materially different from the product description.
- The same order was charged multiple times.
- The transaction was unauthorized, subject to appropriate verification.
- A refund is required by applicable consumer-protection law.
Where appropriate, we may first offer a corrected file, replacement download, installation assistance, or other reasonable remedy.
This does not limit any mandatory right to a refund or another remedy.

### 3.2 When a Refund May Not Be Available
Subject to mandatory legal rights, a refund may not be available merely because:
- The customer changed their mind after purchasing and receiving a digital product.
- The customer purchased the wrong product despite the listing accurately describing it.
- The customer does not have the technical knowledge required to install the product, where the relevant requirements were clearly disclosed.
- The customer lacks a required third-party account, subscription, API key, or compatible environment.
- The product is incompatible with a system that was not listed as supported.
- The customer modified the workflow or connected it to unsupported services, causing the problem.
- A third-party service changes its API, pricing, availability, or terms after purchase.
- The customer expected functionality that was not advertised or included.
- The customer has used the product successfully but no longer needs it.
These circumstances do not automatically defeat a valid claim where the product is defective, misrepresented, or otherwise subject to a mandatory legal remedy.

### 3.3 Digital Delivery and Withdrawal Rights
Some jurisdictions provide specific withdrawal rights for digital content or digital services.
Where the law permits an exception to a withdrawal right after digital delivery begins, the Platform will obtain any required express consent and acknowledgment before delivery.
Simply accepting the Terms of Service or this Refund Policy will not substitute for a separate consent required by law.
Where an applicable law provides a withdrawal right, the Platform will respect that right and any relevant conditions.

## 4. Refunds for Customization and Implementation Services
Some customers may purchase additional services, including:
- Workflow installation.
- Automation customization.
- API integrations.
- Business-specific configuration.
- Troubleshooting.
- Consulting and implementation.
- Custom automation development.
The service description or separate service agreement should explain the scope of work, price, deliverables, and expected timeline.

### 4.1 Before Work Begins
If a customer requests cancellation before work begins, a refund may be available under the applicable service terms and law.
Any deduction for work already performed or costs already incurred must be lawful, transparent, and appropriately documented.

### 4.2 After Work Begins
Once customization or implementation has started, the refundable amount may depend on the work completed, the remaining deliverables, the applicable agreement, and mandatory legal requirements.
If the delivered service materially fails to meet the agreed scope, we will assess the issue and determine an appropriate remedy.
Depending on the circumstances and applicable law, this may include correcting the work, completing outstanding deliverables, partially refunding the purchase, or providing a full refund.

### 4.3 Completed Services
A service is not automatically non-refundable merely because it has been completed.
Refund eligibility will be assessed under the service agreement and applicable law, particularly if the service was defective, incomplete, unauthorized, or materially different from what was agreed.

## 5. Refunds for Hosted Automations and Subscriptions
If the Platform introduces hosted automation services, recurring subscriptions, or usage-based plans, additional refund rules may apply.
The relevant product or subscription page will explain:
- The subscription price and billing frequency.
- When billing begins.
- How to cancel.
- Whether usage charges apply.
- What happens to the service after cancellation.
- Whether any introductory offer or refund guarantee applies.

### 5.1 Subscription Cancellation
Customers may cancel subscriptions through the available account settings or by contacting support where self-service cancellation is unavailable.
Cancellation will normally stop future recurring charges according to the subscription terms.
Cancellation does not automatically refund previous payments or unused time unless required by law or expressly promised in the applicable plan.

### 5.2 Service Failures
If a hosted automation is unavailable or materially fails to provide an advertised core feature, customers may contact support for investigation.
Depending on the service agreement and circumstances, an appropriate remedy may include restoring the service, providing a service credit, extending the subscription, or issuing a refund.
Any service-level guarantee or credit scheme will be governed by the relevant subscription terms.

## 6. Purchases from Independent Creators
The Platform may host products sold by independent creators.
Refund requests for these products will be handled according to this Refund Policy, the applicable product terms, the Seller Agreement, and mandatory law.
Depending on the circumstances, the Platform may:
- Investigate the reported issue.
- Ask the buyer for relevant evidence.
- Contact the creator for information.
- Facilitate troubleshooting or replacement delivery.
- Determine whether a refund is appropriate under the applicable marketplace rules.
- Process an approved refund through the relevant payment provider where authorized and supported.
Independent creators must provide accurate product descriptions and comply with the applicable seller terms.
A creator's own refund statement cannot remove a mandatory legal right available to the buyer.
Where the Platform is not legally authorized to decide or issue a refund on behalf of a creator, the request will be handled according to the applicable transaction and payment arrangements.

## 7. How to Request a Refund
To request a refund, contact:
Email: ranimejmal@gmail.com
Use the subject line:
Refund Request — [Order Number]
Please include:
- Your name or account email.
- The order number.
- The product name.
- The date of purchase.
- A clear description of the problem.
- Relevant screenshots, error messages, or other supporting evidence, where appropriate.
Please do not email passwords, API keys, payment-card details, or other secret credentials.
If you cannot access your account or download a purchased product, explain the issue so we can identify the appropriate order.

## 8. Review and Response Process
We aim to acknowledge refund requests within 3 business days and provide an initial assessment or update within 7 business days, where reasonably possible.
These are service targets, not a guarantee that every request will be resolved within those periods.
Some cases may take longer if we need information from a creator, payment provider, or other party.
We may request reasonable evidence to verify the transaction and understand the issue.
We will assess each request fairly and communicate the outcome, including the reasons for a decision where appropriate.
Nothing in this section extends or overrides a statutory deadline that applies to a customer's legal rights.

## 9. Refund Processing
If a refund is approved, it will normally be returned through the original payment method where the payment provider supports this.
The time required for the funds to appear depends on the payment provider, financial institution, payment method, and applicable processing rules.
We cannot guarantee the exact date on which a bank or payment provider will display the refund.
If the original payment method is unavailable, we may contact the customer to determine an appropriate alternative, subject to legal and payment-provider requirements.
We will not request unnecessary payment information to issue a refund.

## 10. Duplicate Charges and Unauthorized Transactions
If you believe that you were charged more than once for the same purchase, contact us with the relevant order details.
We will investigate and, where a duplicate payment is confirmed, arrange an appropriate correction or refund.
If you believe that a transaction was unauthorized, notify us promptly and contact your payment provider where appropriate.
We may request reasonable information to verify the claim and protect against fraud.

## 11. Abuse of the Refund Process
We reserve the right to investigate suspected fraud, repeated abusive refund requests, deliberate misrepresentation, or attempts to obtain products without paying.
Where permitted by law, we may restrict accounts or take appropriate action in response to substantiated abuse.
However, a legitimate refund request or the exercise of a statutory consumer right will not, by itself, be treated as abuse.
We will not use this section to deny a refund that is legally required.

## 12. Chargebacks and Payment Disputes
If a customer disputes a transaction through their bank or payment provider, the Platform may provide relevant transaction records and communications to the provider as part of the dispute process.
Customers are encouraged to contact us about a purchase problem, but they are not required to waive any legal rights or remedies available through their payment provider.
We may temporarily restrict access to a product where reasonably necessary to address confirmed fraud, unauthorized access, or a payment dispute, subject to applicable law and the relevant license terms.

## 13. Product Licenses and Refunds
A purchase grants the buyer the license described in the Buyer License Agreement and applicable product terms.
Where a refund is issued, the rights to retain, access, download, or continue using the product may be affected according to the applicable license and law.
Where legally permitted, a buyer who receives a full refund may be required to stop using the refunded product and delete unauthorized copies.
A refund does not remove rights that must remain available under applicable law.

## 14. Changes to This Policy
We may update this Refund Policy to reflect changes to our products, services, payment arrangements, or legal obligations.
The current version will be published on the Platform with its effective date.
Changes will not retroactively remove mandatory consumer rights or override refund commitments that already apply to a purchase.
Where legally required, we will notify affected customers of material changes.

## 15. Contact Information
For questions or refund requests, contact:
Ranime Jemal Agency
Email: ranimejmal@gmail.com
Phone: +216 97 017 061
Website: https://rja-wd2u.vercel.app/

**This Refund Policy is a draft for legal review. It must be aligned with the Platform's actual payment provider, seller arrangements, digital delivery process, subscription terms, and applicable consumer-protection laws before publication.**
$doc$, true),
('buyer_license', '1.0', 'Buyer License Agreement', $doc$Last updated: 29 October 2026.


## 1. Introduction
This Buyer License Agreement (“Agreement”) governs your purchase and use of digital products available through the Ranime Jemal Agency AI Automation Marketplace (“Platform”).
The Platform may offer AI automations, n8n workflows, AI agents, automation templates, configuration files, documentation, and related digital products. Products may be created by Ranime Jemal Agency or by independent third-party creators (“Creators”).
By purchasing, downloading, accessing, or using a product, you agree to this Agreement and any additional license terms displayed on the product page at the time of purchase.
If you do not agree to these terms, do not purchase or use the product.
Platform: https://rja-wd2u.vercel.app/
Contact: ranimejmal@gmail.com

## 2. Definitions
- “Product” means a digital automation, workflow, AI agent, template, configuration file, documentation, or other digital deliverable offered through the Platform.
- “Buyer” means an individual or organization that purchases or receives a Product.
- “Creator” means a third party who lists or sells a Product through the Platform.
- “Personal Use” means use for individual, non-commercial purposes.
- “Commercial Use” means use in the operations of a business or organization, or to support commercial activities.
- “Customization” means modifications, configuration, integration, or implementation services provided separately or included with a Product.
- “Third-Party Services” means external software, APIs, platforms, models, hosting providers, and integrations required or optionally used by a Product.

## 3. License Grant
Subject to payment of the applicable purchase price and compliance with this Agreement, the Product-specific terms, and applicable law, the relevant rights holder grants you a limited, non-exclusive, non-transferable license to use the purchased Product for the purpose and scope specified on its product page.
Unless the product listing states otherwise, the license does not transfer ownership of the Product or its underlying intellectual property.
Your license begins when the purchase is completed and the Product is made available, subject to any additional activation requirements stated in the listing.

### 3.1 License Types
The license applicable to your purchase will be identified on the product page or at checkout.
**Personal License:** Permits personal, non-commercial use within the scope described in the listing.
**Single-Business License:** Permits use by the purchasing business for its internal operations, subject to any stated limits on users, deployments, or environments.
**Commercial License:** Permits the commercial use expressly described in the listing, which may include using the automation to support services provided to clients.
**Extended License:** Applies only where explicitly offered and purchased. It may permit broader deployment, client usage, or other rights described in the applicable product terms.
Not every Product includes every license type. If a listing does not clearly specify a license, contact the Platform before using the Product commercially.

## 4. Permitted Use
Unless the product-specific terms impose narrower limits or expressly grant broader rights, you may:
- Download and install the purchased Product for the licensed purpose.
- Configure it for your own environment.
- Connect it to compatible software, APIs, and services for which you have valid authorization.
- Modify configuration values, prompts, credentials, and settings as necessary for your permitted use.
- Adapt the Product for your own business operations where the purchased license allows it.
- Create internal backups where reasonably necessary, subject to applicable law and any stated license restrictions.
- Use outputs generated by the Product, subject to applicable third-party terms and intellectual property rights.
Any customization or client deployment must remain within the scope of the license you purchased.

## 5. Prohibited Use
Unless the rights holder has expressly authorized the activity in writing or the law permits it, you must not:
- Resell, sublicense, redistribute, publish, or share the original Product with people who are not covered by your license.
- Upload purchased files to public repositories, template marketplaces, or file-sharing services.
- Repackage a Product and sell it as your own automation, template, or digital product.
- Remove copyright notices, attribution, license notices, or other ownership information.
- Claim ownership of intellectual property that belongs to the Platform, a Creator, or another rights holder.
- Share account credentials or download links in a way that enables unauthorized access.
- Use the Product for unlawful activities, fraud, harassment, unauthorized surveillance, or unauthorized access to computer systems.
- Use the Product to violate privacy, data-protection, intellectual-property, or other applicable laws.
- Circumvent license restrictions, payment controls, or technical access controls.
- Use a Product in a manner prohibited by applicable third-party licenses or service terms.
Nothing in this section prohibits an activity that cannot lawfully be restricted under applicable law.

## 6. Intellectual Property
The Product and its components may include software, workflow logic, source files, documentation, prompts, designs, and other materials protected by intellectual-property laws.
Unless expressly stated otherwise:
- The original creator or other applicable rights holder retains ownership of the Product.
- Purchasing a Product grants a license to use it, not ownership of the underlying intellectual property.
- The Platform's branding, website design, logos, and original materials remain the property of their respective rights holders.
- Third-party software, libraries, models, and integrations remain subject to their own licenses and terms.
No ownership rights are transferred except where a separate written agreement expressly provides otherwise.

## 7. Customization and Derivative Works
You may customize a Product to the extent permitted by your license and applicable law.
If the Platform or a Creator provides customization services, the scope of work, deliverables, fees, ownership rights, and permitted reuse of modifications may be governed by a separate agreement.
Unless a written agreement states otherwise, customization does not automatically transfer ownership of the original Product or its underlying intellectual property.
Any rights in newly developed materials must be determined by the applicable service agreement, third-party licenses, and law.

## 8. Third-Party Services and Dependencies
Some Products require external services, such as:
- n8n or other workflow automation platforms.
- AI model providers and APIs.
- Cloud hosting providers.
- Databases, messaging services, or CRM platforms.
- Payment, email, social media, or business software integrations.
You are responsible for obtaining the accounts, subscriptions, permissions, API access, and other authorizations required for your use.
Third-party services may impose additional charges, usage limits, licensing restrictions, or data-processing conditions.
The Platform does not control independent third-party services and cannot guarantee their continued availability, compatibility, pricing, or functionality.
You must comply with the applicable terms and licenses of those services.

## 9. AI Outputs and Automated Actions
Products may use artificial intelligence to generate text, recommendations, classifications, code, decisions, or other outputs.
AI outputs may be inaccurate, incomplete, biased, misleading, or unsuitable for your intended purpose.
You are responsible for reviewing outputs and validating them before relying on them, particularly where they may affect financial, legal, employment, security, health, or other significant decisions.
Where a Product performs automated actions, you should configure appropriate permissions, approval steps, monitoring, and safeguards before enabling it in a production environment.
The Platform does not guarantee that AI-generated outputs are unique, protectable by intellectual-property law, or free from third-party rights.

## 10. Security and Data Protection
You are responsible for configuring Products securely and using them in compliance with applicable privacy and data-protection laws.
You should:
- Store API keys, passwords, and tokens securely.
- Avoid placing secrets in publicly accessible workflow files or repositories.
- Apply the principle of least privilege to connected accounts and integrations.
- Test workflows in a safe environment before production deployment.
- Review permissions, logs, data retention, and external data transfers.
- Obtain the necessary permissions and legal basis before processing personal data.
- Avoid transmitting confidential or sensitive information to an AI provider unless you have assessed the relevant risks and terms.
Unless expressly agreed in a separate written service agreement, the Platform does not act as your managed security provider or guarantee that a Product is free from vulnerabilities.
You remain responsible for the security and compliance of your deployment, including your hosting environment and third-party integrations.

## 11. Product Descriptions, Compatibility, and Updates
Product descriptions are intended to explain the functionality, dependencies, supported integrations, technical requirements, and limitations of each Product.
Before purchasing, you should review the listing and confirm that the Product is suitable for your environment.
Unless expressly included in the listing, the purchase does not guarantee:
- Lifetime updates or ongoing maintenance.
- Compatibility with every software version or third-party service.
- Installation or configuration assistance.
- Custom development or integration work.
- A specific business result, revenue level, or productivity improvement.
If updates, support, or maintenance are included, the applicable product page or separate agreement will describe their scope.

## 12. Delivery and Access
Products may be delivered through a download link, account dashboard, email, repository, or another method specified at checkout.
You are responsible for providing a valid email address and maintaining access to your account.
If you cannot access a purchased Product, contact support at ranimejmal@gmail.com with your order details.
The Platform may take reasonable steps to verify your purchase before restoring access or providing a replacement download.

## 13. Payments, Refunds, and Cancellations
The purchase price, applicable taxes, and any recurring charges will be displayed during checkout or in the relevant product terms.
Refund eligibility is governed by the Platform's Refund Policy (https://rja-wd2u.vercel.app/legal/refund-policy), the applicable product terms, and mandatory consumer-protection laws.
Digital products may be subject to specific withdrawal rules depending on the buyer's location and the nature of the purchase. Where legally required, the Platform will obtain separate consent or acknowledgment before immediate digital delivery.
Nothing in this Agreement excludes or limits a refund, withdrawal right, or other remedy that cannot legally be excluded.

## 14. Independent Creator Products
Where a Product is sold by an independent Creator, the Creator may retain ownership of the Product and grant the license described in the listing.
The Platform may facilitate listings, payment processing, delivery, support, or dispute handling, as described in the applicable marketplace terms.
Unless expressly stated otherwise, the Platform does not guarantee every claim made by an independent Creator or every aspect of a third-party Product.
If you identify a material discrepancy, suspected infringement, security concern, or other significant issue, contact the Platform with the product and order details.

## 15. Suspension and Termination
Your license may be terminated or suspended where permitted by law if you materially breach this Agreement, including by unauthorized redistribution, infringement, fraud, or unlawful use.
Where appropriate, the Platform or rights holder may provide notice and a reasonable opportunity to remedy the breach.
Upon termination, you must stop using the Product and delete copies where required by the applicable license and law.
Termination does not affect rights or remedies that have already accrued or that must survive under applicable law.

## 16. Disclaimers
To the maximum extent permitted by applicable law, Products are provided according to their published descriptions and applicable product terms.
The Platform does not guarantee uninterrupted operation, compatibility with every environment, error-free execution, or a particular business outcome unless expressly stated in a separate written agreement.
The Platform does not warrant the availability or performance of independent third-party services.
Nothing in this section excludes a warranty or consumer right that cannot legally be excluded.

## 17. Limitation of Liability
To the maximum extent permitted by applicable law, the Platform will not be liable for indirect or consequential losses, loss of profits, loss of anticipated savings, loss of business opportunities, or loss of data arising from the use or inability to use a Product.
This limitation does not apply to liability that cannot lawfully be limited or excluded, including any liability that applicable law requires to remain available.
Where liability may lawfully be limited, the extent of any limitation will be determined under the applicable law and any valid, clearly disclosed contractual terms.

## 18. Indemnification
To the extent permitted by applicable law, you may be responsible for losses, claims, or expenses caused by your unlawful use of a Product, your infringement of third-party rights, or your material breach of this Agreement.
This section does not make you responsible for matters caused by the Platform's own unlawful conduct or for liability that cannot lawfully be transferred to you.

## 19. Changes to This Agreement
The Platform may update this Agreement to reflect changes to its products, marketplace operations, or legal obligations.
The current version will be published on the Platform with its effective date.
For existing purchases, the applicable license at the time of purchase will continue to govern unless a change is legally required or the parties otherwise validly agree.
Any changes will not retroactively remove mandatory legal rights.

## 20. Governing Law and Disputes
This Agreement is subject to applicable law.
The governing law and competent courts must be specified in the final published version after considering the Platform operator's location, business structure, and the consumer-protection rules applicable to buyers in different jurisdictions.
Nothing in this Agreement deprives a consumer of mandatory protections or access to a competent court where applicable law provides otherwise.

## 21. Contact Information
For questions about this Agreement, a Product license, or permitted use, contact:
Ranime Jemal Agency
Email: ranimejmal@gmail.com
Phone: +216 97 017 061
Website: https://rja-wd2u.vercel.app/

**This Agreement is a draft for legal review. Before publication, confirm the legal identity and address of the Platform operator, the governing law, the actual license tiers offered, the marketplace's seller arrangements, the refund-policy URL, and the licensing requirements of any software or services distributed through the Platform.**
$doc$, true);
