import type { RoleAssessmentTemplate } from '../roleAssessmentTemplates';
import {
  mc,
  ms,
  tf,
  sjt,
  shortQ,
  longQ,
  listen,
  code,
  roleTemplate,
} from '../templateBuilders';

// ─── 1. Content Writer ───────────────────────────────────────────────────────

const contentWriter = roleTemplate(
  'content-writer',
  'Content & Copywriting',
  'Content Writer — Hiring Assessment',
  'Evaluate writing craft, audience awareness, SEO literacy, editorial judgment, and brand voice consistency.',
  [
    {
      title: 'Writing craft & voice',
      questions: [
        mc(
          'Active vs passive voice',
          'Which revision best strengthens a product announcement headline?',
          [
            ['Our team has been working on a new feature that will be released soon', false],
            ['We launch Smart Sync — cut reporting time in half starting today', true],
            ['A new feature is going to be available for users in the near future', false],
            ['There will be improvements made to the reporting experience', false],
          ],
          { tags: ['content', 'copywriting'] },
        ),
        ms(
          'Editing checklist',
          'Before publishing a long-form blog post, which checks should a content writer perform? (Select all that apply)',
          [
            ['Verify claims against primary sources', true],
            ['Confirm headings follow a logical hierarchy (H1 → H2 → H3)', true],
            ['Add as many keywords as possible regardless of readability', false],
            ['Proofread for grammar, tone, and broken links', true],
            ['Ensure a clear CTA aligned with campaign goals', true],
          ],
          { tags: ['content', 'editing'] },
        ),
        tf(
          'Oxford comma',
          'True or False: In B2B SaaS style guides, the Oxford comma is universally mandatory across all brands.',
          false,
          { tags: ['content', 'style'] },
        ),
        shortQ(
          'Headline compression',
          'Rewrite this headline in 8 words or fewer: "How distributed teams can improve their asynchronous communication workflows."',
          'Improve async communication for distributed teams',
          { tags: ['content', 'headlines'] },
        ),
        mc(
          'Tone adjustment',
          'A fintech brand needs to email users about a scheduled maintenance window. Which tone is most appropriate?',
          [
            ['Casual slang with memes to keep it light', false],
            ['Clear, calm, and specific about timing and impact', true],
            ['Highly technical jargon with no plain-language summary', false],
            ['Alarmist language to ensure users read the email', false],
          ],
          { tags: ['content', 'tone'] },
        ),
        sjt(
          'Conflicting feedback',
          'Marketing wants punchy copy; Legal wants conservative language on a landing page. As the content writer, what do you do first?',
          [
            ['Publish marketing\'s version and let Legal fix it later', false],
            ['Facilitate a joint review to align on must-keep claims and approved phrasing', true],
            ['Remove all product claims to avoid any risk', false],
            ['Ask the designer to hide the controversial text', false],
          ],
          { tags: ['content', 'stakeholders'] },
        ),
        longQ(
          'Brand voice sample',
          'Write 2–3 sentences introducing a project management tool to first-time visitors. Tone: confident, helpful, not hype-driven.',
          { tags: ['content', 'brand-voice'] },
        ),
      ],
    },
    {
      title: 'SEO & content strategy',
      questions: [
        mc(
          'Search intent',
          'A page targeting "how to onboard remote employees" should primarily satisfy which search intent?',
          [
            ['Navigational — user wants your homepage', false],
            ['Informational — user wants guidance and actionable steps', true],
            ['Transactional — user wants to buy immediately', false],
            ['No intent mapping is needed for blog content', false],
          ],
          { tags: ['content', 'seo'] },
        ),
        ms(
          'On-page SEO basics',
          'Which elements help search engines and readers understand a pillar article? (Select all that apply)',
          [
            ['Descriptive title tag and meta description', true],
            ['Keyword stuffing in every paragraph', false],
            ['Internal links to related resources', true],
            ['Scannable subheadings and short paragraphs', true],
            ['Alt text on meaningful images', true],
          ],
          { tags: ['content', 'seo'] },
        ),
        tf(
          'Duplicate content',
          'True or False: Publishing the same article verbatim on two domains always improves SEO reach.',
          false,
          { tags: ['content', 'seo'] },
        ),
        mc(
          'Content funnel mapping',
          'A case study featuring a customer ROI story fits best at which stage of the funnel?',
          [
            ['Top of funnel — awareness only', false],
            ['Middle/bottom — consideration and decision support', true],
            ['It should never be gated or promoted', false],
            ['Only for internal sales training', false],
          ],
          { tags: ['content', 'strategy'] },
        ),
        shortQ(
          'Meta description',
          'What is the primary purpose of a meta description on a search result page?',
          'Summarize the page to encourage relevant clicks',
          { tags: ['content', 'seo'] },
        ),
        listen(
          'Brief comprehension',
          'Stakeholder brief: "We\'re launching in Germany next quarter. Traffic is fine in the US, but we have zero localized pages. Legal needs disclaimers on pricing. Sales says prospects keep asking how we compare to Competitor X. I need something live before the partner conference in six weeks."',
          'Read the scenario and identify the single most important content goal. What is the stakeholder\'s top priority?',
          [
            ['Localized German content ready before the partner conference', true],
            ['Increasing US blog traffic with generic posts', false],
            ['Removing all pricing information from the site', false],
            ['Writing only social media captions', false],
          ],
          { tags: ['content', 'briefs'] },
        ),
        longQ(
          'Editorial calendar pitch',
          'Propose three article topics for a B2B HR software blog in Q1. For each, state target audience and primary keyword theme.',
          { tags: ['content', 'strategy'] },
        ),
      ],
    },
    {
      title: 'Formats & quality assurance',
      questions: [
        mc(
          'Email copy structure',
          'Which structure is most effective for a nurture email promoting a webinar?',
          [
            ['Single paragraph with no CTA to feel personal', false],
            ['Hook → value proposition → social proof → clear CTA', true],
            ['Attachment-only email with no body text', false],
            ['Subject line repeats the entire email content', false],
          ],
          { tags: ['content', 'email'] },
        ),
        ms(
          'Accessibility in content',
          'Which practices improve content accessibility? (Select all that apply)',
          [
            ['Meaningful link text instead of "click here"', true],
            ['Sufficient color contrast for text and buttons', true],
            ['Using images of text instead of real text for headings', false],
            ['Descriptive alt text for informative visuals', true],
            ['Plain-language summaries for complex topics', true],
          ],
          { tags: ['content', 'accessibility'] },
        ),
        tf(
          'AI disclosure',
          'True or False: Publishing AI-assisted drafts without any human review is acceptable for regulated industries.',
          false,
          { tags: ['content', 'ai'] },
        ),
        sjt(
          'Missed deadline',
          'A blog post is due today but your SME interview notes are incomplete. What is the best course of action?',
          [
            ['Publish with fabricated quotes to hit the deadline', false],
            ['Notify stakeholders, propose a revised timeline or a narrower scoped draft', true],
            ['Copy a competitor\'s article and reword lightly', false],
            ['Skip the post silently and hope no one notices', false],
          ],
          { tags: ['content', 'deadlines'] },
        ),
        shortQ(
          'CTA writing',
          'Write a CTA button label (max 4 words) for downloading an employee handbook template.',
          'Download handbook template',
          { tags: ['content', 'cta'] },
        ),
        mc(
          'Content repurposing',
          'You published a 2,000-word guide. What is the highest-leverage repurposing move?',
          [
            ['Delete it after one week to avoid staleness', false],
            ['Extract snippets for social, email, and sales enablement with consistent messaging', true],
            ['Translate it word-for-word into video without adaptation', false],
            ['Hide it behind a form with no summary on the page', false],
          ],
          { tags: ['content', 'distribution'] },
        ),
      ],
    },
  ],
);

