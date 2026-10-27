"""Inner-page content (from the product spec) for the FAQ-style template pages."""

# Each page: (title, description, h1, intro, [(tab name, vertical heading html, [(question, [blocks])])])
# A block is either a string (paragraph) or a list of strings (bullet list).

HOW = dict(
    file='how-it-works.html',
    title='How It Works | Ranime Jemal Agency',
    desc='How buying, configuring and activating an automation works: discover, inspect, purchase, customize and activate.',
    h1='How it works',
    intro='Find an automation for a specific business problem, personalize it, connect your tools, and get it working with clear instructions. No n8n expertise, no JSON, no building from scratch.',
    tabs=[
        ('Discover & Inspect', 'Discover &amp;<br/>Inspect', [
            ('How do I find the right automation?', [
                'Search for the repetitive task you want to automate. Search covers product names, categories, use cases and supported integrations.',
                'Filter by price, supported apps and difficulty. Every listing clearly states what the automation does and what it does not do.',
            ]),
            ('What does a product page show before I pay?', [
                'Everything you need to know what you are buying:',
                ['The business problem it solves', 'Example input and output', 'Workflow overview', 'Supported integrations',
                 'Required accounts and subscriptions', 'Technical requirements and n8n compatibility', 'Customization options',
                 'License and usage rights', 'Installation difficulty', 'Price and any recurring fees', 'Update and support policy',
                 'Reviews from verified buyers'],
            ]),
            ('What if an automation does not support my app?', [
                'Listings never claim support for integrations that have not been implemented and tested. If your app is not listed, request a custom implementation and we will tell you what is possible.',
            ]),
        ]),
        ('Purchase options', 'Purchase<br/>Options', [
            ('Download', ['Receive the n8n workflow template and a setup guide, and install it in your own n8n.']),
            ('Guided setup', ['Receive the template plus configuration assistance to get it running in your business.']),
            ('Hosted automation', ['We run the workflow for you on the platform. Billed as a one-time price plus a monthly hosting fee.']),
            ('Custom implementation', ['Request additional development tailored to your business. Priced from a starting amount and quoted per project.']),
            ('How are prices shown?', [
                'You see the complete price before checkout. One-time and recurring prices are clearly separated, and required third-party accounts and possible usage charges are listed on every product page.',
            ]),
        ]),
        ('Checkout & Payment', 'Checkout &amp;<br/>Payment', [
            ('How does checkout work?', [
                'Checkout asks for the minimum necessary information:',
                ['Review the order', 'Confirm the selected product and license', 'Accept the applicable terms',
                 'Pay using an available payment method', 'Payment is verified with the payment provider',
                 'The order is created and your license is granted', 'You receive a receipt and access instructions'],
            ]),
            ('When do I get access?', [
                'Access is granted only once the payment is confirmed, never just because a browser reached a success page.',
            ]),
            ('What if something goes wrong with a payment?', [
                'Every case is handled explicitly:',
                ['Payment declined', 'Payment pending', 'Duplicate payment notification',
                 'Payment successful but delivery temporarily unavailable', 'Refund or chargeback initiated'],
            ]),
        ]),
        ('My Automations', 'My<br/>Automations', [
            ('Where do I find what I bought?', [
                'Every purchase appears under My Automations. From there you can continue configuration, download the template, read the documentation or request support.',
            ]),
            ('What do the statuses mean?', [
                'Each automation shows where it stands:',
                ['Purchased', 'Setup required', 'Integrations required', 'Ready to test', 'Active', 'Paused', 'Error detected', 'Update available'],
            ]),
        ]),
        ('Configuration wizard', 'Configuration<br/>Wizard', [
            ('Step 1: Business profile', [['Business name', 'Industry', 'Preferred language', 'Time zone', 'Working hours', 'Brand voice', 'Relevant business rules']]),
            ('Step 2: Select capabilities', ['Enable only the capabilities included in your license, for example categorizing enquiries, summarizing messages, drafting responses, creating CRM records or notifying team members.']),
            ('Step 3: Connect integrations', ['Connect your email provider, CRM, form service or spreadsheet. OAuth is used where possible, otherwise a secure credential flow. Credentials are encrypted and never included in exported workflow files or logs.']),
            ('Step 4: Business rules', [['Which enquiries count as high priority', 'Which information must be collected', 'Which messages require human approval', 'Who receives notifications', 'What to do when required information is missing']]),
            ('Step 5: Preview', ['A summary of your settings, with any missing requirements highlighted.']),
            ('Step 6: Test', ['Send a sample input and see the output, any errors, and whether the workflow passed its checks.']),
            ('Step 7: Activate', ['Activation is enabled only when required integrations and configuration checks pass. Actions such as sending messages or changing business records get approval controls.']),
        ]),
    ],
)

