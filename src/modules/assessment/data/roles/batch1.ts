import type { RoleAssessmentTemplate } from '../roleAssessmentTemplates';
import {
  mc,
  ms,
  tf,
  sjt,
  shortQ,
  longQ,
  listen,
  audio,
  video,
  code,
  sqlQ,
  cognitive,
  roleTemplate,
} from '../templateBuilders';

export const BATCH1_TEMPLATES: RoleAssessmentTemplate[] = [
  roleTemplate(
    'sales-associate',
    'Sales',
    'Sales Associate — Skills Assessment',
    'Evaluate communication, objection handling, product knowledge, and closing aptitude for sales roles.',
    [
      {
        title: 'Sales fundamentals',
        questions: [
          mc(
            'Objection handling',
            'A prospect says: "Your price is too high." What is the best first response?',
            [
              ['Immediately offer a 20% discount to keep the deal alive', false],
              ['Acknowledge the concern and ask what they are comparing against', true],
              ['Ignore the objection and continue your product demo', false],
              ['Tell them competitors charge even more', false],
            ],
            { tags: ['sales', 'objections'] },
          ),
          ms(
            'Discovery questions',
            'Which questions help uncover buyer pain points? (Select all that apply)',
            [
              ['What problem are you trying to solve this quarter?', true],
              ['What happens if you do nothing?', true],
              ['Can you sign today if I drop the price?', false],
              ['Who else is involved in this decision?', true],
            ],
            { tags: ['sales', 'discovery'] },
          ),
          tf(
            'Pipeline hygiene',
            'True or False: Updating CRM after every customer call is optional if you remember the details.',
            false,
            { tags: ['sales', 'crm'] },
          ),
          mc(
            'Sales cycle stage',
            'A prospect has agreed to a demo but has not shared budget or timeline. Which stage are they in?',
            [
              ['Closed-won', false],
              ['Qualified opportunity', false],
              ['Early discovery / interest', true],
              ['Renewal', false],
            ],
            { tags: ['sales', 'pipeline'] },
          ),
          mc(
            'BANT qualification',
            'Which element of BANT directly addresses whether the prospect can purchase within your fiscal quarter?',
            [
              ['Budget', false],
              ['Authority', false],
              ['Need', false],
              ['Timeline', true],
            ],
            { tags: ['sales', 'qualification'] },
          ),
          ms(
            'Effective sales practices',
            'Which practices improve win rates in B2B sales? (Select all that apply)',
            [
              ['Multi-threading across stakeholders', true],
              ['Sending generic mass emails to entire lists', false],
              ['Documenting next steps after every meeting', true],
              ['Mapping your solution to stated business outcomes', true],
            ],
            { tags: ['sales', 'best-practices'] },
          ),
          cognitive(
            'Pipeline math',
            'Your quota is $120,000 per quarter. Your average deal size is $15,000 and close rate is 25%. How many qualified opportunities do you need in pipeline to hit quota?',
            [
              ['8 opportunities', false],
              ['16 opportunities', false],
              ['32 opportunities', true],
              ['48 opportunities', false],
            ],
            { tags: ['sales', 'numeracy'], difficulty: 'medium' },
          ),
        ],
      },
      {
        title: 'Objections & competitive situations',
        questions: [
          sjt(
            'Deal stall scenario',
            'A deal has been in "negotiation" for 6 weeks with no progress. The champion stopped replying. What do you do first?',
            [
              ['Send a break-up email to create urgency', false],
              ['Multi-thread by reaching a new stakeholder with a value recap', true],
              ['Wait another two weeks for them to respond', false],
              ['Escalate to their CEO on LinkedIn', false],
            ],
            { tags: ['sales', 'situational'] },
          ),
          listen(
            'Customer call comprehension',
            'Sales rep: "Thanks for the demo yesterday. The team liked the workflow, but our IT director is worried about SSO integration and whether you support Okta. We cannot move forward without that."',
            'What is the prospect\'s primary blocker?',
            [
              ['Pricing is too high', false],
              ['SSO / Okta integration requirement', true],
              ['They disliked the product demo', false],
              ['They want to cancel an existing contract', false],
            ],
            { tags: ['sales', 'listening'] },
          ),
          sjt(
            'Competitive displacement',
            'A prospect says they are happy with a competitor but agreed to meet you. What is the best approach in the first call?',
            [
              ['Attack the competitor\'s weaknesses aggressively', false],
              ['Ask what outcomes they still cannot achieve with the current vendor', true],
              ['Offer a free year of service upfront', false],
              ['Skip discovery and jump straight to pricing', false],
            ],
            { tags: ['sales', 'competitive'] },
          ),
          tf(
            'Discounting discipline',
            'True or False: Offering a discount before understanding value is a sign of strong negotiation skills.',
            false,
            { tags: ['sales', 'negotiation'] },
          ),
          mc(
            'Closing technique',
            'After a successful demo, the prospect says "This looks great — let me think about it." What is the best next step?',
            [
              ['End the call and wait for them to reach out', false],
              ['Ask what specific concerns remain and propose a clear next step with a date', true],
              ['Send a contract immediately without discussion', false],
              ['Offer a discount before they ask', false],
            ],
            { tags: ['sales', 'closing'] },
          ),
          sjt(
            'Pricing negotiation',
            'A procurement team demands a 30% discount on a standard enterprise deal. Your manager approves up to 10%. What do you do?',
            [
              ['Accept 30% to save the deal', false],
              ['Walk away without discussion', false],
              ['Trade concessions (term length, scope, payment terms) for a smaller discount', true],
              ['Ignore procurement and only talk to your champion', false],
            ],
            { tags: ['sales', 'negotiation'] },
          ),
          shortQ(
            'Value proposition',
            'In one sentence, explain the business value of your product to a CFO who cares about ROI.',
            'Focus on measurable outcomes such as cost reduction, revenue growth, or risk mitigation.',
            { tags: ['sales', 'value-prop'] },
          ),
        ],
      },
      {
        title: 'Communication & closing',
        instructions: 'Record your responses clearly. You may re-record once before submitting.',
        questions: [
          shortQ(
            'Elevator pitch',
            'In one sentence, explain why a busy executive should take a 15-minute demo of your solution.',
            undefined,
            { tags: ['sales', 'communication'] },
          ),
          shortQ(
            'Follow-up subject line',
            'Write a compelling email subject line (max 8 words) to re-engage a prospect who went silent after a demo.',
            undefined,
            { tags: ['sales', 'copy'] },
          ),
          longQ(
            'Lost deal post-mortem',
            'Describe how you would conduct a post-mortem after losing a deal to a competitor. What questions would you ask internally and externally?',
            { tags: ['sales', 'analysis'] },
          ),
          longQ(
            'Outbound strategy',
            'Outline a 30-day outbound prospecting plan for breaking into a new vertical market. Include channels, messaging, and success metrics.',
            { tags: ['sales', 'strategy'] },
          ),
          audio(
            'Cold call opener',
            'Record a 60-second cold call introduction for a B2B SaaS product targeting HR teams. Include who you are, why you are calling, and a reason to continue the conversation.',
            { tags: ['sales', 'speaking'] },
          ),
          video(
            'Role-play close',
            'Record a 90-second video explaining how you would ask for commitment at the end of a successful demo. Address a common hesitation and propose a clear next step.',
            { tags: ['sales', 'video'] },
          ),
        ],
      },
    ],
    { passing_score: 70, tags: ['sales', 'hiring', 'template', 'batch1'] },
  ),

  roleTemplate(
    'software-engineer',
    'Engineering',
    'Software Engineer — Technical Assessment',
    'Screen coding fundamentals, system thinking, debugging, and technical communication.',
    [
      {
        title: 'Technical fundamentals',
        questions: [
          mc(
            'Time complexity',
            'What is the average time complexity of looking up a key in a well-implemented hash map?',
            [
              ['O(1)', true],
              ['O(log n)', false],
              ['O(n)', false],
              ['O(n log n)', false],
            ],
            { tags: ['engineering', 'algorithms'] },
          ),
          ms(
            'REST API design',
            'Which are good REST API practices? (Select all that apply)',
            [
              ['Use meaningful HTTP status codes', true],
              ['Version APIs in the URL or header', true],
              ['Use GET requests to delete resources', false],
              ['Return consistent error response shapes', true],
            ],
            { tags: ['engineering', 'api'] },
          ),
          tf(
            'Testing culture',
            'True or False: Unit tests should never touch the database.',
            false,
            { tags: ['engineering', 'testing'] },
          ),
          mc(
            'Database normalization',
            'Which normal form eliminates transitive dependencies of non-key attributes on the primary key?',
            [
              ['First Normal Form (1NF)', false],
              ['Second Normal Form (2NF)', false],
              ['Third Normal Form (3NF)', true],
              ['Denormalized star schema', false],
            ],
            { tags: ['engineering', 'databases'] },
          ),
          mc(
            'Git workflow',
            'Your feature branch is 20 commits behind main with merge conflicts. What is the safest approach before opening a PR?',
            [
              ['Force-push your branch to overwrite main', false],
              ['Rebase or merge main into your branch locally and resolve conflicts', true],
              ['Open the PR and let CI fix conflicts', false],
              ['Delete the branch and start over', false],
            ],
            { tags: ['engineering', 'git'] },
          ),
          ms(
            'Security best practices',
            'Which practices reduce common web application vulnerabilities? (Select all that apply)',
            [
              ['Parameterize SQL queries to prevent injection', true],
              ['Store passwords as plain text for easier recovery', false],
              ['Validate and sanitize user input on the server', true],
              ['Use HTTPS for all authenticated endpoints', true],
            ],
            { tags: ['engineering', 'security'] },
          ),
          cognitive(
            'Logic puzzle',
            'If all bloops are razzies and all razzies are lazzies, which statement must be true?',
            [
              ['All bloops are lazzies', true],
              ['All lazzies are bloops', false],
              ['No razzies are bloops', false],
              ['Some lazzies are not razzies', false],
            ],
            { tags: ['engineering', 'cognitive'] },
          ),
        ],
      },
      {
        title: 'Coding & data',
        instructions: 'Write clean, readable code. Partial credit may apply on edge cases.',
        questions: [
          code(
            'FizzBuzz variant',
            'Write a function that returns "Fizz" if n is divisible by 3, "Buzz" if divisible by 5, "FizzBuzz" if both, else return n as a string.',
            'function fizzBuzz(n) {\n  // your code\n}',
            'javascript',
            { tags: ['engineering', 'coding'], difficulty: 'easy' },
          ),
          code(
            'Two Sum',
            'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. Assume exactly one solution exists.',
            'function twoSum(nums, target) {\n  // return [i, j]\n}',
            'javascript',
            { tags: ['engineering', 'coding'], difficulty: 'medium' },
          ),
          sqlQ(
            'Active users query',
            'Write a SQL query to return distinct user IDs who logged in at least once in the last 30 days from a `logins(user_id, logged_at)` table.',
            { tags: ['engineering', 'sql'] },
          ),
          sqlQ(
            'Department headcount',
            'Given `employees(id, name, department_id)` and `departments(id, name)`, write SQL to return each department name and its employee count, ordered by count descending.',
            { tags: ['engineering', 'sql'] },
          ),
          sqlQ(
            'Monthly revenue',
            'Write SQL to calculate total revenue per month from `orders(id, amount, created_at)` for the current calendar year.',
            { tags: ['engineering', 'sql'], difficulty: 'medium' },
          ),
          tf(
            'Microservices trade-offs',
            'True or False: Microservices always reduce operational complexity compared to a monolith.',
            false,
            { tags: ['engineering', 'architecture'] },
          ),
          mc(
            'Caching strategies',
            'Which caching pattern reduces database load for frequently read, rarely updated reference data?',
            [
              ['Cache-aside (lazy loading)', true],
              ['Write-through on every keystroke', false],
              ['Disabling TTL on all cache keys', false],
              ['Caching only error responses', false],
            ],
            { tags: ['engineering', 'performance'] },
          ),
        ],
      },
      {
        title: 'Problem solving & communication',
        questions: [
          shortQ(
            'Queue vs HTTP',
            'When would you choose an asynchronous message queue over synchronous HTTP between two microservices?',
            'Consider decoupling, peak load, failure handling, and latency tolerance.',
            { tags: ['engineering', 'architecture'] },
          ),
          shortQ(
            'Idempotency',
            'Why is idempotency important for payment API endpoints? Answer in 2-3 sentences.',
            undefined,
            { tags: ['engineering', 'api'] },
          ),
          sjt(
            'Production incident priority',
            'At 2 AM, alerts fire for: (A) elevated API latency, (B) failed nightly batch job, (C) broken staging deploy. You are on call. What do you triage first?',
            [
              ['Staging deploy — it blocks QA', false],
              ['Elevated API latency affecting customers', true],
              ['Nightly batch job — it can wait until morning', false],
              ['All three simultaneously without assessment', false],
            ],
            { tags: ['engineering', 'incident'] },
          ),
          listen(
            'Requirements comprehension',
            'Product manager: "We need the export feature to handle 50,000 rows without timing out. Legal requires audit logs for every download. Mobile users only need CSV, but enterprise wants PDF with branding."',
            'What is the most critical non-functional requirement to address first?',
            [
              ['PDF branding colors', false],
              ['Performance at 50,000 rows', true],
              ['Mobile push notifications', false],
              ['Social sharing integration', false],
            ],
            { tags: ['engineering', 'listening'] },
          ),
          longQ(
            'Debug production latency',
            'Describe the steps you would take to investigate a sudden spike in API latency in production. Include tooling, hypotheses, and communication with stakeholders.',
            { tags: ['engineering', 'debugging'] },
          ),
          longQ(
            'System design trade-off',
            'A startup expects 10x traffic growth in 6 months. Compare scaling a monolith vs. extracting services. What factors would drive your recommendation?',
            { tags: ['engineering', 'architecture'] },
          ),
        ],
      },
    ],
    { passing_score: 75, tags: ['engineering', 'hiring', 'template', 'batch1'] },
  ),

  roleTemplate(
    'customer-support',
    'Customer Support',
    'Customer Support — Service Excellence Assessment',
    'Measure empathy, troubleshooting, written clarity, and de-escalation skills.',
    [
      {
        title: 'Service skills',
        questions: [
          mc(
            'De-escalation',
            'An angry customer demands a refund outside policy. Your best first step is to:',
            [
              ['Repeat the refund policy verbatim', false],
              ['Acknowledge their frustration and summarize their issue', true],
              ['Transfer to another agent without context', false],
              ['Offer a full refund immediately to end the call', false],
            ],
            { tags: ['support', 'de-escalation'] },
          ),
          listen(
            'Ticket comprehension',
            'Customer: "I was charged twice for my subscription. I cancelled last month but still see a pending charge on my card. I need this fixed today."',
            'What is the customer\'s primary issue?',
            [
              ['Duplicate charge / billing error after cancellation', true],
              ['Feature not working', false],
              ['Password reset request', false],
              ['Product recommendation', false],
            ],
            { tags: ['support', 'listening'] },
          ),
          tf(
            'First response quality',
            'True or False: A fast first response is more important than a complete and accurate first response.',
            false,
            { tags: ['support', 'sla'] },
          ),
          mc(
            'Empathy statement',
            'Which response best demonstrates empathy when a customer\'s order arrived damaged?',
            [
              ['That\'s not our fault — the carrier handles shipping.', false],
              ['I\'m sorry your order arrived damaged. Let me make this right for you.', true],
              ['Please read our returns policy on the website.', false],
              ['You should have purchased shipping insurance.', false],
            ],
            { tags: ['support', 'empathy'] },
          ),
          ms(
            'Support best practices',
            'Which actions align with excellent customer support? (Select all that apply)',
            [
              ['Set clear expectations for resolution timeline', true],
              ['Use the customer\'s name and confirm understanding', true],
              ['Close tickets before the issue is resolved to improve metrics', false],
              ['Document steps taken in the ticket for the next agent', true],
            ],
            { tags: ['support', 'best-practices'] },
          ),
          cognitive(
            'Priority triage',
            'You have 4 tickets: (1) site down for all users, (2) billing question, (3) typo in help doc, (4) feature request. In what order should you address them?',
            [
              ['1, 2, 4, 3', true],
              ['2, 1, 3, 4', false],
              ['3, 4, 2, 1', false],
              ['4, 3, 2, 1', false],
            ],
            { tags: ['support', 'prioritization'] },
          ),
          tf(
            'Customer privacy',
            'True or False: It is acceptable to share one customer\'s account details with another customer if they claim to be family.',
            false,
            { tags: ['support', 'compliance'] },
          ),
        ],
      },
      {
        title: 'Troubleshooting & escalation',
        questions: [
          sjt(
            'Escalation judgment',
            'A customer reports they cannot log in. You\'ve verified their account is active and password reset emails are not arriving. What do you do next?',
            [
              ['Tell them to try again tomorrow', false],
              ['Escalate to engineering with full reproduction steps and timestamps', true],
              ['Close the ticket as user error', false],
              ['Create a new account without verification', false],
            ],
            { tags: ['support', 'escalation'] },
          ),
          mc(
            'Knowledge base usage',
            'A customer asks a question covered in your help center. What is the best approach?',
            [
              ['Send only a link without context', false],
              ['Summarize the answer in plain language and include the article link', true],
              ['Tell them to search themselves', false],
              ['Ignore the article and guess', false],
            ],
            { tags: ['support', 'knowledge-base'] },
          ),
          sjt(
            'Policy exception',
            'A loyal customer missed the 30-day return window by 2 days due to a hospital stay. Policy says no exceptions. What do you do?',
            [
              ['Refuse without listening to their situation', false],
              ['Acknowledge their situation, document it, and escalate to a supervisor for review', true],
              ['Automatically approve without documentation', false],
              ['Blame the policy and end the chat', false],
            ],
            { tags: ['support', 'situational'] },
          ),
          listen(
            'Technical issue diagnosis',
            'Customer: "The app keeps crashing when I upload photos larger than 5 MB. I\'m on an iPhone 12 with iOS 17. It worked fine last week after the update."',
            'What information should you gather next?',
            [
              ['Their favorite color', false],
              ['App version, exact error message, and sample file size/format', true],
              ['Their annual income', false],
              ['Whether they use Android', false],
            ],
            { tags: ['support', 'troubleshooting'] },
          ),
          ms(
            'Root cause categories',
            'A spike in "cannot connect" tickets appears after a release. Which are plausible root causes? (Select all that apply)',
            [
              ['API endpoint URL changed in the new build', true],
              ['Certificate or SSL configuration issue', true],
              ['Customer changed their favorite font', false],
              ['Rate limiting misconfiguration', true],
            ],
            { tags: ['support', 'incident'] },
          ),
          shortQ(
            'SLA definition',
            'Define "first response time" and "resolution time" in the context of a support SLA.',
            undefined,
            { tags: ['support', 'sla'] },
          ),
          mc(
            'Channel switching',
            'A frustrated customer tweets publicly about a billing issue. What is the best first action?',
            [
              ['Reply publicly with their full account details', false],
              ['Reply publicly acknowledging the issue and move to DM for account verification', true],
              ['Ignore social media complaints', false],
              ['Delete the tweet by reporting it', false],
            ],
            { tags: ['support', 'social'] },
          ),
        ],
      },
      {
        title: 'Written & verbal communication',
        instructions: 'Focus on clear, customer-friendly language. Tone and accuracy matter.',
        questions: [
          longQ(
            'Delayed shipment reply',
            'Write a reply to a customer whose shipment is delayed by 5 days. Apologize sincerely, explain next steps, and offer a reasonable resolution.',
            { tags: ['support', 'writing'] },
          ),
          longQ(
            'Difficult conversation recap',
            'After resolving a heated billing dispute, write an internal note summarizing the issue, resolution, and follow-up actions for the team.',
            { tags: ['support', 'documentation'] },
          ),
          shortQ(
            'Macro improvement',
            'Rewrite this macro to be more empathetic: "Your request has been received. Wait 3-5 business days."',
            undefined,
            { tags: ['support', 'copy'] },
          ),
          audio(
            'Password reset walkthrough',
            'Record how you would verbally explain a 2-step password reset process to a non-technical user. Speak slowly and check for understanding.',
            { tags: ['support', 'speaking'] },
          ),
          video(
            'Service recovery pitch',
            'Record a 60-second video explaining how you would win back a customer who had a poor first experience with your product.',
            { tags: ['support', 'video'] },
          ),
          sjt(
            'End-of-shift handoff',
            'You are ending your shift with 3 open tickets, one marked urgent. What do you do?',
            [
              ['Log off immediately — shift is over', false],
              ['Document status on all tickets and hand off the urgent one per team protocol', true],
              ['Close all tickets to clear your queue', false],
              ['Delete the urgent ticket', false],
            ],
            { tags: ['support', 'handoff'] },
          ),
        ],
      },
    ],
    { passing_score: 70, tags: ['support', 'hiring', 'template', 'batch1'] },
  ),

  roleTemplate(
    'operations-associate',
    'Operations',
    'Operations Associate — Hiring Assessment',
    'Assess attention to detail, process adherence, numeracy, and operational judgment.',
    [
      {
        title: 'Operations aptitude',
        questions: [
          mc(
            'Priority triage',
            'You have: (A) vendor payment due today, (B) team lunch order, (C) client escalation. What do you tackle first?',
            [
              ['B, then A, then C', false],
              ['C, then A, then B', true],
              ['A, then B, then C', false],
              ['B, then C, then A', false],
            ],
            { tags: ['operations', 'prioritization'] },
          ),
          shortQ(
            'Inventory discrepancy',
            'A spreadsheet shows 1,250 units shipped and 1,180 units received. How many units are unaccounted for?',
            '70',
            { tags: ['operations', 'numeracy'], difficulty: 'easy' },
          ),
          ms(
            'SOP compliance',
            'Which actions follow standard employee onboarding SOP? (Select all that apply)',
            [
              ['Verify ID documents before granting system access', true],
              ['Share admin passwords over chat for speed', false],
              ['Log equipment handover in the asset register', true],
              ['Skip background check if referred internally', false],
            ],
            { tags: ['operations', 'sop'] },
          ),
          cognitive(
            'Capacity planning',
            'A warehouse processes 120 orders/hour. If a shift is 8 hours and 15% of time is breaks/meetings, how many orders can one associate process per shift?',
            [
              ['816 orders', true],
              ['960 orders', false],
              ['720 orders', false],
              ['1,024 orders', false],
            ],
            { tags: ['operations', 'numeracy'] },
          ),
          tf(
            'Documentation discipline',
            'True or False: Verbal agreements with vendors do not need to be documented if both parties trust each other.',
            false,
            { tags: ['operations', 'compliance'] },
          ),
          mc(
            'Data entry accuracy',
            'You notice two nearly identical vendor records in the system. What should you do first?',
            [
              ['Delete both records', false],
              ['Investigate, merge if duplicate, and document the correction', true],
              ['Ignore — duplicates do not matter', false],
              ['Create a third record', false],
            ],
            { tags: ['operations', 'data-quality'] },
          ),
          mc(
            'Meeting logistics',
            'An executive requests a board meeting in 48 hours with 12 attendees across 3 time zones. What is your first step?',
            [
              ['Book a room without checking availability', false],
              ['Send a Doodle or calendar poll with timezone-aware options', true],
              ['Assume everyone can make 9 AM local time', false],
              ['Cancel other meetings without asking', false],
            ],
            { tags: ['operations', 'coordination'] },
          ),
        ],
      },
      {
        title: 'Process & compliance',
        questions: [
          sjt(
            'Shift handover',
            'You notice incomplete notes from the previous shift about a critical vendor payment failure. What do you do?',
            [
              ['Wait until the colleague returns next week', false],
              ['Contact the colleague, document findings, and escalate if payment is at risk', true],
              ['Assume it was resolved', false],
              ['Delete the ticket to reduce backlog', false],
            ],
            { tags: ['operations', 'situational'] },
          ),
          ms(
            'Procurement controls',
            'Which practices strengthen procurement compliance? (Select all that apply)',
            [
              ['Three-way match: PO, receipt, and invoice', true],
              ['Approving purchases without budget owner sign-off', false],
              ['Maintaining an approved vendor list', true],
              ['Segregation of duties between requester and approver', true],
            ],
            { tags: ['operations', 'procurement'] },
          ),
          tf(
            'Expense policy',
            'True or False: Submitting expenses without receipts is acceptable if the amount is under $25.',
            false,
            { tags: ['operations', 'finance'] },
          ),
          sjt(
            'Confidential document',
            'You accidentally receive a confidential HR spreadsheet intended for leadership. What do you do?',
            [
              ['Forward it to your team for awareness', false],
              ['Notify the sender, delete local copies, and do not redistribute', true],
              ['Post it in the company wiki', false],
              ['Ignore it — not your problem', false],
            ],
            { tags: ['operations', 'confidentiality'] },
          ),
          listen(
            'Vendor call notes',
            'Vendor: "We can ship 500 units by Friday if you confirm the PO by noon today. Otherwise the earliest slot is next Tuesday. Freight is included but signature is required on delivery."',
            'What is the critical deadline for the operations team?',
            [
              ['Confirm PO by noon today', true],
              ['Schedule delivery for next month', false],
              ['Negotiate freight charges', false],
              ['Request 5,000 units instead', false],
            ],
            { tags: ['operations', 'listening'] },
          ),
          shortQ(
            'KPI definition',
            'Define "order cycle time" in a fulfillment context.',
            undefined,
            { tags: ['operations', 'metrics'] },
          ),
          mc(
            'Root cause analysis',
            'Three shipment errors occurred this week, all involving the same SKU label. What is the best next step?',
            [
              ['Fire the newest warehouse associate', false],
              ['Run a 5-Why analysis on the labeling process', true],
              ['Stop shipping all products', false],
              ['Ignore — 3 errors is within normal range', false],
            ],
            { tags: ['operations', 'quality'] },
          ),
        ],
      },
      {
        title: 'Judgment & improvement',
        questions: [
          longQ(
            'Process improvement',
            'Describe one way you would reduce errors in a manual data-entry workflow. Include tools, checks, and how you would measure success.',
            { tags: ['operations', 'process'] },
          ),
          longQ(
            'Cross-functional project',
            'You are asked to coordinate an office move for 50 employees in 6 weeks. Outline your project plan milestones and key stakeholders.',
            { tags: ['operations', 'project-management'] },
          ),
          shortQ(
            'Risk identification',
            'List two operational risks of relying on a single supplier for a critical component.',
            undefined,
            { tags: ['operations', 'risk'] },
          ),
          sjt(
            'Budget overrun',
            'A department has spent 90% of its quarterly budget in month two. What do you do?',
            [
              ['Ignore until quarter end', false],
              ['Alert the budget owner and finance with spend data and forecast', true],
              ['Approve all future requests without review', false],
              ['Transfer funds without authorization', false],
            ],
            { tags: ['operations', 'finance'] },
          ),
          audio(
            'Vendor negotiation recap',
            'Record a 60-second verbal summary you would send to your manager after a vendor call where pricing and delivery terms were renegotiated.',
            { tags: ['operations', 'communication'] },
          ),
          video(
            'SOP walkthrough',
            'Record a 90-second video explaining how you would train a new hire on your team\'s daily opening checklist.',
            { tags: ['operations', 'training'] },
          ),
        ],
      },
    ],
    { passing_score: 65, tags: ['operations', 'hiring', 'template', 'batch1'] },
  ),

  roleTemplate(
    'marketing-associate',
    'Marketing',
    'Marketing Associate — Creative & Analytical Assessment',
    'Test campaign thinking, copywriting, channel knowledge, and basic analytics literacy.',
    [
      {
        title: 'Marketing fundamentals',
        questions: [
          mc(
            'Funnel metrics',
            'Which metric best indicates top-of-funnel awareness for a digital campaign?',
            [
              ['Impressions / reach', true],
              ['Customer churn rate', false],
              ['Net revenue retention', false],
              ['Support ticket volume', false],
            ],
            { tags: ['marketing', 'analytics'] },
          ),
          ms(
            'Channel fit',
            'Which channels suit B2B thought leadership? (Select all that apply)',
            [
              ['LinkedIn', true],
              ['Industry newsletters', true],
              ['TikTok dance trends only', false],
              ['Webinars', true],
            ],
            { tags: ['marketing', 'channels'] },
          ),
          tf(
            'Attribution basics',
            'True or False: Last-click attribution always gives full credit to the first touchpoint in the customer journey.',
            false,
            { tags: ['marketing', 'attribution'] },
          ),
          mc(
            'A/B testing',
            'You run an email A/B test on subject lines. Version B has a 22% open rate vs. 18% for A, with 10,000 sends each. What should you do?',
            [
              ['Declare B the winner and roll out without further analysis', false],
              ['Check statistical significance and apply the winner to future sends', true],
              ['Ignore results and use your favorite subject line', false],
              ['Run the test for one more hour only', false],
            ],
            { tags: ['marketing', 'experimentation'] },
          ),
          cognitive(
            'CTR calculation',
            'An ad received 50,000 impressions and 1,250 clicks. What is the click-through rate (CTR)?',
            [
              ['2.5%', true],
              ['5.0%', false],
              ['1.25%', false],
              ['12.5%', false],
            ],
            { tags: ['marketing', 'numeracy'] },
          ),
          ms(
            'Brand guidelines',
            'Which elements typically belong in a brand style guide? (Select all that apply)',
            [
              ['Logo usage and clear space rules', true],
              ['Approved color palette and typography', true],
              ['Personal employee social media passwords', false],
              ['Tone of voice and messaging pillars', true],
            ],
            { tags: ['marketing', 'brand'] },
          ),
          shortQ(
            'Headline writing',
            'Write a headline (max 10 words) for a webinar on AI productivity for remote teams.',
            undefined,
            { tags: ['marketing', 'copy'] },
          ),
        ],
      },
      {
        title: 'Campaign & analytics',
        questions: [
          mc(
            'CAC vs LTV',
            'Customer acquisition cost (CAC) is $200 and average customer lifetime value (LTV) is $150. What does this indicate?',
            [
              ['Healthy unit economics', false],
              ['Unsustainable acquisition — LTV < CAC', true],
              ['LTV is irrelevant for marketing', false],
              ['You should double ad spend immediately', false],
            ],
            { tags: ['marketing', 'metrics'] },
          ),
          listen(
            'Stakeholder brief',
            'CMO: "We need a Q3 campaign targeting mid-market HR leaders. Budget is $40K. Primary goal is 200 marketing-qualified leads. Secondary goal is brand lift. No discounting — focus on thought leadership."',
            'What is the primary success metric for this campaign?',
            [
              ['200 marketing-qualified leads', true],
              ['Total social media followers', false],
              ['Number of press releases', false],
              ['Employee satisfaction score', false],
            ],
            { tags: ['marketing', 'listening'] },
          ),
          sjt(
            'Campaign underperformance',
            'A paid search campaign is 40% over budget with half the expected conversions. What do you investigate first?',
            [
              ['Change the company logo', false],
              ['Review targeting, landing page conversion, and keyword quality scores', true],
              ['Pause all marketing permanently', false],
              ['Blame the sales team', false],
            ],
            { tags: ['marketing', 'situational'] },
          ),
          ms(
            'SEO fundamentals',
            'Which factors influence organic search ranking? (Select all that apply)',
            [
              ['Relevant, high-quality content', true],
              ['Page load speed and mobile usability', true],
              ['Keyword stuffing hidden text', false],
              ['Authoritative backlinks', true],
            ],
            { tags: ['marketing', 'seo'] },
          ),
          tf(
            'Content repurposing',
            'True or False: Repurposing a webinar into blog posts, clips, and social snippets is an effective content strategy.',
            true,
            { tags: ['marketing', 'content'] },
          ),
          shortQ(
            'UTM parameters',
            'What are UTM parameters used for in campaign URLs?',
            undefined,
            { tags: ['marketing', 'analytics'] },
          ),
          longQ(
            'Campaign brief',
            'Outline a 3-step launch plan for a new product feature aimed at existing customers. Include channels, messaging, and success metrics.',
            { tags: ['marketing', 'strategy'] },
          ),
        ],
      },
      {
        title: 'Creative & communication',
        instructions: 'Be concise on short answers. Creative questions are evaluated for clarity and audience fit.',
        questions: [
          shortQ(
            'CTA writing',
            'Write a call-to-action button label (max 4 words) for a free trial signup page.',
            undefined,
            { tags: ['marketing', 'copy'] },
          ),
          longQ(
            'Persona development',
            'Describe a buyer persona for a B2B project management tool targeting engineering managers. Include goals, pain points, and preferred channels.',
            { tags: ['marketing', 'persona'] },
          ),
          sjt(
            'Crisis communication',
            'A negative product review goes viral on social media. What is marketing\'s first response?',
            [
              ['Delete all negative comments', false],
              ['Coordinate with support and comms on an official, empathetic response', true],
              ['Ignore — it will blow over', false],
              ['Post unrelated promotional content', false],
            ],
            { tags: ['marketing', 'crisis'] },
          ),
          mc(
            'Email deliverability',
            'Which practice improves email deliverability?',
            [
              ['Purchasing email lists from third parties', false],
              ['Maintaining list hygiene and honoring unsubscribes promptly', true],
              ['Sending daily emails to unengaged contacts', false],
              ['Using misleading subject lines', false],
            ],
            { tags: ['marketing', 'email'] },
          ),
          audio(
            'Podcast pitch',
            'Record a 60-second pitch explaining why a podcast host should interview your company\'s CEO about industry trends.',
            { tags: ['marketing', 'speaking'] },
          ),
          video(
            'Upgrade pitch',
            'Record a 60-second video explaining why a customer should upgrade to a premium plan. Focus on value, not features alone.',
            { tags: ['marketing', 'video'] },
          ),
        ],
      },
    ],
    { passing_score: 70, tags: ['marketing', 'hiring', 'template', 'batch1'] },
  ),
];