// ─── 2. DevOps Engineer ──────────────────────────────────────────────────────

const devopsEngineer = roleTemplate(
  'devops-engineer',
  'DevOps / SRE',
  'DevOps Engineer — Hiring Assessment',
  'Screen infrastructure automation, CI/CD, Kubernetes, observability, and incident response practices.',
  [
    {
      title: 'Infrastructure & automation',
      questions: [
        mc(
          'Terraform state',
          'Why should Terraform remote state be stored with locking enabled (e.g., S3 + DynamoDB)?',
          [
            ['To make `terraform apply` run faster on laptops', false],
            ['To prevent concurrent applies from corrupting shared infrastructure state', true],
            ['Because local state files cannot store resource IDs', false],
            ['Remote state eliminates the need for version control', false],
          ],
          { tags: ['devops', 'terraform'] },
        ),
        ms(
          'Terraform workflow',
          'Which practices belong in a mature Terraform workflow? (Select all that apply)',
          [
            ['Run `terraform plan` in CI before apply', true],
            ['Commit `.tf` files to version control', true],
            ['Store secrets in plain text in `.tfvars` in the repo', false],
            ['Use modules to reuse infrastructure patterns', true],
            ['Pin provider versions', true],
          ],
          { tags: ['devops', 'terraform'] },
        ),
        tf(
          'Immutable infrastructure',
          'True or False: Immutable infrastructure means patching servers in place rather than replacing them.',
          false,
          { tags: ['devops', 'infra'] },
        ),
        code(
          'Shell scripting',
          'Write a Bash one-liner or short script that prints only the pod names in namespace `production` that are not in Running status. Assume `kubectl` is configured.',
          '#!/bin/bash\n# Print pod names not in Running state in production namespace\n',
          'bash',
          { tags: ['devops', 'shell', 'kubernetes'] },
        ),
        mc(
          'IaC drift',
          'An engineer manually changes a security group in the AWS console. What is this called in IaC-managed environments?',
          [
            ['Blue/green deployment', false],
            ['Configuration drift', true],
            ['Horizontal pod autoscaling', false],
            ['Canary release', false],
          ],
          { tags: ['devops', 'terraform'] },
        ),
        shortQ(
          'Environment parity',
          'Name one risk of staging environments that do not mirror production infrastructure.',
          'Production-only failures or misestimated capacity',
          { tags: ['devops', 'environments'] },
        ),
        mc(
          'Secrets management',
          'Where should production database credentials be stored for a Kubernetes application?',
          [
            ['Hard-coded in the container image Dockerfile', false],
            ['Committed in Git on a private branch', false],
            ['Injected via a secrets manager or sealed secrets at deploy time', true],
            ['Emailed to on-call engineers weekly', false],
          ],
          { tags: ['devops', 'security'] },
        ),
      ],
    },
    {
      title: 'CI/CD & Kubernetes',
      questions: [
        mc(
          'CI pipeline ordering',
          'Which stage should typically run earliest in a pull-request CI pipeline?',
          [
            ['Deploy to production', false],
            ['Lint/unit tests on the changed code', true],
            ['Manual approval from the CEO', false],
            ['Database migration on production', false],
          ],
          { tags: ['devops', 'ci'] },
        ),
        ms(
          'Kubernetes primitives',
          'Which Kubernetes resources are involved in running a stateless web API? (Select all that apply)',
          [
            ['Deployment', true],
            ['Service', true],
            ['PersistentVolumeClaim for every pod log line', false],
            ['Ingress or Gateway API route', true],
            ['ConfigMap or Secret for configuration', true],
          ],
          { tags: ['devops', 'kubernetes'] },
        ),
        mc(
          'Rolling update safety',
          'A Deployment has `maxUnavailable: 0` and `maxSurge: 1`. What does this ensure during a rollout?',
          [
            ['All old pods are deleted before any new pod starts', false],
            ['Capacity is maintained — no reduction below desired replicas during rollout', true],
            ['The rollout skips readiness probes', false],
            ['Only one replica can ever exist', false],
          ],
          { tags: ['devops', 'kubernetes'] },
        ),
        tf(
          'CI caching',
          'True or False: Caching dependencies in CI always guarantees reproducible builds without a lockfile.',
          false,
          { tags: ['devops', 'ci'] },
        ),
        mc(
          'GitOps principle',
          'In GitOps, what is the source of truth for desired cluster state?',
          [
            ['The live cluster configuration after manual kubectl edits', false],
            ['A Git repository reviewed via pull request', true],
            ['The last engineer who ran helm install', false],
            ['Slack messages from the on-call channel', false],
          ],
          { tags: ['devops', 'gitops'] },
        ),
        code(
          'CI config concept',
          'Complete this GitHub Actions job snippet so it runs tests only on pull requests to `main`:\n\n```yaml\non:\n  pull_request:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      # add install and test steps\n```',
          'name: CI\non:\n  pull_request:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci && npm test\n',
          'yaml',
          { tags: ['devops', 'ci', 'github-actions'] },
        ),
        sjt(
          'Failed deployment',
          'A CI pipeline passes but the canary deployment shows elevated 5xx errors. What should you do first?',
          [
            ['Roll forward immediately to 100% traffic', false],
            ['Rollback or halt the rollout and compare canary metrics to baseline', true],
            ['Disable monitoring to reduce alert noise', false],
            ['Restart the CI server', false],
          ],
          { tags: ['devops', 'deployments'] },
        ),
      ],
    },
    {
      title: 'Reliability & observability',
      questions: [
        mc(
          'SLI vs SLO',
          'Request latency p99 < 300ms for the checkout API is best classified as:',
          [
            ['An SLI (indicator measurement)', false],
            ['An SLO (target objective)', true],
            ['A postmortem action item', false],
            ['A Kubernetes label', false],
          ],
          { tags: ['devops', 'sre'] },
        ),
        ms(
          'Incident response',
          'During a SEV-1 outage, which actions are appropriate? (Select all that apply)',
          [
            ['Designate an incident commander', true],
            ['Communicate status to stakeholders on a regular cadence', true],
            ['Make multiple uncoordinated production changes at once', false],
            ['Capture a timeline for the postmortem', true],
            ['Blame an individual in the public status page', false],
          ],
          { tags: ['devops', 'incidents'] },
        ),
        tf(
          'Alert fatigue',
          'True or False: Every log error line should trigger a PagerDuty page.',
          false,
          { tags: ['devops', 'observability'] },
        ),
        mc(
          'Health checks',
          'A liveness probe fails repeatedly on a pod. What will Kubernetes typically do?',
          [
            ['Scale the Deployment to zero permanently', false],
            ['Restart the container in the pod', true],
            ['Delete the entire cluster', false],
            ['Ignore the probe if readiness passes', false],
          ],
          { tags: ['devops', 'kubernetes'] },
        ),
        shortQ(
          'MTTR definition',
          'What does MTTR measure in incident management?',
          'Mean time to restore/recover service',
          { tags: ['devops', 'sre'] },
        ),
        longQ(
          'Postmortem outline',
          'Outline the sections you would include in a blameless postmortem after a database failover caused 20 minutes of read-only mode.',
          { tags: ['devops', 'postmortem'] },
        ),
      ],
    },
  ],
);