SELL = dict(
    file='sell.html',
    title='Become a Seller | Ranime Jemal Agency',
    desc='Publish an n8n automation once and sell it to many businesses. Define buyer customization, pass validation and review, and manage your sales.',
    h1='Sell an automation',
    intro='Build once, sell repeatedly. Earn from your technical expertise, and offer optional installation and customization services.',
    tabs=[
        ('Become a seller', 'Become a<br/>Seller', [
            ('What do I need to apply?', [[
                'Display name and profile', 'Business or creator details', 'Short biography', 'Technical specialties',
                'Contact and support preferences', 'Payout and tax information, as applicable']]),
            ('Who can get paid?', ['Seller verification and payout eligibility depend on the payment provider and its supported countries.']),
            ('How do I start?', ['Email ranimejmal@gmail.com with your profile and the automation you want to sell.']),
        ]),
        ('Create a product', 'Create a<br/>Product', [
            ('What goes into a listing?', [[
                'Product name, category and business use case', 'Description, benefits and limitations', 'Screenshots or demonstration video',
                'Price and license', 'Required applications', 'n8n version and technical requirements', 'Setup and support policy', 'Version number and changelog']]),
            ('How do I upload my workflow?', [
                'Upload an n8n workflow JSON file. The platform parses it and checks its structure.',
                'Uploading does not mean a workflow is safe or ready to publish: it must pass security checks and any required manual review first.',
            ]),
        ]),
        ('Customization Builder', 'Customization<br/>Builder', [
            ('What can buyers change?', [
                'You choose which settings buyers may edit. For each field you define a label, description, default value, validation rules, allowed choices and whether it is required, then map it to a parameter in the workflow.',
            ]),
            ('Example settings', [[
                'Business name: text, buyer can edit', 'Response language: dropdown, buyer can edit', 'Brand voice: dropdown, buyer can edit',
                'CRM integration: supported choices, buyer can edit', 'Lead qualification threshold: number or range, buyer can edit',
                'Internal API credentials: secret, only through the secure connection flow', 'Core workflow structure: managed by the seller',
                'Security-critical settings: restricted']]),
            ('Why must every field be mapped?', ['A field that appears in the form but is not connected to the workflow is not a functional customization.']),
        ]),
        ('Testing & Review', 'Testing &amp;<br/>Review', [
            ('What must I check before publishing?', [[
                'Validate the workflow structure', 'Check supported node types and integrations', 'Confirm all required settings are mapped',
                'Remove embedded secrets and personal data', 'Test with sample inputs', 'Test failure scenarios', 'Verify credential requirements',
                'Document installation and recovery', 'Confirm it works for a fresh customer installation']]),
            ('What statuses can a listing have?', [['Draft', 'Validation failed', 'Under review', 'Published', 'Rejected with feedback', 'Suspended', 'Archived']]),
        ]),
        ('Seller dashboard', 'Seller<br/>Dashboard', [
            ('What can I manage?', [[
                'Products', 'Sales and order history', 'Revenue and fees', 'Payout status', 'Customer support requests',
                'Product versions', 'Reviews and ratings', 'Conversion and listing analytics']]),
            ('Can I see my customers’ data?', ['No. Sellers never get access to customers’ credentials, execution logs or business data just because they authored the template.']),
        ]),
    ],
)

