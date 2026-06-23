import type { JobHunterCvTemplate } from "../lib/job-hunter-cv-content.js";

/** Additional Template Central samples — third row per core profession plus new profession groups. */
export const JOB_HUNTER_CV_TEMPLATE_MORE: JobHunterCvTemplate[] = [
  {
    id: "uk-devops-engineer-cloud",
    region: "UK",
    roleCategory: "engineering",
    industry: "technology",
    experienceLevel: "mid",
    title: "UK DevOps Engineer — Cloud",
    description: "Platform engineering CV with CI/CD ownership, SRE practices, and UK spelling throughout.",
    content: {
      fullName: "Marcus Hughes",
      contact: {
        email: "marcus.hughes@email.co.uk",
        phone: "+44 7700 900654",
        location: "Bristol, UK",
        linkedIn: "linkedin.com/in/marcushughes",
      },
      summary:
        "DevOps engineer with 5 years building reliable delivery pipelines for SaaS teams. Experienced in Kubernetes, Terraform, and observability stacks that reduce incident frequency and speed up releases.",
      experience: [
        {
          title: "DevOps Engineer",
          company: "SignalWave Ltd",
          location: "Bristol, UK",
          startDate: "2021",
          endDate: "Present",
          bullets: [
            "Reduced deployment lead time from 45 minutes to 12 minutes via GitOps workflow adoption.",
            "Implemented golden-signal dashboards that cut mean time to detect by 38%.",
            "Partnered with security on container image scanning integrated into CI pipelines.",
          ],
        },
      ],
      education: [
        {
          degree: "BSc Computer Science",
          school: "University of Bristol",
          year: "2019",
        },
      ],
      skills: ["Kubernetes", "Terraform", "AWS", "GitHub Actions", "Prometheus", "Grafana", "Python"],
      certifications: [{ name: "CKA", issuer: "CNCF", year: "2023" }],
    },
  },
  {
    id: "ca-associate-product-manager",
    region: "CA",
    roleCategory: "product",
    industry: "technology",
    experienceLevel: "mid",
    title: "Canada Associate Product Manager — FinTech",
    description: "APM CV with discovery notes, regulated-market awareness, and measurable adoption outcomes.",
    content: {
      fullName: "Liam O'Connor",
      contact: {
        email: "liam.oconnor@email.ca",
        phone: "+1 (604) 555-0162",
        location: "Vancouver, BC",
        linkedIn: "linkedin.com/in/liamoconnor",
      },
      summary:
        "Associate product manager supporting payments and onboarding squads in Canadian FinTech. Comfortable translating compliance constraints into shippable user journeys.",
      experience: [
        {
          title: "Associate Product Manager",
          company: "Coastline Payments",
          location: "Vancouver, BC",
          startDate: "2022",
          endDate: "Present",
          bullets: [
            "Launched merchant verification flow that reduced onboarding drop-off by 9%.",
            "Ran weekly customer councils with 12 SMB operators to prioritise backlog items.",
            "Authored acceptance criteria and release notes for bilingual EN/FR launches.",
          ],
        },
      ],
      education: [
        {
          degree: "B.Com. Information Systems",
          school: "University of British Columbia",
          year: "2021",
        },
      ],
      skills: ["Product discovery", "Jira", "SQL", "Figma", "A/B testing", "Stakeholder workshops"],
      certifications: [],
    },
  },
  {
    id: "us-registered-nurse-acute",
    region: "US",
    roleCategory: "healthcare",
    industry: "healthcare",
    experienceLevel: "senior",
    title: "US Registered Nurse — Acute Care",
    description: "Senior RN CV with charge-nurse experience, quality metrics, and interdisciplinary care.",
    content: {
      fullName: "Maria Santos",
      contact: {
        email: "maria.santos@email.com",
        phone: "+1 (713) 555-0191",
        location: "Houston, TX",
      },
      summary:
        "Registered nurse with 9 years in acute care and charge-nurse responsibilities. Recognised for patient safety initiatives, precepting, and evidence-based practice on busy med-surg units.",
      experience: [
        {
          title: "Charge Nurse — Medical Surgical Unit",
          company: "Memorial Regional Hospital",
          location: "Houston, TX",
          startDate: "2019",
          endDate: "Present",
          bullets: [
            "Coordinated assignments for 18-bed unit while maintaining patient satisfaction scores above 92nd percentile.",
            "Led fall-prevention pilot that reduced incidents by 22% over two quarters.",
            "Precepted 6 new graduate nurses and facilitated skills competency refreshers.",
          ],
        },
      ],
      education: [
        {
          degree: "B.S.N. Nursing",
          school: "University of Texas Health Science Center",
          year: "2016",
          details: "RN — Texas Board of Nursing",
        },
      ],
      skills: ["Acute care", "Charge nurse", "EMR (Epic)", "Patient education", "Quality improvement", "BLS/ACLS"],
      certifications: [{ name: "CCRN", issuer: "AACN", year: "2022" }],
    },
  },
  {
    id: "us-senior-data-scientist",
    region: "US",
    roleCategory: "analytics",
    industry: "technology",
    experienceLevel: "senior",
    title: "US Senior Data Scientist — Technology",
    description: "ML-focused analyst CV with model impact, experimentation, and executive storytelling.",
    content: {
      fullName: "Rachel Kim",
      contact: {
        email: "rachel.kim@email.com",
        phone: "+1 (206) 555-0138",
        location: "Seattle, WA",
        linkedIn: "linkedin.com/in/rachelkim",
      },
      summary:
        "Senior data scientist building predictive models for subscription businesses. Strong in experimentation design, feature engineering, and partnering with product to ship data-informed roadmaps.",
      experience: [
        {
          title: "Senior Data Scientist",
          company: "Nimbus Analytics",
          location: "Seattle, WA",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Deployed churn model that improved save-offer targeting and retained $3.4M ARR annually.",
            "Designed experiment framework adopted by 3 product teams for feature rollouts.",
            "Mentored 2 analysts on Python pipelines and model documentation standards.",
          ],
        },
      ],
      education: [
        {
          degree: "M.S. Statistics",
          school: "University of Washington",
          year: "2018",
        },
      ],
      skills: ["Python", "SQL", "scikit-learn", "Experiment design", "dbt", "Looker", "Causal inference"],
      certifications: [],
    },
  },
  {
    id: "uk-digital-marketing-specialist",
    region: "UK",
    roleCategory: "marketing",
    industry: "retail",
    experienceLevel: "mid",
    title: "UK Digital Marketing Specialist — E-commerce",
    description: "Performance marketing CV with paid social, SEO, and conversion rate highlights.",
    content: {
      fullName: "Priya Nair",
      contact: {
        email: "priya.nair@email.co.uk",
        phone: "+44 7700 900882",
        location: "Edinburgh, UK",
        linkedIn: "linkedin.com/in/priyanair",
      },
      summary:
        "Digital marketing specialist with 4 years in e-commerce growth. Experienced in paid media, lifecycle email, and landing-page optimisation with clear ROAS reporting.",
      experience: [
        {
          title: "Digital Marketing Specialist",
          company: "Highland Home Goods",
          location: "Edinburgh, UK",
          startDate: "2021",
          endDate: "Present",
          bullets: [
            "Improved blended ROAS from 2.8x to 4.1x through creative testing and audience refinement.",
            "Grew organic traffic 31% YoY via technical SEO fixes and content hub launches.",
            "Built automated post-purchase email series lifting repeat purchase rate by 7%.",
          ],
        },
      ],
      education: [
        {
          degree: "BA Marketing & Digital Media",
          school: "University of Edinburgh",
          year: "2020",
        },
      ],
      skills: ["Paid social", "Google Ads", "SEO", "Klaviyo", "GA4", "CRO", "Copywriting"],
      certifications: [{ name: "Meta Certified Digital Marketing Associate", issuer: "Meta", year: "2022" }],
    },
  },
  {
    id: "us-technical-project-manager",
    region: "US",
    roleCategory: "project-management",
    industry: "technology",
    experienceLevel: "mid",
    title: "US Technical Project Manager — SaaS",
    description: "Agile delivery CV with sprint planning, risk registers, and cross-functional release coordination.",
    content: {
      fullName: "Chris Delaney",
      contact: {
        email: "chris.delaney@email.com",
        phone: "+1 (512) 555-0155",
        location: "Austin, TX",
        linkedIn: "linkedin.com/in/chrisdelaney",
      },
      summary:
        "Technical project manager with 6 years delivering SaaS platform upgrades. Skilled in Scrum ceremonies, dependency mapping, and keeping stakeholders aligned on scope and timelines.",
      experience: [
        {
          title: "Technical Project Manager",
          company: "Relay Platform",
          location: "Austin, TX",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Delivered 14 consecutive releases on schedule for identity and permissions redesign.",
            "Introduced RAID logs and weekly steering reviews that reduced scope creep incidents by 40%.",
            "Facilitated PI planning across 3 squads with shared OKR visibility.",
          ],
        },
      ],
      education: [
        {
          degree: "B.S. Information Technology",
          school: "Texas State University",
          year: "2018",
        },
      ],
      skills: ["Scrum", "Jira", "Confluence", "Risk management", "Stakeholder communication", "SQL basics"],
      certifications: [
        { name: "Certified ScrumMaster (CSM)", issuer: "Scrum Alliance", year: "2021" },
        { name: "PMP", issuer: "PMI", year: "2023" },
      ],
    },
  },
  {
    id: "ca-hr-generalist",
    region: "CA",
    roleCategory: "human-resources",
    industry: "consulting",
    experienceLevel: "mid",
    title: "Canada HR Generalist — Professional Services",
    description: "Generalist CV with recruiting, employee relations, and Canadian employment standards awareness.",
    content: {
      fullName: "Nadia Farouk",
      contact: {
        email: "nadia.farouk@email.ca",
        phone: "+1 (403) 555-0184",
        location: "Calgary, AB",
      },
      summary:
        "HR generalist supporting 250-employee professional services firm. Experienced in full-cycle recruiting, policy administration, and manager coaching across Alberta and remote teams.",
      experience: [
        {
          title: "HR Generalist",
          company: "Prairie Advisory Partners",
          location: "Calgary, AB",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Reduced time-to-fill for consultant roles from 52 to 34 days through structured interview kits.",
            "Updated handbook and leave policies aligned with provincial employment standards.",
            "Led engagement survey action planning that improved participation to 88%.",
          ],
        },
      ],
      education: [
        {
          degree: "B.H.R.M. Human Resources",
          school: "University of Calgary",
          year: "2019",
        },
      ],
      skills: ["Recruiting", "Employee relations", "HRIS (BambooHR)", "Onboarding", "Policy writing"],
      certifications: [{ name: "CHRP", issuer: "CCHRA", year: "2021" }],
    },
  },
  {
    id: "uk-customer-success-manager",
    region: "UK",
    roleCategory: "customer-success",
    industry: "technology",
    experienceLevel: "mid",
    title: "UK Customer Success Manager — B2B SaaS",
    description: "Mid-market CSM CV with adoption playbooks, QBRs, and expansion pipeline contribution.",
    content: {
      fullName: "Tom Fletcher",
      contact: {
        email: "tom.fletcher@email.co.uk",
        phone: "+44 7700 900447",
        location: "Reading, UK",
        linkedIn: "linkedin.com/in/tomfletcher",
      },
      summary:
        "Customer success manager owning mid-market SaaS accounts across financial services and professional services. Focused on onboarding velocity, health scoring, and renewal forecasting.",
      experience: [
        {
          title: "Customer Success Manager",
          company: "LedgerSpring",
          location: "Reading, UK",
          startDate: "2021",
          endDate: "Present",
          bullets: [
            "Maintained 96% gross retention across 28 accounts with combined ARR of £4.2M.",
            "Built adoption playbook that cut time-to-first-integration from 18 to 9 days.",
            "Partnered with sales on 6 expansion opportunities totalling £620K ARR.",
          ],
        },
      ],
      education: [
        {
          degree: "BSc Business Management",
          school: "University of Reading",
          year: "2019",
        },
      ],
      skills: ["Account management", "QBRs", "Salesforce", "Gainsight", "Churn analysis", "Executive communication"],
      certifications: [],
    },
  },
  {
    id: "us-supply-chain-analyst",
    region: "US",
    roleCategory: "operations",
    industry: "logistics",
    experienceLevel: "mid",
    title: "US Supply Chain Analyst — Logistics",
    description: "Analyst CV with demand planning, vendor scorecards, and inventory optimisation metrics.",
    content: {
      fullName: "Angela Morris",
      contact: {
        email: "angela.morris@email.com",
        phone: "+1 (704) 555-0127",
        location: "Charlotte, NC",
      },
      summary:
        "Supply chain analyst with 5 years improving forecast accuracy and inbound logistics for consumer goods distributors. Strong in Excel modelling, ERP reporting, and cross-functional S&OP meetings.",
      experience: [
        {
          title: "Supply Chain Analyst",
          company: "Carolina Fulfillment Group",
          location: "Charlotte, NC",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Improved 13-week forecast accuracy from 71% to 84% through SKU segmentation.",
            "Negotiated carrier lane adjustments that reduced freight spend by $420K annually.",
            "Built Power BI dashboards used in weekly S&OP reviews with sales and finance.",
          ],
        },
      ],
      education: [
        {
          degree: "B.S. Supply Chain Management",
          school: "North Carolina State University",
          year: "2019",
        },
      ],
      skills: ["Demand planning", "SAP", "Power BI", "S&OP", "Inventory optimisation", "Vendor management"],
      certifications: [{ name: "APICS CSCP", issuer: "ASCM", year: "2022" }],
    },
  },
  {
    id: "us-enterprise-account-executive",
    region: "US",
    roleCategory: "sales",
    industry: "technology",
    experienceLevel: "senior",
    title: "US Enterprise Account Executive — SaaS",
    description: "Enterprise sales CV with pipeline metrics, multi-threaded deals, and quota attainment.",
    content: {
      fullName: "Brandon Ellis",
      contact: {
        email: "brandon.ellis@email.com",
        phone: "+1 (415) 555-0116",
        location: "San Francisco, CA",
        linkedIn: "linkedin.com/in/brandonellis",
      },
      summary:
        "Enterprise account executive with 8 years closing six-figure SaaS deals. Experienced in MEDDPICC qualification, executive sponsorship, and cross-functional deal teams.",
      experience: [
        {
          title: "Enterprise Account Executive",
          company: "Vertex Cloud",
          location: "San Francisco, CA",
          startDate: "2019",
          endDate: "Present",
          bullets: [
            "Exceeded annual quota by 128% while maintaining 38% average deal size growth.",
            "Closed 5 net-new logos above $250K ARR with 9-month average sales cycle.",
            "Partnered with solutions engineering on 90% technical win rate in enterprise evaluations.",
          ],
        },
      ],
      education: [
        {
          degree: "B.A. Communication",
          school: "San Diego State University",
          year: "2016",
        },
      ],
      skills: ["Enterprise sales", "MEDDPICC", "Salesforce", "Negotiation", "Forecasting", "Executive presentations"],
      certifications: [],
    },
  },
  {
    id: "uk-business-development-representative",
    region: "UK",
    roleCategory: "sales",
    industry: "technology",
    experienceLevel: "entry",
    title: "UK Business Development Representative — SaaS",
    description: "BDR CV with outbound sequences, qualified meetings, and CRM hygiene.",
    content: {
      fullName: "Holly Turner",
      contact: {
        email: "holly.turner@email.co.uk",
        phone: "+44 7700 900233",
        location: "London, UK",
        linkedIn: "linkedin.com/in/hollyturner",
      },
      summary:
        "Business development representative generating pipeline for mid-market SaaS sales teams. Skilled in multi-channel outreach, discovery scheduling, and accurate CRM logging.",
      experience: [
        {
          title: "Business Development Representative",
          company: "ClearPath HR Tech",
          location: "London, UK",
          startDate: "2023",
          endDate: "Present",
          bullets: [
            "Booked 38 qualified meetings per quarter against a target of 30.",
            "Maintained 14% email reply rate through personalised sequence testing.",
            "Partnered with AEs on handoffs that improved opportunity-to-close conversion by 11%.",
          ],
        },
      ],
      education: [
        {
          degree: "BA Business Studies",
          school: "King's College London",
          year: "2023",
        },
      ],
      skills: ["Outbound prospecting", "Salesforce", "LinkedIn Sales Navigator", "Discovery calls", "Pipeline hygiene"],
      certifications: [],
    },
  },
  {
    id: "us-financial-analyst-fpa",
    region: "US",
    roleCategory: "finance",
    industry: "finance",
    experienceLevel: "mid",
    title: "US Financial Analyst — FP&A",
    description: "FP&A CV with forecasting models, board reporting, and variance analysis.",
    content: {
      fullName: "Kevin Zhang",
      contact: {
        email: "kevin.zhang@email.com",
        phone: "+1 (212) 555-0149",
        location: "New York, NY",
        linkedIn: "linkedin.com/in/kevinzhang",
      },
      summary:
        "Financial analyst supporting SaaS FP&A with rolling forecasts, departmental budgets, and investor-ready metrics. Advanced Excel and SQL modeller with strong narrative for leadership reviews.",
      experience: [
        {
          title: "Financial Analyst — FP&A",
          company: "Harbor Metrics Inc.",
          location: "New York, NY",
          startDate: "2021",
          endDate: "Present",
          bullets: [
            "Built driver-based forecast model improving quarterly accuracy to within 3% of actuals.",
            "Automated monthly board pack production, saving 16 finance hours per close.",
            "Partnered with sales ops on cohort analyses informing pricing experiments.",
          ],
        },
      ],
      education: [
        {
          degree: "B.S. Finance",
          school: "Fordham University",
          year: "2020",
        },
      ],
      skills: ["FP&A", "Excel", "SQL", "NetSuite", "Variance analysis", "Board reporting"],
      certifications: [{ name: "CFA Level II Candidate", issuer: "CFA Institute", year: "2024" }],
    },
  },
  {
    id: "uk-chartered-accountant",
    region: "UK",
    roleCategory: "finance",
    industry: "consulting",
    experienceLevel: "senior",
    title: "UK Chartered Accountant — Advisory",
    description: "ACA-qualified accountant CV with audit transition, advisory projects, and UK GAAP.",
    content: {
      fullName: "Emma Walsh",
      contact: {
        email: "emma.walsh@email.co.uk",
        phone: "+44 7700 900511",
        location: "Birmingham, UK",
        linkedIn: "linkedin.com/in/emmawalsh",
      },
      summary:
        "Chartered accountant with 7 years across audit and advisory engagements for mid-market clients. Experienced in financial due diligence, controls reviews, and management reporting.",
      experience: [
        {
          title: "Senior Accountant — Advisory",
          company: "Whitmore & Partners",
          location: "Birmingham, UK",
          startDate: "2019",
          endDate: "Present",
          bullets: [
            "Led financial due diligence on 4 transactions with aggregate enterprise value of £180M.",
            "Designed management reporting packs adopted by 6 portfolio company CFOs.",
            "Mentored 3 trainees through ACA exams with 100% first-time pass on FAR module.",
          ],
        },
      ],
      education: [
        {
          degree: "BSc Accounting & Finance",
          school: "University of Warwick",
          year: "2017",
          details: "ACA — ICAEW",
        },
      ],
      skills: ["UK GAAP", "Financial due diligence", "Audit", "Management reporting", "Excel", "Client advisory"],
      certifications: [{ name: "ACA", issuer: "ICAEW", year: "2020" }],
    },
  },
  {
    id: "us-ux-designer-product",
    region: "US",
    roleCategory: "design",
    industry: "technology",
    experienceLevel: "mid",
    title: "US UX Designer — Product",
    description: "Product design CV with research, prototyping, and shipped feature outcomes.",
    content: {
      fullName: "Jasmine Cole",
      contact: {
        email: "jasmine.cole@email.com",
        phone: "+1 (503) 555-0173",
        location: "Portland, OR",
        linkedIn: "linkedin.com/in/jasminecole",
      },
      summary:
        "UX designer with 5 years crafting web and mobile experiences for B2B products. Strong in discovery interviews, wireframing, usability testing, and design-system contribution.",
      experience: [
        {
          title: "UX Designer",
          company: "Fieldnote Software",
          location: "Portland, OR",
          startDate: "2021",
          endDate: "Present",
          bullets: [
            "Redesigned onboarding flow increasing activation rate by 17% in A/B test.",
            "Facilitated 25+ usability sessions feeding quarterly roadmap prioritisation.",
            "Contributed 40+ components to internal design system used by 3 product squads.",
          ],
        },
      ],
      education: [
        {
          degree: "B.F.A. Interaction Design",
          school: "Pacific Northwest College of Art",
          year: "2019",
        },
      ],
      skills: ["Figma", "User research", "Prototyping", "Usability testing", "Design systems", "Accessibility (WCAG)"],
      certifications: [],
    },
  },
  {
    id: "intl-product-designer-remote",
    region: "INTL",
    roleCategory: "design",
    industry: "technology",
    experienceLevel: "entry",
    title: "International Product Designer — Remote",
    description: "Early-career product designer CV for remote-first teams with portfolio-friendly project bullets.",
    content: {
      fullName: "Mateo Silva",
      contact: {
        email: "mateo.silva@email.com",
        phone: "+34 612 555 0190",
        location: "Barcelona, Spain (Remote)",
        linkedIn: "linkedin.com/in/mateosilva",
      },
      summary:
        "Product designer supporting remote SaaS teams with UI flows, component specs, and user-testing synthesis. Comfortable collaborating across time zones with engineering and product partners.",
      experience: [
        {
          title: "Product Designer",
          company: "Orbit Forms",
          location: "Remote — EMEA",
          startDate: "2022",
          endDate: "Present",
          bullets: [
            "Shipped settings redesign that reduced support tickets related to billing by 19%.",
            "Created responsive component library documentation for engineering handoff.",
            "Ran weekly design critiques and maintained accessibility checklist for releases.",
          ],
        },
      ],
      education: [
        {
          degree: "BDes Digital Design",
          school: "ELISAVA Barcelona School of Design",
          year: "2022",
        },
      ],
      skills: ["Figma", "UI design", "Design handoff", "User flows", "English/Spanish", "Design critiques"],
      certifications: [],
    },
  },
];