// ─── 3. Business Analyst ─────────────────────────────────────────────────────

const businessAnalyst = roleTemplate(
  'business-analyst',
  'Business Analysis',
  'Business Analyst — Hiring Assessment',
  'Assess requirements elicitation, process analysis, stakeholder management, and solution evaluation skills.',
  [
    {
      title: 'Requirements & discovery',
      questions: [
        mc(
          'Requirement type',
          '"The system shall send email confirmation within 30 seconds of payment" is best classified as:',
          [
            ['A business rule unrelated to behavior', false],
            ['A non-functional requirement about performance', true],
            ['A user story with no acceptance criteria', false],
            ['A project risk register entry', false],
          ],
          { tags: ['ba', 'requirements'] },
        ),
        ms(
          'Elicitation techniques',
          'Which techniques help uncover latent stakeholder needs? (Select all that apply)',
          [
            ['Structured interviews with open-ended questions', true],
            ['Observing users perform the current workflow', true],
            ['Only reading the existing BRD without talking to users', false],
            ['Workshops with cross-functional participants', true],
            ['Prototyping to validate assumptions', true],
          ],
          { tags: ['ba', 'elicitation'] },
        ),
        tf(
          'Gold plating',
          'True or False: A BA should add features stakeholders did not request if they seem technically impressive.',
          false,
          { tags: ['ba', 'scope'] },
        ),
        listen(
          'Stakeholder request parsing',
          'Stakeholder says: "We need the portal to be faster and easier for approvers. Right now finance chases people on Slack, and we lose audit trail. Also, mobile would be nice but not if it delays Q3."',
          'Which need should the BA prioritize for the initial release?',
          [
            ['Approver workflow speed with auditable trail', true],
            ['Full mobile redesign before any backend changes', false],
            ['Replacing Slack company-wide', false],
            ['Adding gamification badges for approvers', false],
          ],
          { tags: ['ba', 'listening'] },
        ),
        shortQ(
          'SMART criteria',
          'What does the "M" in SMART requirements stand for?',
          'Measurable',
          { tags: ['ba', 'requirements'] },
        ),
        sjt(
          'Conflicting priorities',
          'Sales demands a custom report by Friday; Engineering says the data model is not ready. As BA, you should:',
          [
            ['Promise Friday without consulting Engineering', false],
            ['Facilitate scope negotiation with documented trade-offs and a phased plan', true],
            ['Cancel the report permanently', false],
            ['Build the report yourself in Excel without validation', false],
          ],
          { tags: ['ba', 'stakeholders'] },
        ),
        longQ(
          'User story writing',
          'Write two user stories with acceptance criteria for a self-service password reset feature in a B2B admin portal.',
          { tags: ['ba', 'user-stories'] },
        ),
      ],
    },
    {
      title: 'Process & analysis',
      questions: [
        mc(
          'As-is vs to-be',
          'What is the primary purpose of an as-is process map?',
          [
            ['To document the current state before identifying improvement opportunities', true],
            ['To replace the need for stakeholder interviews', false],
            ['To finalize solution design before discovery', false],
            ['To estimate sprint velocity', false],
          ],
          { tags: ['ba', 'process'] },
        ),
        ms(
          'BPMN elements',
          'In BPMN, which elements commonly appear in an order-fulfillment swimlane diagram? (Select all that apply)',
          [
            ['Tasks/activities', true],
            ['Gateways (decision points)', true],
            ['Database indexes', false],
            ['Pools and lanes for roles/systems', true],
            ['Events (start, intermediate, end)', true],
          ],
          { tags: ['ba', 'bpmn'] },
        ),
        tf(
          'Root cause analysis',
          'True or False: A 5 Whys analysis should stop at the first convenient explanation.',
          false,
          { tags: ['ba', 'analysis'] },
        ),
        mc(
          'MoSCoW prioritization',
          'In MoSCoW, a regulatory audit log feature required for go-live is categorized as:',
          [
            ['Could have', false],
            ['Must have', true],
            ['Won\'t have this time', false],
            ['Nice to have only', false],
          ],
          { tags: ['ba', 'prioritization'] },
        ),
        shortQ(
          'Gap analysis',
          'In one sentence, what does a gap analysis compare?',
          'Current state vs desired future state',
          { tags: ['ba', 'analysis'] },
        ),
        mc(
          'Data dictionary',
          'Why should a BA maintain a data dictionary during a CRM migration?',
          [
            ['To replace all UAT test cases', false],
            ['To align field definitions and transformations across business and technical teams', true],
            ['To eliminate the need for a solution architect', false],
            ['To store meeting minutes only', false],
          ],
          { tags: ['ba', 'data'] },
        ),
        longQ(
          'Process improvement',
          'A manual invoice approval takes 9 days on average. Describe how you would analyze bottlenecks and propose improvements.',
          { tags: ['ba', 'process'] },
        ),
      ],
    },
    {
      title: 'Solution evaluation & communication',
      questions: [
        mc(
          'UAT role',
          'What is the BA\'s primary responsibility during User Acceptance Testing?',
          [
            ['Writing production deployment scripts', false],
            ['Ensuring test scenarios trace to requirements and defects are triaged with business context', true],
            ['Replacing QA entirely', false],
            ['Approving production releases without sign-off', false],
          ],
          { tags: ['ba', 'uat'] },
        ),
        ms(
          'Impact assessment',
          'When evaluating a proposed workflow automation, which factors should a BA assess? (Select all that apply)',
          [
            ['Business value and ROI', true],
            ['Operational risk and exception handling', true],
            ['Font choice on the login page', false],
            ['Change impact on roles and training', true],
            ['Integration touchpoints with existing systems', true],
          ],
          { tags: ['ba', 'evaluation'] },
        ),
        tf(
          'Traceability',
          'True or False: Requirements traceability matrices link needs through design, build, and test artifacts.',
          true,
          { tags: ['ba', 'traceability'] },
        ),
        sjt(
          'Scope creep',
          'Mid-sprint, a director requests "just one more field" that affects three integrations. You should:',
          [
            ['Add it immediately without impact analysis', false],
            ['Document the change, assess impact, and route through change control', true],
            ['Refuse all changes until the next fiscal year', false],
            ['Implement only on production to save time', false],
          ],
          { tags: ['ba', 'scope'] },
        ),
        shortQ(
          'RACI example',
          'In a RACI matrix, who is the "A" (Accountable) for approving a BRD?',
          'Business sponsor or product owner',
          { tags: ['ba', 'governance'] },
        ),
        mc(
          'Effective BRD',
          'Which section is essential in a Business Requirements Document for an external vendor?',
          [
            ['Assumptions, constraints, and out-of-scope items', true],
            ['Engineer\'s personal vacation schedule', false],
            ['Unverified competitor rumors', false],
            ['Source code listings', false],
          ],
          { tags: ['ba', 'documentation'] },
        ),
      ],
    },
  ],
);

