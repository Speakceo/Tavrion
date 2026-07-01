import type { RoleAssessmentTemplate } from '../roleAssessmentTemplates';
import {
  roleTemplate,
  mc,
  ms,
  tf,
  sjt,
  shortQ,
  longQ,
  listen,
  audio,
  video,
  sqlQ,
  cognitive,
} from '../templateBuilders';

export const BATCH2_TEMPLATES: RoleAssessmentTemplate[] = [
  roleTemplate(
    'data-analyst',
    'Data & Analytics',
    'Data Analyst — Skills Assessment',
    'Evaluate statistical literacy, SQL proficiency, data storytelling, and analytical judgment for data analyst roles.',
    [
      {
        title: 'Data literacy & statistics',
        instructions: 'Answer based on standard analytics practice in a business context.',
        questions: [
          mc(
            'Central tendency',
            'A revenue dataset has a few very large enterprise deals skewing the distribution. Which measure best represents typical deal size?',
            [
              ['Mean', false],
              ['Median', true],
              ['Mode', false],
              ['Range', false],
            ],
            { tags: ['data-analyst', 'statistics'], difficulty: 'easy' },
          ),
          ms(
            'Data quality checks',
            'Which issues should you flag during initial data profiling? (Select all that apply)',
            [
              ['Unexpected null values in required fields', true],
              ['Duplicate primary keys', true],
              ['Consistent date formats across rows', false],
              ['Values outside plausible business ranges', true],
            ],
            { tags: ['data-analyst', 'data-quality'] },
          ),
          tf(
            'Correlation vs causation',
            'True or False: A strong positive correlation between ice cream sales and sunscreen sales proves that buying sunscreen causes people to buy ice cream.',
            false,
            { tags: ['data-analyst', 'statistics'] },
          ),
          mc(
            'Visualization choice',
            'You need to show how monthly active users changed over the past 12 months. Which chart type is most appropriate?',
            [
              ['Pie chart', false],
              ['Line chart', true],
              ['Scatter plot', false],
              ['Treemap', false],
            ],
            { tags: ['data-analyst', 'visualization'] },
          ),
          ms(
            'KPI selection',
            'Which metrics are leading indicators for a subscription SaaS product? (Select all that apply)',
            [
              ['Trial-to-paid conversion rate', true],
              ['Monthly churn rate', true],
              ['Total historical revenue', false],
              ['Activation rate within first 7 days', true],
            ],
            { tags: ['data-analyst', 'kpis'] },
          ),
          tf(
            'Primary keys',
            'True or False: A table can have multiple primary keys active at the same time on overlapping columns.',
            false,
            { tags: ['data-analyst', 'sql'] },
          ),
          shortQ(
            'Cohort analysis',
            'In one or two sentences, explain what cohort analysis is and when you would use it.',
            'Grouping users by a shared start event and tracking behavior over time',
            { tags: ['data-analyst', 'analytics'] },
          ),
        ],
      },
      {
        title: 'SQL & analytical thinking',
        instructions: 'Write valid SQL where prompted. Assume standard PostgreSQL syntax.',
        questions: [
          sqlQ(
            'Monthly revenue by product',
            'Given tables `orders(id, user_id, product_id, amount, created_at)` and `products(id, name)`, write a SQL query that returns each product name and total revenue for orders placed in the current calendar month.',
            { tags: ['data-analyst', 'sql'], difficulty: 'medium' },
          ),
          sqlQ(
            'Second purchase cohort',
            'Given `orders(user_id, order_id, created_at)`, write a SQL query that returns the count of users who placed exactly two orders, where the second order occurred within 30 days of the first.',
            { tags: ['data-analyst', 'sql'], difficulty: 'hard' },
          ),
          mc(
            'Window functions',
            'You want each row to show a user\'s order total alongside their running year-to-date total without collapsing rows. Which approach is best?',
            [
              ['GROUP BY with SUM', false],
              ['Window function such as SUM() OVER', true],
              ['CROSS JOIN', false],
              ['UNION ALL', false],
            ],
            { tags: ['data-analyst', 'sql'] },
          ),
          mc(
            'ETL vs ELT',
            'Your warehouse team loads raw data first and transforms inside the warehouse using dbt. This pattern is best described as:',
            [
              ['ETL', false],
              ['ELT', true],
              ['OLAP only', false],
              ['Reverse ETL', false],
            ],
            { tags: ['data-analyst', 'data-engineering'] },
          ),
          sjt(
            'Metric disagreement',
            'Marketing reports a 40% lift from a campaign, but your controlled analysis shows 8%. Leadership wants to publish the higher number. What do you do first?',
            [
              ['Publish the 40% figure to avoid conflict', false],
              ['Document methodology differences and schedule a review with stakeholders', true],
              ['Delete the analysis and start over', false],
              ['Blame the data pipeline publicly', false],
            ],
            { tags: ['data-analyst', 'stakeholders'], difficulty: 'hard' },
          ),
          longQ(
            'Conversion drop investigation',
            'Signup conversion dropped 15% week-over-week. Describe how you would investigate root cause, including data sources, segmentation, and validation steps.',
            { tags: ['data-analyst', 'analysis'], difficulty: 'hard' },
          ),
          ms(
            'SQL best practices',
            'Which practices improve maintainable analytics SQL? (Select all that apply)',
            [
              ['Use CTEs to break complex logic into readable steps', true],
              ['Select * in production dashboards', false],
              ['Comment non-obvious business logic', true],
              ['Filter early to reduce scanned data when possible', true],
            ],
            { tags: ['data-analyst', 'sql'] },
          ),
        ],
      },
      {
        title: 'Communication & presentation',
        instructions: 'Focus on clarity for non-technical audiences where noted.',
        questions: [
          listen(
            'Executive summary',
            'The quarterly review notes: "Enterprise segment grew 22% YoY but SMB churn rose to 4.8%. Support ticket volume increased 30%, mostly billing-related. NPS held steady at 41."',
            'Based on the passage, what is the most urgent issue to investigate?',
            [
              ['Rising SMB churn potentially linked to billing friction', true],
              ['Flat NPS score', false],
              ['Enterprise growth rate', false],
              ['Year-over-year comparison method', false],
            ],
            { tags: ['data-analyst', 'communication'] },
          ),
          sjt(
            'Ambiguous request',
            'A VP asks for "the dashboard by Friday" without specifying metrics or audience. What is your best first response?',
            [
              ['Build a generic dashboard with every metric available', false],
              ['Clarify decisions, audience, and success criteria before building', true],
              ['Refuse until they write a full spec', false],
              ['Copy last quarter\'s deck and change the date', false],
            ],
            { tags: ['data-analyst', 'stakeholders'] },
          ),
          shortQ(
            'Chart recommendation',
            'A product team wants to compare conversion rates across five onboarding experiments with confidence intervals. Name the chart type you would recommend and why.',
            'Grouped bar chart or dot plot with error bars',
            { tags: ['data-analyst', 'visualization'] },
          ),
          audio(
            'Explain a finding',
            'Record a 90-second explanation of a recent analysis you performed (real or hypothetical): the business question, approach, key finding, and recommended action for a non-technical manager.',
            { tags: ['data-analyst', 'communication'], difficulty: 'medium' },
          ),
          video(
            'Dashboard walkthrough',
            'Record a 2-minute video walking through how you would present a dashboard insight to leadership, including what you would highlight and what caveats you would mention.',
            { tags: ['data-analyst', 'presentation'], difficulty: 'hard' },
          ),
          tf(
            'P-hacking awareness',
            'True or False: Running many statistical tests and only reporting significant results is acceptable if it supports business goals.',
            false,
            { tags: ['data-analyst', 'statistics'] },
          ),
        ],
      },
    ],
    { tags: ['data-analyst', 'hiring', 'template'] },
  ),

  roleTemplate(
    'hr-generalist',
    'Human Resources',
    'HR Generalist — Skills Assessment',
    'Screen HR fundamentals, employment law awareness, employee relations, and people operations judgment.',
    [
      {
        title: 'HR fundamentals',
        questions: [
          mc(
            'Full-cycle recruiting',
            'At which stage should structured scorecards be finalized for a hiring process?',
            [
              ['After the final interview', false],
              ['Before interviews begin', true],
              ['Only if the role is executive-level', false],
              ['After an offer is accepted', false],
            ],
            { tags: ['hr', 'recruiting'] },
          ),
          ms(
            'Onboarding essentials',
            'Which elements belong in a strong first-week onboarding plan? (Select all that apply)',
            [
              ['Role expectations and 30-60-90 day goals', true],
              ['Benefits enrollment guidance', true],
              ['Immediate access to all admin systems without training', false],
              ['Introductions to key cross-functional partners', true],
            ],
            { tags: ['hr', 'onboarding'] },
          ),
          tf(
            'At-will employment',
            'True or False: "At-will" employment means employers can terminate for any reason, including illegal discriminatory reasons.',
            false,
            { tags: ['hr', 'compliance'] },
          ),
          mc(
            'Performance management',
            'What is the primary purpose of a performance improvement plan (PIP)?',
            [
              ['To create documentation before termination in every case', false],
              ['To clarify expectations, support improvement, and document progress', true],
              ['To reduce salary automatically', false],
              ['To replace regular coaching conversations', false],
            ],
            { tags: ['hr', 'performance'] },
          ),
          cognitive(
            'Policy interpretation',
            'A policy states employees must request PTO at least two weeks in advance except for emergencies. An employee gives one day notice for a family emergency. What is the most appropriate HR response?',
            [
              ['Deny automatically per policy', false],
              ['Apply the emergency exception and document the approval', true],
              ['Approve but issue a written warning', false],
              ['Ignore the request', false],
            ],
            { tags: ['hr', 'policy'] },
          ),
          shortQ(
            'Job description quality',
            'List two characteristics of an inclusive, effective job description.',
            'Clear requirements vs nice-to-haves; inclusive language; realistic qualifications',
            { tags: ['hr', 'recruiting'] },
          ),
          tf(
            'Confidentiality',
            'True or False: HR may share details of an employee harassment investigation with the accused employee\'s team lead without restrictions.',
            false,
            { tags: ['hr', 'compliance'] },
          ),
        ],
      },
      {
        title: 'Employee relations & compliance',
        questions: [
          sjt(
            'Interpersonal conflict',
            'Two high performers disagree publicly in a meeting and complaints are escalating. What should HR do first?',
            [
              ['Transfer one employee immediately', false],
              ['Meet separately to understand facts and assess policy concerns', true],
              ['Ignore it unless a manager escalates', false],
              ['Announce a team-wide warning email', false],
            ],
            { tags: ['hr', 'employee-relations'], difficulty: 'hard' },
          ),
          mc(
            'FMLA basics',
            'In the U.S., which condition generally qualifies an employee for FMLA leave eligibility (assuming employer coverage)?',
            [
              ['Any personal vacation request', false],
              ['Serious health condition affecting employee or qualifying family member', true],
              ['Desire to work remotely', false],
              ['Dissatisfaction with manager', false],
            ],
            { tags: ['hr', 'compliance'] },
          ),
          ms(
            'Investigation steps',
            'When conducting a workplace conduct investigation, which steps are appropriate? (Select all that apply)',
            [
              ['Interview relevant parties and witnesses', true],
              ['Maintain confidentiality to the extent possible', true],
              ['Announce findings company-wide before conclusion', false],
              ['Document timelines and evidence', true],
            ],
            { tags: ['hr', 'investigations'] },
          ),
          longQ(
            'Remote policy rollout',
            'Your company is shifting from fully remote to hybrid three days per week. Describe how you would communicate the change, address concerns, and measure adoption fairly.',
            { tags: ['hr', 'change-management'], difficulty: 'hard' },
          ),
          mc(
            'Compensation philosophy',
            'A manager wants to give a large off-cycle raise to retain one employee without reviewing equity across the team. What is HR\'s best guidance?',
            [
              ['Approve immediately to avoid attrition', false],
              ['Review internal equity, role scope, and budget with a consistent framework', true],
              ['Refuse all off-cycle adjustments', false],
              ['Ask the employee to keep the raise confidential', false],
            ],
            { tags: ['hr', 'compensation'] },
          ),
          shortQ(
            'Documentation',
            'Why is contemporaneous documentation important after a sensitive employee conversation?',
            'Accurate record of facts, decisions, and follow-ups for consistency and compliance',
            { tags: ['hr', 'documentation'] },
          ),
          tf(
            'I-9 verification',
            'True or False: Employers may specify which documents an employee must present for I-9 verification from the Lists of Acceptable Documents.',
            false,
            { tags: ['hr', 'compliance'] },
          ),
        ],
      },
      {
        title: 'Communication & situational judgment',
        instructions: 'Record audio/video responses in a professional, confidential tone.',
        questions: [
          listen(
            'Employee concern',
            'An employee tells HR: "I feel excluded from decisions on my project. My manager dismisses my ideas in front of others. I\'m not sure if it\'s bias or just my performance."',
            'What is the most appropriate immediate next step?',
            [
              ['Gather more information and explain formal complaint options', true],
              ['Tell them to toughen up', false],
              ['Confront the manager in a group setting', false],
              ['Promise a specific investigation outcome', false],
            ],
            { tags: ['hr', 'employee-relations'] },
          ),
          sjt(
            'Offer negotiation',
            'A finalist candidate requests a higher salary than the approved band citing a competing offer. Recruiting wants to close quickly. What do you do?',
            [
              ['Automatically match the competing offer', false],
              ['Evaluate band flexibility, internal equity, and role criticality with hiring manager', true],
              ['Withdraw the offer', false],
              ['Share other candidates\' salaries', false],
            ],
            { tags: ['hr', 'recruiting'], difficulty: 'hard' },
          ),
          audio(
            'Manager coaching',
            'Record a 90-second coaching message to a new manager who is uncomfortable giving constructive feedback to a direct report.',
            { tags: ['hr', 'communication'] },
          ),
          video(
            'Culture interview',
            'Record a 2-minute video answering: "How do you balance empathy with policy when supporting employees through difficult situations?"',
            { tags: ['hr', 'culture'], difficulty: 'medium' },
          ),
          mc(
            'Engagement surveys',
            'Survey participation is 38% and trending down. What is the most effective first intervention?',
            [
              ['Send more reminder emails only', false],
              ['Share actions taken from prior feedback and involve managers in closing the loop', true],
              ['Make participation optional forever', false],
              ['Remove anonymity', false],
            ],
            { tags: ['hr', 'engagement'] },
          ),
          ms(
            'HR metrics',
            'Which metrics help HR demonstrate business impact? (Select all that apply)',
            [
              ['Quality-of-hire indicators', true],
              ['Time-to-fill paired with retention at 12 months', true],
              ['Number of emails sent by HR', false],
              ['Regrettable attrition rate', true],
            ],
            { tags: ['hr', 'analytics'] },
          ),
        ],
      },
    ],
    { tags: ['hr-generalist', 'hiring', 'template'] },
  ),

  roleTemplate(
    'product-manager',
    'Product',
    'Product Manager — Skills Assessment',
    'Assess product sense, prioritization, discovery, execution judgment, and stakeholder communication.',
    [
      {
        title: 'Product sense & discovery',
        questions: [
          mc(
            'Problem validation',
            'Before building a major feature, what is the strongest signal that a problem is worth solving?',
            [
              ['A single executive request', false],
              ['Repeated evidence from target users tied to measurable pain', true],
              ['Competitor launched something similar', false],
              ['Engineering finds the solution interesting', false],
            ],
            { tags: ['product', 'discovery'] },
          ),
          ms(
            'Discovery methods',
            'Which activities are appropriate during product discovery? (Select all that apply)',
            [
              ['Customer interviews focused on past behavior', true],
              ['Usability tests on prototypes', true],
              ['Committing to a launch date before learning', false],
              ['Analyzing funnel drop-off data', true],
            ],
            { tags: ['product', 'discovery'] },
          ),
          tf(
            'Feature factory',
            'True or False: A product roadmap should primarily be a list of features promised to sales for the next quarter.',
            false,
            { tags: ['product', 'strategy'] },
          ),
          shortQ(
            'Jobs to be done',
            'Complete this JTBD framing: "When ___, I want to ___, so I can ___" for a freelancer invoicing app.',
            'When I finish a project, I want to send a professional invoice quickly, so I can get paid on time',
            { tags: ['product', 'discovery'] },
          ),
          mc(
            'North star metric',
            'For a B2B collaboration tool, which metric best aligns long-term value creation?',
            [
              ['Total signups', false],
              ['Weekly active teams completing core collaborative actions', true],
              ['Number of features shipped', false],
              ['App store rating count', false],
            ],
            { tags: ['product', 'metrics'] },
          ),
          cognitive(
            'Prioritization trade-off',
            'You can ship a small fix that unblocks a $2M renewal or a larger initiative with uncertain upside in six months. Limited eng capacity allows only one this sprint. What framework helps decide?',
            [
              ['RICE or impact vs effort with stakeholder input', true],
              ['Always choose the larger initiative', false],
              ['Flip a coin', false],
              ['Defer to the loudest customer', false],
            ],
            { tags: ['product', 'prioritization'] },
          ),
          listen(
            'User interview excerpt',
            'Interview note: "I export everything to spreadsheets every Friday because I don\'t trust the in-app reports. It takes me an hour and I still miss errors."',
            'What is the primary user need implied?',
            [
              ['Reliable reporting without manual reconciliation', true],
              ['More export formats', false],
              ['Lower pricing', false],
              ['Mobile notifications', false],
            ],
            { tags: ['product', 'research'] },
          ),
        ],
      },
      {
        title: 'Prioritization & execution',
        questions: [
          sjt(
            'Scope creep',
            'Engineering is halfway through a release when sales requests a "small" addition for a enterprise deal. What do you do first?',
            [
              ['Add it immediately without assessment', false],
              ['Assess impact on timeline, quality, and strategic goals with eng and sales', true],
              ['Cancel the release entirely', false],
              ['Blame engineering for slow velocity', false],
            ],
            { tags: ['product', 'execution'], difficulty: 'hard' },
          ),
          ms(
            'PRD essentials',
            'Which elements should a strong PRD include? (Select all that apply)',
            [
              ['Problem statement and success metrics', true],
              ['Non-goals and out-of-scope items', true],
              ['Exact pixel-perfect mockups for every state', false],
              ['User stories or jobs with acceptance criteria', true],
            ],
            { tags: ['product', 'documentation'] },
          ),
          mc(
            'Agile trade-offs',
            'Your team consistently carries over 40% of sprint commitments. What is the best product-led response?',
            [
              ['Reduce commitment to realistic capacity and improve slicing', true],
              ['Add more meetings', false],
              ['Stop using sprints', false],
              ['Pressure engineers to work weekends', false],
            ],
            { tags: ['product', 'agile'] },
          ),
          longQ(
            'Launch rollback',
            'A feature launch causes a 12% drop in activation. Walk through your first 48 hours of response as the PM.',
            { tags: ['product', 'incident'], difficulty: 'hard' },
          ),
          tf(
            'MVP definition',
            'True or False: An MVP should include every capability needed for a mature v1.0 product.',
            false,
            { tags: ['product', 'mvp'] },
          ),
          shortQ(
            'OKR alignment',
            'Write one product outcome OKR (not an output) for improving onboarding.',
            'Increase week-1 activation from X% to Y% by reducing time-to-first-value',
            { tags: ['product', 'okrs'] },
          ),
          mc(
            'Technical debt',
            'Engineering requests a sprint for refactoring that reduces incident rate but has no visible user feature. How should a PM evaluate it?',
            [
              ['Reject automatically', false],
              ['Weigh reliability impact, opportunity cost, and roadmap risk', true],
              ['Approve only if a competitor did it', false],
              ['Hide it from leadership', false],
            ],
            { tags: ['product', 'engineering'] },
          ),
        ],
      },
      {
        title: 'Stakeholder communication',
        instructions: 'Demonstrate structured thinking and executive-ready communication.',
        questions: [
          sjt(
            'Conflicting stakeholders',
            'Design wants a simplified UX; enterprise customers demand advanced configuration. Leadership wants both in one release. Your best move?',
            [
              ['Ship both fully in one release regardless of risk', false],
              ['Facilitate trade-off discussion with data and phased delivery options', true],
              ['Side with design without discussion', false],
              ['Delay indefinitely', false],
            ],
            { tags: ['product', 'stakeholders'], difficulty: 'hard' },
          ),
          audio(
            'Sprint review summary',
            'Record a 90-second sprint review summary for leadership: what shipped, what was learned, and what is next.',
            { tags: ['product', 'communication'] },
          ),
          video(
            'Pitch a bet',
            'Record a 2-minute video pitching a new product bet: problem, target user, hypothesis, and how you will validate in 4 weeks.',
            { tags: ['product', 'presentation'], difficulty: 'hard' },
          ),
          mc(
            'Roadmap communication',
            'When sharing a roadmap externally with customers, what is the best practice?',
            [
              ['Commit to exact dates for all items', false],
              ['Communicate themes and direction with appropriate uncertainty', true],
              ['Share internal engineering estimates verbatim', false],
              ['Never share anything', false],
            ],
            { tags: ['product', 'roadmap'] },
          ),
          ms(
            'Go-to-market alignment',
            'Before a major launch, which GTM activities should product partner on? (Select all that apply)',
            [
              ['Positioning and messaging review', true],
              ['Sales enablement and demo flows', true],
              ['Choosing office snack vendors', false],
              ['Success metrics and feedback loops post-launch', true],
            ],
            { tags: ['product', 'gtm'] },
          ),
          tf(
            'HiPPO decisions',
            'True or False: The highest-paid person\'s opinion should override data when the team disagrees.',
            false,
            { tags: ['product', 'culture'] },
          ),
        ],
      },
    ],
    { tags: ['product-manager', 'hiring', 'template'] },
  ),

  roleTemplate(
    'ux-designer',
    'UX/UI Design',
    'UX Designer — Skills Assessment',
    'Evaluate UX principles, research methods, interaction design, accessibility, and design communication.',
    [
      {
        title: 'UX principles & heuristics',
        questions: [
          mc(
            'Nielsen heuristic',
            'A form clears all entered data when a single field fails validation. Which heuristic does this violate most directly?',
            [
              ['Visibility of system status', false],
              ['Error prevention and recovery', true],
              ['Aesthetic and minimalist design', false],
              ['Recognition rather than recall', false],
            ],
            { tags: ['ux', 'heuristics'] },
          ),
          ms(
            'Accessibility basics',
            'Which practices improve WCAG-aligned accessibility? (Select all that apply)',
            [
              ['Sufficient color contrast for text', true],
              ['Keyboard navigability for interactive elements', true],
              ['Using color alone to convey critical status', false],
              ['Descriptive labels for form inputs', true],
            ],
            { tags: ['ux', 'accessibility'] },
          ),
          tf(
            'User preference',
            'True or False: What users say they want in interviews always matches what they will actually use in production.',
            false,
            { tags: ['ux', 'research'] },
          ),
          mc(
            'Information architecture',
            'You are reorganizing a complex settings area with 40+ options. What is the best first step?',
            [
              ['Draw high-fidelity mockups immediately', false],
              ['Card sort or tree test to validate grouping with users', true],
              ['Copy a competitor\'s settings page', false],
              ['Hide infrequent settings with no research', false],
            ],
            { tags: ['ux', 'ia'] },
          ),
          shortQ(
            'Affordance',
            'Define affordance in UX and give one example of a strong affordance in a mobile app.',
            'Perceived action possibility; e.g., raised button suggesting tap',
            { tags: ['ux', 'fundamentals'] },
          ),
          cognitive(
            'Visual hierarchy',
            'A dashboard has twelve equal-weight charts competing for attention. Which change most improves scanability?',
            [
              ['Establish primary metric, secondary details, and progressive disclosure', true],
              ['Add more charts', false],
              ['Use twelve different fonts', false],
              ['Remove all labels', false],
            ],
            { tags: ['ux', 'visual-design'] },
          ),
          tf(
            'Consistency',
            'True or False: Design systems should eliminate the need for contextual design decisions in product flows.',
            false,
            { tags: ['ux', 'design-systems'] },
          ),
        ],
      },
      {
        title: 'Research & design process',
        questions: [
          mc(
            'Research method fit',
            'You need to compare two checkout flows for task completion time with statistical confidence. Which method is most appropriate?',
            [
              ['Unmoderated usability A/B test', true],
              ['One informal hallway test', false],
              ['Stakeholder workshop only', false],
              ['Competitive screenshot review', false],
            ],
            { tags: ['ux', 'research'] },
          ),
          sjt(
            'Research pushback',
            'Engineering says user research will delay launch by two weeks. Leadership agrees. What do you do?',
            [
              ['Skip research entirely', false],
              ['Propose lightweight validation (e.g., 5-user test) on highest-risk assumptions', true],
              ['Run a 30-person study anyway', false],
              ['Redesign without any user input', false],
            ],
            { tags: ['ux', 'process'], difficulty: 'hard' },
          ),
          ms(
            'Prototype fidelity',
            'When should you use low-fidelity prototypes? (Select all that apply)',
            [
              ['Early concept exploration', true],
              ['Testing information architecture', true],
              ['Final visual polish sign-off', false],
              ['Rapid iteration before visual design', true],
            ],
            { tags: ['ux', 'prototyping'] },
          ),
          longQ(
            'Redesign case study',
            'Describe how you would approach redesigning an onboarding flow with a 60% drop-off at step 2. Include research, design, and validation steps.',
            { tags: ['ux', 'case-study'], difficulty: 'hard' },
          ),
          listen(
            'Usability test note',
            'Participant quote: "I thought clicking Save would submit the form, but it only saved a draft. I didn\'t see the separate Submit button below the fold on mobile."',
            'What design issue is most likely?',
            [
              ['Unclear primary action and poor mobile visibility of submit', true],
              ['User error only', false],
              ['Need for more features', false],
              ['Color branding problem', false],
            ],
            { tags: ['ux', 'usability'] },
          ),
          shortQ(
            'Design critique',
            'Name two questions you would ask in a design critique to improve a colleague\'s work constructively.',
            'What user problem does this solve; what evidence supports the solution',
            { tags: ['ux', 'collaboration'] },
          ),
          mc(
            'Design handoff',
            'What should a developer receive for a responsive component beyond a static image?',
            [
              ['Final copy only', false],
              ['Specs for states, breakpoints, interactions, and accessibility notes', true],
              ['A verbal description in Slack', false],
              ['PDF export only', false],
            ],
            { tags: ['ux', 'handoff'] },
          ),
        ],
      },
      {
        title: 'Portfolio & communication',
        instructions: 'Show how you articulate design decisions to cross-functional partners.',
        questions: [
          audio(
            'Walkthrough a decision',
            'Record a 90-second explanation of a design decision you made (real or sample): the user problem, options considered, and why you chose the final approach.',
            { tags: ['ux', 'communication'] },
          ),
          video(
            'Present a flow',
            'Record a 2-minute video presenting a key user flow redesign to a PM and engineer, including trade-offs and open questions.',
            { tags: ['ux', 'presentation'], difficulty: 'hard' },
          ),
          sjt(
            'Brand vs usability',
            'Marketing wants a trendy low-contrast hero treatment that fails contrast checks for body links. What do you do?',
            [
              ['Ship as-is for brand', false],
              ['Propose accessible alternatives that preserve brand intent', true],
              ['Remove all links', false],
              ['Ignore WCAG as internal tool only', false],
            ],
            { tags: ['ux', 'accessibility'], difficulty: 'hard' },
          ),
          mc(
            'Metrics for design',
            'Which metric pair best evaluates a redesigned search experience?',
            [
              ['Search success rate and time to successful result', true],
              ['Number of colors used', false],
              ['Designer hours spent', false],
              ['Total page count', false],
            ],
            { tags: ['ux', 'metrics'] },
          ),
          ms(
            'Inclusive design',
            'Which practices support inclusive design? (Select all that apply)',
            [
              ['Designing for diverse abilities and contexts', true],
              ['Testing with representative users', true],
              ['Assuming all users are expert power users', false],
              ['Providing clear error messages in plain language', true],
            ],
            { tags: ['ux', 'inclusion'] },
          ),
          tf(
            'Pixel pushing',
            'True or False: UX designers should only create visuals and leave user research entirely to PMs.',
            false,
            { tags: ['ux', 'role'] },
          ),
        ],
      },
    ],
    { tags: ['ux-designer', 'hiring', 'template'] },
  ),

  roleTemplate(
    'finance-analyst',
    'Finance',
    'Finance Analyst — Skills Assessment',
    'Measure financial acumen, modeling, accounting awareness, and business partnering skills.',
    [
      {
        title: 'Financial fundamentals',
        questions: [
          mc(
            'Three statements',
            'Which statement shows a company\'s financial position at a specific point in time?',
            [
              ['Income statement', false],
              ['Balance sheet', true],
              ['Cash flow statement', false],
              ['Statement of retained earnings only', false],
            ],
            { tags: ['finance', 'accounting'], difficulty: 'easy' },
          ),
          ms(
            'Working capital',
            'Which items are typically included in working capital calculations? (Select all that apply)',
            [
              ['Accounts receivable', true],
              ['Accounts payable', true],
              ['Long-term debt', false],
              ['Inventory', true],
            ],
            { tags: ['finance', 'working-capital'] },
          ),
          tf(
            'EBITDA',
            'True or False: EBITDA is identical to cash flow from operations.',
            false,
            { tags: ['finance', 'metrics'] },
          ),
          mc(
            'Variance analysis',
            'Revenue is 8% below budget but gross margin is 2% above. What is the best first analytical step?',
            [
              ['Celebrate margin and ignore revenue', false],
              ['Decompose volume, price, and mix effects on revenue and COGS', true],
              ['Revise the budget immediately', false],
              ['Only review headcount', false],
            ],
            { tags: ['finance', 'analysis'] },
          ),
          shortQ(
            'Accrual vs cash',
            'Explain the difference between accrual and cash accounting in one or two sentences.',
            'Accrual records revenue/expenses when earned/incurred; cash when cash moves',
            { tags: ['finance', 'accounting'] },
          ),
          cognitive(
            'Ratio interpretation',
            'Current ratio drops from 2.1 to 1.1 while quick ratio stays flat. What might this suggest?',
            [
              ['Increase in less-liquid current assets such as inventory', true],
              ['Improvement in liquidity', false],
              ['Reduction in all liabilities', false],
              ['Higher cash only', false],
            ],
            { tags: ['finance', 'ratios'] },
          ),
          tf(
            'Depreciation',
            'True or False: Depreciation expense reduces cash balance on the cash flow statement in the operating section under indirect method presentation.',
            false,
            { tags: ['finance', 'cash-flow'] },
          ),
        ],
      },
      {
        title: 'Analysis & modeling',
        questions: [
          mc(
            'DCF concept',
            'In a discounted cash flow model, what does the discount rate primarily represent?',
            [
              ['Historical inflation only', false],
              ['Risk-adjusted required return / cost of capital', true],
              ['Tax rate', false],
              ['Revenue growth cap', false],
            ],
            { tags: ['finance', 'valuation'] },
          ),
          sjt(
            'Forecast pressure',
            'Sales leadership wants you to raise Q4 forecast by 15% without supporting pipeline data before a board meeting. What do you do?',
            [
              ['Adjust the model to match', false],
              ['Present base case with documented assumptions and sensitivity scenarios', true],
              ['Delete the forecast', false],
              ['Share confidential data externally', false],
            ],
            { tags: ['finance', 'ethics'], difficulty: 'hard' },
          ),
          ms(
            'Model hygiene',
            'Which practices improve financial model reliability? (Select all that apply)',
            [
              ['Separate inputs, calculations, and outputs', true],
              ['Hardcoding numbers inside formulas scattered across sheets', false],
              ['Version control and change logs', true],
              ['Document key assumptions', true],
            ],
            { tags: ['finance', 'modeling'] },
          ),
          longQ(
            'Investment memo',
            'A business unit requests $1.2M for new software that promises 18-month payback. Outline the analysis you would include in an investment recommendation.',
            { tags: ['finance', 'fp&a'], difficulty: 'hard' },
          ),
          mc(
            'Unit economics',
            'For a subscription business, which formula correctly expresses LTV:CAC?',
            [
              ['(ARPU × Gross Margin %) / Monthly Churn) : CAC', true],
              ['Revenue : Headcount', false],
              ['EBITDA : CapEx', false],
              ['Total assets : Total liabilities', false],
            ],
            { tags: ['finance', 'saas'] },
          ),
          shortQ(
            'Sensitivity analysis',
            'Name two variables you would stress-test in a SaaS revenue forecast and why.',
            'Churn and new logo growth because they compound revenue impact',
            { tags: ['finance', 'modeling'] },
          ),
          listen(
            'Earnings call excerpt',
            'CFO remarks: "Gross margin improved 120 bps due to vendor renegotiation, partially offset by higher cloud costs. We expect OpEx to grow slower than revenue in H2."',
            'What operational theme is the CFO emphasizing?',
            [
              ['Margin improvement with disciplined cost growth', true],
              ['Immediate dividend increase', false],
              ['Inventory write-down', false],
              ['Debt restructuring only', false],
            ],
            { tags: ['finance', 'communication'] },
          ),
        ],
      },
      {
        title: 'Business partnering & communication',
        questions: [
          audio(
            'Explain variance',
            'Record a 90-second explanation of a monthly budget variance (real or sample) to a non-finance department head, including drivers and next steps.',
            { tags: ['finance', 'communication'] },
          ),
          video(
            'Board slide narrative',
            'Record a 2-minute video presenting the key message from a quarterly financial review slide deck to executives.',
            { tags: ['finance', 'presentation'], difficulty: 'hard' },
          ),
          sjt(
            'Ambiguous request',
            'A VP asks for "the ROI on marketing" by end of day without defining scope. What is your best response?',
            [
              ['Send a single number without context', false],
              ['Clarify time horizon, attribution method, and costs included', true],
              ['Refuse to help', false],
              ['Use last year\'s number', false],
            ],
            { tags: ['finance', 'stakeholders'], difficulty: 'hard' },
          ),
          mc(
            'Month-end close',
            'Which action most reduces month-end close delays?',
            [
              ['Standardized close checklist with accountable owners and cutoffs', true],
              ['Waiting until all teams are 100% accurate before any entries', false],
              ['Eliminating reconciliations', false],
              ['Closing books without review', false],
            ],
            { tags: ['finance', 'operations'] },
          ),
          ms(
            'Internal controls',
            'Which are examples of strong internal controls? (Select all that apply)',
            [
              ['Segregation of duties for approvals and payments', true],
              ['Regular bank reconciliations', true],
              ['Shared passwords for speed', false],
              ['Threshold-based dual approval for expenses', true],
            ],
            { tags: ['finance', 'controls'] },
          ),
          tf(
            'GAAP flexibility',
            'True or False: GAAP allows companies to recognize revenue whenever cash is collected regardless of performance obligations.',
            false,
            { tags: ['finance', 'gaap'] },
          ),
        ],
      },
    ],
    { tags: ['finance-analyst', 'hiring', 'template'] },
  ),

  roleTemplate(
    'project-manager',
    'Project Management',
    'Project Manager — Skills Assessment',
    'Assess planning, risk management, agile/hybrid delivery, stakeholder alignment, and leadership judgment.',
    [
      {
        title: 'PM fundamentals',
        questions: [
          mc(
            'Critical path',
            'In project scheduling, the critical path is best defined as:',
            [
              ['The longest sequence of dependent tasks determining minimum project duration', true],
              ['Tasks assigned to senior staff', false],
              ['Optional tasks that can slip', false],
              ['The path with lowest cost', false],
            ],
            { tags: ['pm', 'scheduling'] },
          ),
          ms(
            'Project charter',
            'Which elements belong in a project charter? (Select all that apply)',
            [
              ['Objectives and success criteria', true],
              ['High-level scope and key stakeholders', true],
              ['Detailed day-by-day task assignments for six months', false],
              ['Assumptions and constraints', true],
            ],
            { tags: ['pm', 'initiation'] },
          ),
          tf(
            'Triple constraint',
            'True or False: Scope, time, and cost are the only factors that ever affect project success.',
            false,
            { tags: ['pm', 'fundamentals'] },
          ),
          shortQ(
            'RACI',
            'What does the "A" in RACI stand for, and why is having a single Accountable person important?',
            'Accountable; one decision owner avoids confusion',
            { tags: ['pm', 'governance'] },
          ),
          mc(
            'Agile vs waterfall',
            'A regulatory compliance project has fixed legal deadlines and well-defined deliverables. Which approach is often most appropriate?',
            [
              ['Pure discovery with no plan', false],
              ['Hybrid plan-driven execution with iterative risk reviews', true],
              ['No documentation agile only', false],
              ['Cancel agile ceremonies entirely', false],
            ],
            { tags: ['pm', 'methodology'] },
          ),
          cognitive(
            'Status reporting',
            'A project is green on budget but key integrations are untested and the launch is two weeks away. How should status be reported?',
            [
              ['Yellow/red with risks explicit despite budget green', true],
              ['Green because budget is fine', false],
              ['Do not report until launch', false],
              ['Report green and hope', false],
            ],
            { tags: ['pm', 'reporting'] },
          ),
          listen(
            'Stakeholder update',
            'Sponsor says: "We need the mobile release by quarter end, but legal review may take three weeks and two vendors are unresponsive."',
            'What is the most critical immediate PM action?',
            [
              ['Identify critical path impacts and escalate vendor/legal risks with options', true],
              ['Promise quarter end without analysis', false],
              ['Remove legal review', false],
              ['Switch vendors without assessment', false],
            ],
            { tags: ['pm', 'stakeholders'] },
          ),
        ],
      },
      {
        title: 'Planning & risk management',
        questions: [
          sjt(
            'Scope change',
            'Mid-project, a stakeholder requests a major new capability not in the charter. The team has capacity for small changes only. What do you do first?',
            [
              ['Accept and absorb silently', false],
              ['Assess impact on scope, timeline, cost, and run change control with sponsors', true],
              ['Quit the project', false],
              ['Implement without telling anyone', false],
            ],
            { tags: ['pm', 'change-control'], difficulty: 'hard' },
          ),
          ms(
            'Risk responses',
            'Which are valid risk response strategies? (Select all that apply)',
            [
              ['Mitigate', true],
              ['Transfer', true],
              ['Ignore all risks', false],
              ['Accept with contingency plan', true],
            ],
            { tags: ['pm', 'risk'] },
          ),
          mc(
            'Estimation',
            'Historical data shows similar projects took 8-14 weeks. Leadership demands a 6-week estimate. Best practice?',
            [
              ['Commit to 6 weeks to please leadership', false],
              ['Present range-based estimate with assumptions and trade-offs', true],
              ['Estimate in hours only', false],
              ['Remove testing to fit 6 weeks', false],
            ],
            { tags: ['pm', 'estimation'] },
          ),
          longQ(
            'Recovery plan',
            'A software implementation is six weeks behind due to vendor delays and unclear requirements. Outline your 30-day recovery plan.',
            { tags: ['pm', 'recovery'], difficulty: 'hard' },
          ),
          tf(
            'Risk register',
            'True or False: A risk register should only list risks that have already occurred.',
            false,
            { tags: ['pm', 'risk'] },
          ),
          shortQ(
            'Dependency management',
            'Name two techniques you use to manage cross-team dependencies on a program.',
            'Dependency map, integration milestones, RAID log, regular sync forums',
            { tags: ['pm', 'dependencies'] },
          ),
          mc(
            'Resource leveling',
            'Two critical tasks need the same specialist next week. What is the best approach?',
            [
              ['Assign both tasks simultaneously without adjustment', false],
              ['Prioritize by critical path impact and negotiate schedule or backup resources', true],
              ['Cancel one task permanently', false],
              ['Hide the conflict', false],
            ],
            { tags: ['pm', 'resources'] },
          ),
        ],
      },
      {
        title: 'Leadership & communication',
        instructions: 'Demonstrate calm, structured leadership in recorded responses.',
        questions: [
          sjt(
            'Team conflict',
            'Developers and QA blame each other for missed milestones in a status meeting. What should the PM do first?',
            [
              ['Pick a side publicly', false],
              ['Facilitate fact-based discussion on blockers and agree on next steps', true],
              ['Cancel all meetings', false],
              ['Escalate to HR immediately', false],
            ],
            { tags: ['pm', 'leadership'], difficulty: 'hard' },
          ),
          audio(
            'Executive escalation',
            'Record a 90-second escalation to an executive sponsor about a blocker that threatens the go-live date, including impact and options.',
            { tags: ['pm', 'communication'] },
          ),
          video(
            'Kickoff message',
            'Record a 2-minute project kickoff message to a cross-functional team: goals, ways of working, and how success will be measured.',
            { tags: ['pm', 'presentation'], difficulty: 'medium' },
          ),
          mc(
            'Retrospectives',
            'What makes a retrospective most valuable?',
            [
              ['Blame assignment', false],
              ['Specific actionable improvements with owners', true],
              ['Skipping when busy', false],
              ['Only PM speaks', false],
            ],
            { tags: ['pm', 'agile'] },
          ),
          ms(
            'Stakeholder engagement',
            'Which tactics maintain stakeholder alignment? (Select all that apply)',
            [
              ['Regular transparent status with risks', true],
              ['Managing expectations on scope changes', true],
              ['Surprising sponsors with major changes at launch', false],
              ['Tailoring communication to audience needs', true],
            ],
            { tags: ['pm', 'stakeholders'] },
          ),
          tf(
            'PM accountability',
            'True or False: The project manager is solely responsible for all technical design decisions on the project.',
            false,
            { tags: ['pm', 'role'] },
          ),
        ],
      },
    ],
    { tags: ['project-manager', 'hiring', 'template'] },
  ),
];