PLATFORM = dict(
    file='platform.html',
    title='Platform & Trust | Ranime Jemal Agency',
    desc='Roles, administration, dashboards, product rules and the launch plan of the Ranime Jemal Agency automation marketplace.',
    h1='Platform &amp; trust',
    intro='The rules and infrastructure that let buyers and sellers rely on the marketplace.',
    tabs=[
        ('Roles', 'Product<br/>Roles', [
            ('Guest visitor', ['Browse published products, search categories, view demos, compare plans and read reviews.']),
            ('Buyer', ['Purchase products, configure automations, connect integrations, access downloads, manage licenses and view installation instructions.']),
            ('Seller', ['Create a profile, publish products, upload workflow templates, define customization options, manage prices, view sales and answer support requests.']),
            ('Administrator', ['Review seller applications and products, manage users, handle reports and disputes, configure fees and monitor platform health.']),
        ]),
        ('Administration', 'Admin<br/>Control', [
            ('What does the admin team do?', [[
                'Approve or suspend seller accounts', 'Review and moderate listings', 'Manage product categories', 'Configure marketplace commissions',
                'Monitor payments and payouts', 'Handle refunds and disputes', 'Review abuse and security reports',
                'Disable malicious or vulnerable workflow versions', 'Manage platform-wide notifications and policies']]),
        ]),
        ('Dashboards', 'Dashboards', [
            ('Buyer dashboard', [['Overview', 'My Automations', 'Configuration Wizard', 'Connected Apps', 'Test Results', 'Execution History', 'Updates', 'Orders and Billing', 'Support Requests', 'Account Settings']]),
            ('Seller dashboard', [['Overview', 'My Products', 'Create Product', 'Customization Builder', 'Workflow Validation', 'Product Versions', 'Orders and Revenue', 'Payouts', 'Customer Support', 'Analytics', 'Seller Settings']]),
            ('Admin dashboard', [['Overview', 'Users and Sellers', 'Product Moderation', 'Orders and Payments', 'Refunds and Disputes', 'Security Monitoring', 'Reports', 'Marketplace Settings']]),
        ]),
        ('Product rules', 'Product<br/>Rules', [
            ('Licensing and delivery', [['Every purchase grants an explicit license and entitlement', 'Every published product has a defined delivery method', 'Refunds, commissions, payouts and renewals have explicit policies']]),
            ('Security and privacy', [['Credentials are managed separately from workflow templates', 'Customer configurations and execution data are isolated between customers', 'Workflow uploads are untrusted until validated and reviewed', 'Sellers cannot access customer secrets by default']]),
            ('Reliability', [['Every buyer-editable setting maps to a validated workflow parameter', 'Product updates do not silently break existing installations', 'Buyers can see compatibility requirements before purchasing', 'Workflows have defined failure handling, execution limits and support boundaries', 'Important administrative, payment, configuration and activation events are recorded']]),
        ]),
        ('Launch plan', 'Launch<br/>Plan', [
            ('Phase 1: Marketplace foundation', ['Authentication, product listings, search, seller profiles, checkout, order records and buyer and seller dashboards.']),
            ('Phase 2: Digital product delivery', ['Validated workflow templates and documentation delivered through authorized, expiring download links.']),
            ('Phase 3: Customization system', ['Seller-defined configuration schemas, parameter mapping, input validation and the buyer configuration wizard.']),
            ('Phase 4: Secure integration setup', ['Credential connections, OAuth where supported, required integration checks and test workflows.']),
            ('Phase 5: Hosted automation', ['Isolated customer deployments with activation controls, monitoring, usage limits, billing and failure handling.']),
            ('Phase 6: Marketplace growth', ['Ratings, version updates, subscriptions, seller commissions, analytics and professional customization services.']),
        ]),
    ],
)