// ─── 4. Compliance Officer ───────────────────────────────────────────────────

const complianceOfficer = roleTemplate(
  'compliance-officer',
  'Legal & Compliance',
  'Compliance Officer — Hiring Assessment',
  'Evaluate regulatory awareness, policy design, risk assessment, investigations, and ethical judgment.',
  [
    {
      title: 'Regulatory frameworks',
      questions: [
        mc(
          'GDPR lawful basis',
          'A marketing team wants to email existing customers promotional offers. Which GDPR consideration is most relevant?',
          [
            ['Identify a valid lawful basis and respect opt-out/unsubscribe rights', true],
            ['GDPR does not apply to marketing emails', false],
            ['Consent is never required for any processing', false],
            ['Data may be sold freely if encrypted', false],
          ],
          { tags: ['compliance', 'gdpr'] },
        ),
        ms(
          'Data subject rights',
          'Under GDPR, which are data subject rights organizations must be prepared to address? (Select all that apply)',
          [
            ['Right of access to personal data', true],
            ['Right to erasure in certain circumstances', true],
            ['Right to unlimited free premium services', false],
            ['Right to data portability where applicable', true],
            ['Right to rectification of inaccurate data', true],
          ],
          { tags: ['compliance', 'gdpr'] },
        ),
        tf(
          'SOX internal controls',
          'True or False: SOX requires management to assess and report on internal control over financial reporting for applicable public companies.',
          true,
          { tags: ['compliance', 'sox'] },
        ),
        mc(
          'AML red flags',
          'Which pattern should trigger enhanced due diligence in an AML program?',
          [
            ['Structuring deposits just below reporting thresholds', true],
            ['A single verified payroll deposit', false],
            ['Customer updating their mailing address', false],
            ['Routine subscription renewal payment', false],
          ],
          { tags: ['compliance', 'aml'] },
        ),
        shortQ(
          'PCI scope',
          'What is the primary goal of PCI DSS?',
          'Protect cardholder data and secure payment environments',
          { tags: ['compliance', 'pci'] },
        ),
        listen(
          'Regulatory inquiry',
          'Legal counsel forwards a regulator\'s email: "Please provide policies on data retention, breach notification timelines, and evidence of workforce training completed in the last 12 months. Response due in 10 business days."',
          'What should the compliance officer do first?',
          [
            ['Acknowledge receipt, assemble a cross-functional response team, and track deadlines', true],
            ['Delete the email to reduce liability', false],
            ['Reply with marketing brochures only', false],
            ['Wait until day 10 to start gathering documents', false],
          ],
          { tags: ['compliance', 'regulatory'] },
        ),
        mc(
          'Cross-border transfers',
          'When transferring EU personal data to a US vendor, a compliance officer should verify:',
          [
            ['Appropriate transfer mechanism (e.g., SCCs) and vendor security posture', true],
            ['Only that the vendor has a .com domain', false],
            ['That encryption removes all compliance obligations', false],
            ['Verbal assurance from sales', false],
          ],
          { tags: ['compliance', 'privacy'] },
        ),
      ],
    },
    {
      title: 'Policy & risk management',
      questions: [
        mc(
          'Policy lifecycle',
          'What is the correct order for a robust compliance policy lifecycle?',
          [
            ['Publish → ignore feedback → never review', false],
            ['Draft → stakeholder review → approve → train → monitor → periodic review', true],
            ['Train employees before the policy is written', false],
            ['Archive policies immediately after approval', false],
          ],
          { tags: ['compliance', 'policy'] },
        ),
        ms(
          'Risk assessment components',
          'A compliance risk assessment should typically include: (Select all that apply)',
          [
            ['Inherent and residual risk ratings', true],
            ['Identified controls and control owners', true],
            ['Employee favorite lunch orders', false],
            ['Likelihood and impact analysis', true],
            ['Remediation plans for gaps', true],
          ],
          { tags: ['compliance', 'risk'] },
        ),
        tf(
          'Tone at the top',
          'True or False: Ethical culture is driven solely by the compliance department without leadership involvement.',
          false,
          { tags: ['compliance', 'ethics'] },
        ),
        sjt(
          'Gift policy exception',
          'A vendor offers playoff tickets to a procurement manager during an active RFP. You should:',
          [
            ['Encourage acceptance to build relationships', false],
            ['Decline or disclose per gifts policy and document the offer', true],
            ['Accept tickets but do not tell anyone', false],
            ['Disqualify the vendor without investigation', false],
          ],
          { tags: ['compliance', 'conflicts'] },
        ),
        shortQ(
          'Three lines of defense',
          'Name the three lines of defense model roles at a high level.',
          'Operations, risk/compliance, internal audit',
          { tags: ['compliance', 'governance'] },
        ),
        mc(
          'Record retention',
          'A litigation hold is issued. What happens to scheduled deletion of relevant emails?',
          [
            ['Deletion proceeds on schedule', false],
            ['Relevant records must be preserved until the hold is released', true],
            ['Only paper records are affected', false],
            ['Employees may delete at their discretion', false],
          ],
          { tags: ['compliance', 'records'] },
        ),
        longQ(
          'Code of conduct rollout',
          'Describe how you would roll out an updated Code of Conduct to a 500-person global workforce, including training and attestation.',
          { tags: ['compliance', 'training'] },
        ),
      ],
    },
    {
      title: 'Investigations & reporting',
      questions: [
        mc(
          'Whistleblower intake',
          'An anonymous hotline report alleges manager retaliation. Your first step is to:',
          [
            ['Confront the accused manager immediately in a group meeting', false],
            ['Log the report, assess urgency, and initiate a confidential fact-finding process', true],
            ['Ignore anonymous reports as unverifiable', false],
            ['Announce the allegation company-wide', false],
          ],
          { tags: ['compliance', 'investigations'] },
        ),
        ms(
          'Investigation principles',
          'Which practices support a fair internal investigation? (Select all that apply)',
          [
            ['Impartial investigator without direct conflict', true],
            ['Documenting interviews and evidence chain of custody', true],
            ['Predetermined outcome before interviews', false],
            ['Consistent application of policy', true],
            ['Appropriate confidentiality limits', true],
          ],
          { tags: ['compliance', 'investigations'] },
        ),
        tf(
          'Self-reporting',
          'True or False: Proactively self-reporting certain regulatory violations to authorities may be required or beneficial depending on jurisdiction and program.',
          true,
          { tags: ['compliance', 'reporting'] },
        ),
        sjt(
          'Data breach timing',
          'IT confirms unauthorized access to customer PII at 4pm Friday. The compliance officer should:',
          [
            ['Wait until Monday to avoid weekend work', false],
            ['Activate the incident response plan, involve Legal/Privacy, and assess notification obligations', true],
            ['Publicly blame IT on social media', false],
            ['Pay the attacker before assessing scope', false],
          ],
          { tags: ['compliance', 'breach'] },
        ),
        shortQ(
          'Conflict of interest',
          'Define "conflict of interest" in a workplace context.',
          'When personal interests could improperly influence professional duties',
          { tags: ['compliance', 'ethics'] },
        ),
        mc(
          'Regulatory examination prep',
          'Before an on-site regulatory exam, the best preparation includes:',
          [
            ['Organizing policies, logs, training records, and designating knowledgeable points of contact', true],
            ['Deleting audit logs to save storage', false],
            ['Coaching employees to say "I don\'t know" to every question', false],
            ['Hiding third-party vendor contracts', false],
          ],
          { tags: ['compliance', 'exams'] },
        ),
      ],
    },
  ],
);

// ─── 5. Customer Success Manager ───────────────────────────────────────────

const customerSuccessManager = roleTemplate(
  'customer-success-manager',
  'Customer Success',
  'Customer Success Manager — Hiring Assessment',
  'Measure onboarding expertise, adoption strategy, renewal risk management, and executive relationship skills.',
  [
    {
      title: 'Onboarding & adoption',
      questions: [
        mc(
          'Time to value',
          'What is the primary goal of a structured customer onboarding plan?',
          [
            ['Maximize contract length legal text review', false],
            ['Help the customer achieve first meaningful value quickly', true],
            ['Delay training until renewal quarter', false],
            ['Reduce product usage to lower support costs', false],
          ],
          { tags: ['cs', 'onboarding'] },
        ),
        ms(
          'Success plan elements',
          'A strong customer success plan should include: (Select all that apply)',
          [
            ['Defined success metrics tied to customer outcomes', true],
            ['Key stakeholders and their roles', true],
            ['Only internal revenue targets with no customer goals', false],
            ['Milestones and mutual accountability', true],
            ['Risk factors and mitigation steps', true],
          ],
          { tags: ['cs', 'success-plans'] },
        ),
        tf(
          'Handoff quality',
          'True or False: A CSM can drive adoption effectively without understanding what was promised during the sales cycle.',
          false,
          { tags: ['cs', 'handoff'] },
        ),
        listen(
          'Kickoff call notes',
          'New customer says: "We bought this for reporting, but our ops team still uses spreadsheets. Our VP wants dashboards live before board meeting in 5 weeks. IT needs SSO. Champion is Sarah in Ops; CFO signs renewals."',
          'Who is the primary champion the CSM should partner with first?',
          [
            ['Sarah in Ops', true],
            ['The CFO only', false],
            ['IT exclusively, ignoring Ops', false],
            ['A competitor\'s account manager', false],
          ],
          { tags: ['cs', 'discovery'] },
        ),
        shortQ(
          'Health score',
          'Name two quantitative signals that might feed a customer health score.',
          'Product login frequency and support ticket volume',
          { tags: ['cs', 'health'] },
        ),
        sjt(
          'Low engagement',
          '30 days post-launch, usage is 20% of expected. Your best first move is:',
          [
            ['Send a generic "checking in" email once', false],
            ['Schedule a value review with the champion to identify blockers and re-align on goals', true],
            ['Threaten cancellation fees immediately', false],
            ['Wait until renewal to discuss adoption', false],
          ],
          { tags: ['cs', 'adoption'] },
        ),
        longQ(
          'Onboarding playbook',
          'Outline a 30-60-90 day onboarding plan for a mid-market SaaS customer implementing an analytics module.',
          { tags: ['cs', 'onboarding'] },
        ),
      ],
    },
    {
      title: 'Retention & expansion',
      questions: [
        mc(
          'Churn risk signal',
          'Which signal most strongly indicates renewal risk?',
          [
            ['Champion left the company and no replacement engaged', true],
            ['Customer attends your user webinar', false],
            ['Increasing weekly active users', false],
            ['Customer completes QBR with positive ROI discussion', false],
          ],
          { tags: ['cs', 'retention'] },
        ),
        ms(
          'QBR best practices',
          'An effective Quarterly Business Review should: (Select all that apply)',
          [
            ['Review progress against agreed success metrics', true],
            ['Highlight wins and unresolved blockers', true],
            ['Be a product demo with no customer data', false],
            ['Align on next-quarter priorities', true],
            ['Include relevant executive stakeholders when appropriate', true],
          ],
          { tags: ['cs', 'qbr'] },
        ),
        tf(
          'NRR vs GRR',
          'True or False: Net Revenue Retention (NRR) can exceed 100% when expansion revenue outweighs churn and contraction.',
          true,
          { tags: ['cs', 'metrics'] },
        ),
        mc(
          'Expansion timing',
          'When is the best time to discuss upsell opportunities?',
          [
            ['Only in the final week of the contract', false],
            ['When the customer has demonstrated value on current use cases', true],
            ['Immediately after signing before onboarding', false],
            ['After filing a support complaint', false],
          ],
          { tags: ['cs', 'expansion'] },
        ),
        shortQ(
          'CSAT vs NPS',
          'In one sentence, how does NPS differ from transactional CSAT?',
          'NPS measures loyalty likelihood; CSAT measures satisfaction with a specific interaction',
          { tags: ['cs', 'metrics'] },
        ),
        sjt(
          'Price increase',
          'Finance mandates a 15% price increase at renewal for a at-risk account. You should:',
          [
            ['Apply increase with no conversation', false],
            ['Prepare value justification, explore packaging options, and escalate internally if risk is high', true],
            ['Hide the increase until signature', false],
            ['Offer free lifetime service to avoid the conversation', false],
          ],
          { tags: ['cs', 'renewals'] },
        ),
        mc(
          'Renewal forecasting',
          'Which data best improves renewal forecast accuracy?',
          [
            ['Gut feeling from one rep', false],
            ['Health score, usage trends, stakeholder map, and open support/escalations', true],
            ['Number of emails sent only', false],
            ['Competitor\'s stock price', false],
          ],
          { tags: ['cs', 'forecasting'] },
        ),
      ],
    },
    {
      title: 'Relationships & advocacy',
      questions: [
        mc(
          'Executive alignment',
          'A CSM secures an executive sponsor meeting. The agenda should prioritize:',
          [
            ['Reading the entire product roadmap verbatim', false],
            ['Business outcomes, risks, and decisions needed from the executive', true],
            ['Internal company reorganization details', false],
            ['Unrelated discount negotiations only', false],
          ],
          { tags: ['cs', 'executive'] },
        ),
        ms(
          'Escalation management',
          'When handling a SEV-1 customer escalation, a CSM should: (Select all that apply)',
          [
            ['Own internal coordination and customer communication cadence', true],
            ['Provide transparent timelines even when incomplete', true],
            ['Promise root cause fixes without engineering input', false],
            ['Document commitments and follow-ups', true],
            ['Loop in leadership when impact or SLA breach warrants', true],
          ],
          { tags: ['cs', 'escalations'] },
        ),
        tf(
          'Advocacy programs',
          'True or False: Customer references and case studies should only come from accounts with perfect health scores and no past issues.',
          false,
          { tags: ['cs', 'advocacy'] },
        ),
        sjt(
          'Feature gap',
          'A key customer threatens churn over a missing feature on the roadmap. You should:',
          [
            ['Promise a delivery date not confirmed by Product', false],
            ['Validate impact, explore workarounds, partner with Product on prioritization, and document a joint plan', true],
            ['Ignore the threat until renewal', false],
            ['Blame the customer for mis-buying', false],
          ],
          { tags: ['cs', 'retention'] },
        ),
        shortQ(
          'Mutual action plan',
          'What is a mutual action plan (MAP) in enterprise CS?',
          'Shared timeline of customer and vendor actions toward go-live or outcomes',
          { tags: ['cs', 'enterprise'] },
        ),
        longQ(
          'Turnaround plan',
          'A strategic account is yellow on health score: declining usage, new stakeholder skeptical of ROI. Write a 60-day turnaround outline.',
          { tags: ['cs', 'retention'] },
        ),
      ],
    },
  ],
);

// ─── 6. Executive Assistant ────────────────────────────────────────────────

const executiveAssistant = roleTemplate(
  'executive-assistant',
  'Executive Assistant / Admin',
  'Executive Assistant — Hiring Assessment',
  'Assess calendar management, communication polish, confidentiality, travel coordination, and executive support judgment.',
  [
    {
      title: 'Organization & prioritization',
      questions: [
        mc(
          'Calendar triage',
          'The CEO\'s calendar is full. A board member requests an urgent 30-minute slot today. You should:',
          [
            ['Cancel the CEO\'s existing 1:1s without asking', false],
            ['Assess urgency with context, propose options, and confirm with the CEO before moving commitments', true],
            ['Tell the board member the CEO is unavailable until next month', false],
            ['Double-book all meetings', false],
          ],
          { tags: ['ea', 'calendar'] },
        ),
        ms(
          'Inbox management',
          'When managing an executive\'s inbox, which practices are appropriate? (Select all that apply)',
          [
            ['Flag urgent items with brief context summaries', true],
            ['Respond to routine scheduling requests within delegated authority', true],
            ['Share confidential emails with unauthorized colleagues', false],
            ['Use consistent labeling or folder systems', true],
            ['Draft replies for executive review on sensitive topics', true],
          ],
          { tags: ['ea', 'communication'] },
        ),
        tf(
          'Gatekeeping',
          'True or False: An EA should block all external requests without providing alternatives or context to the executive.',
          false,
          { tags: ['ea', 'prioritization'] },
        ),
        shortQ(
          'Meeting prep',
          'List three items you would prepare before a high-stakes investor meeting.',
          'Agenda, briefing doc, attendee bios, logistics',
          { tags: ['ea', 'preparation'] },
        ),
        mc(
          'Time zones',
          'Scheduling a global leadership call across San Francisco, London, and Singapore requires you to:',
          [
            ['Pick the time convenient only for the executive\'s home office', false],
            ['Propose options that balance reasonable local hours and confirm RSVPs with dial-in details', true],
            ['Send invites without time zone labels', false],
            ['Schedule at 3am for all locations equally', false],
          ],
          { tags: ['ea', 'scheduling'] },
        ),
        sjt(
          'Conflicting VIP requests',
          'Two C-suite leaders demand the same conference room at 2pm for client meetings. You should:',
          [
            ['Give the room to whoever emails loudest', false],
            ['Clarify priorities with your executive, offer alternatives, and communicate professionally to both parties', true],
            ['Cancel both meetings', false],
            ['Book a hallway without informing anyone', false],
          ],
          { tags: ['ea', 'conflicts'] },
        ),
        longQ(
          'Weekly rhythm',
          'Describe how you would structure a CEO\'s weekly calendar rhythm to protect focus time while staying accessible to the leadership team.',
          { tags: ['ea', 'calendar'] },
        ),
      ],
    },
    {
      title: 'Communication & confidentiality',
      questions: [
        mc(
          'Confidential documents',
          'An executive forwards a confidential M&A deck asking you to print copies. You should:',
          [
            ['Leave copies on the public printer tray', false],
            ['Use secure printing, limit distribution, and track who receives copies', true],
            ['Email the deck to all assistants for visibility', false],
            ['Post it in a shared Slack channel for convenience', false],
          ],
          { tags: ['ea', 'confidentiality'] },
        ),
        ms(
          'Professional correspondence',
          'Which elements make executive correspondence professional? (Select all that apply)',
          [
            ['Clear subject line and purpose in the first paragraph', true],
            ['Correct names, titles, and spelling', true],
            ['Excessive emojis on all investor emails', false],
            ['Appropriate tone for the audience', true],
            ['Proofreading before send', true],
          ],
          { tags: ['ea', 'writing'] },
        ),
        tf(
          'NDA awareness',
          'True or False: EAs may discuss executive travel and meeting details publicly on personal social media.',
          false,
          { tags: ['ea', 'confidentiality'] },
        ),
        listen(
          'Travel disruption',
          'Executive\'s assistant hotline message: "Flight cancelled due to weather. Board dinner starts at 7pm in Chicago. CEO must present slides at 8am tomorrow. Passport is with travel agency for visa renewal."',
          'What is your immediate priority?',
          [
            ['Rebook travel to arrive before the 8am presentation with contingency plans', true],
            ['Wait until morning to see if flights resume', false],
            ['Cancel the board dinner without telling anyone', false],
            ['Ask the CEO to present remotely without checking venue AV', false],
          ],
          { tags: ['ea', 'travel'] },
        ),
        shortQ(
          'Discretion scenario',
          'A journalist calls asking to confirm your CEO\'s whereabouts. What do you say?',
          'Decline to confirm; refer to communications or provide approved statement',
          { tags: ['ea', 'discretion'] },
        ),
        mc(
          'Expense compliance',
          'When submitting executive expenses, you should:',
          [
            ['Combine personal and business charges to save time', false],
            ['Ensure receipts, coding, and policy compliance before submission', true],
            ['Delay submission until finance chases repeatedly', false],
            ['Round all amounts up for convenience', false],
          ],
          { tags: ['ea', 'expenses'] },
        ),
        longQ(
          'Event briefing',
          'Write a one-page briefing note for your executive attending an industry awards dinner, including attendees, objectives, and talking points.',
          { tags: ['ea', 'briefings'] },
        ),
      ],
    },
    {
      title: 'Executive support scenarios',
      questions: [
        mc(
          'Travel booking',
          'Booking international executive travel requires checking:',
          [
            ['Visa/passport validity, loyalty programs, meeting locations, and cancellation flexibility', true],
            ['Only the cheapest fare regardless of arrival time', false],
            ['Random hotels without safety consideration', false],
            ['Nothing — executives always book themselves', false],
          ],
          { tags: ['ea', 'travel'] },
        ),
        ms(
          'Office operations',
          'Which tasks commonly fall within an EA\'s scope at a growing startup? (Select all that apply)',
          [
            ['Coordinating all-hands logistics', true],
            ['Managing vendor relationships for office supplies', true],
            ['Setting company engineering architecture', false],
            ['Onboarding visitors and security protocols', true],
            ['Preparing board meeting materials', true],
          ],
          { tags: ['ea', 'operations'] },
        ),
        tf(
          'Proactive support',
          'True or False: Strong EAs anticipate needs (materials, logistics, follow-ups) before being asked.',
          true,
          { tags: ['ea', 'proactive'] },
        ),
        sjt(
          'Executive illness',
          'Your CEO wakes up ill on the day of an external keynote. You should:',
          [
            ['Do nothing and let organizers figure it out', false],
            ['Notify stakeholders immediately, explore reschedule/delegate options, and prepare talking points for comms', true],
            ['Announce CEO departure from the company', false],
            ['Force the CEO to attend regardless of health', false],
          ],
          { tags: ['ea', 'crisis'] },
        ),
        shortQ(
          'Follow-up discipline',
          'After an executive meeting, what three follow-up actions should an EA typically track?',
          'Action items, owners, deadlines',
          { tags: ['ea', 'follow-up'] },
        ),
        mc(
          'Tool proficiency',
          'Which approach best maintains version control on a board deck with multiple contributors?',
          [
            ['Email attachments named final_v9_really_final.pptx', false],
            ['Central shared drive with naming conventions, edit rights, and a single source-of-truth file', true],
            ['Each contributor keeps a separate copy only on desktop', false],
            ['Delete older versions without telling anyone', false],
          ],
          { tags: ['ea', 'tools'] },
        ),
      ],
    },
  ],
);

export const BATCH3_TEMPLATES: RoleAssessmentTemplate[] = [
  contentWriter,
  devopsEngineer,
  businessAnalyst,
  complianceOfficer,
  customerSuccessManager,
  executiveAssistant,
];
