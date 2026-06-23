import type { JobHunterCvTemplate } from "../lib/job-hunter-cv-content.js";

/** Second sample per profession — entry-level templates with ATS-ready content. */
export const JOB_HUNTER_CV_TEMPLATE_EXTRAS: JobHunterCvTemplate[] = [
  {
    id: "us-product-analyst-entry",
    region: "US",
    roleCategory: "product",
    industry: "technology",
    experienceLevel: "entry",
    title: "US Associate Product Analyst — SaaS",
    description: "Entry product role highlighting research, metrics, and cross-functional collaboration.",
    content: {
      fullName: "Noah Patel",
      contact: {
        email: "noah.patel@email.com",
        phone: "+1 (617) 555-0188",
        location: "Boston, MA",
        linkedIn: "linkedin.com/in/noahpatel",
      },
      summary:
        "Associate product analyst with experience translating user feedback into requirements and tracking funnel metrics for B2B SaaS pilots.",
      experience: [
        {
          title: "Product Analyst Intern",
          company: "HarborStack",
          location: "Boston, MA",
          startDate: "2023",
          endDate: "2024",
          bullets: [
            "Synthesized 60+ customer interviews into a prioritized backlog for onboarding improvements.",
            "Built Mixpanel dashboards used weekly by product and customer success leadership.",
            "Drafted PRDs for two features adopted in the Q3 release train.",
          ],
        },
      ],
      education: [
        {
          degree: "B.S. Information Systems",
          school: "Boston University",
          year: "2024",
        },
      ],
      skills: ["SQL", "Mixpanel", "User research", "PRD writing", "Figma", "Jira"],
      certifications: [],
    },
  },
  {
    id: "us-licensed-practical-nurse",
    region: "US",
    roleCategory: "healthcare",
    industry: "healthcare",
    experienceLevel: "entry",
    title: "US Licensed Practical Nurse — Clinical",
    description: "Clinical LPN CV with licensure, rotation highlights, and patient-care metrics.",
    content: {
      fullName: "Hannah Brooks",
      contact: {
        email: "hannah.brooks@email.com",
        phone: "+1 (404) 555-0120",
        location: "Atlanta, GA",
      },
      summary:
        "Licensed Practical Nurse with clinical rotation and long-term care experience. Skilled in vitals monitoring, medication administration, and compassionate patient communication.",
      experience: [
        {
          title: "Licensed Practical Nurse",
          company: "Peachtree Care Center",
          location: "Atlanta, GA",
          startDate: "2024",
          endDate: "Present",
          bullets: [
            "Administered medications and treatments for up to 12 residents per shift with zero documentation errors.",
            "Collaborated with RNs on care plans and family update calls.",
            "Maintained infection-control protocols during seasonal census spikes.",
          ],
        },
      ],
      education: [
        {
          degree: "Diploma — Practical Nursing",
          school: "Atlanta Technical College",
          year: "2024",
          details: "LPN — Georgia Board of Nursing",
        },
      ],
      skills: ["Vital signs", "Medication administration", "EMR charting", "Patient education", "BLS"],
      certifications: [{ name: "BLS Certification", issuer: "American Heart Association", year: "2024" }],
    },
  },
  {
    id: "uk-junior-data-analyst",
    region: "UK",
    roleCategory: "analytics",
    industry: "consulting",
    experienceLevel: "entry",
    title: "UK Junior Data Analyst — Consulting",
    description: "Graduate analyst CV with SQL, dashboarding, and stakeholder-ready insights.",
    content: {
      fullName: "Ethan Clarke",
      contact: {
        email: "ethan.clarke@email.co.uk",
        phone: "+44 7700 900789",
        location: "Birmingham, UK",
        linkedIn: "linkedin.com/in/ethanclarke",
      },
      summary:
        "Junior data analyst supporting consulting engagements with SQL analysis, Power BI reporting, and clear written recommendations for operations leaders.",
      experience: [
        {
          title: "Graduate Data Analyst",
          company: "Bridgepoint Analytics",
          location: "Birmingham, UK",
          startDate: "2023",
          endDate: "Present",
          bullets: [
            "Automated weekly KPI pack reducing manual reporting time by 10 hours per month.",
            "Cleaned and modelled sales datasets for three retail diagnostics projects.",
            "Presented findings to client steering committees with actionable next steps.",
          ],
        },
      ],
      education: [
        {
          degree: "BSc Mathematics & Statistics",
          school: "University of Birmingham",
          year: "2023",
        },
      ],
      skills: ["SQL", "Power BI", "Excel", "Python", "Data visualisation", "Stakeholder communication"],
      certifications: [],
    },
  },
  {
    id: "us-marketing-coordinator",
    region: "US",
    roleCategory: "marketing",
    industry: "retail",
    experienceLevel: "entry",
    title: "US Marketing Coordinator — Retail",
    description: "Coordinator CV with campaign support, content calendars, and channel metrics.",
    content: {
      fullName: "Sienna Alvarez",
      contact: {
        email: "sienna.alvarez@email.com",
        phone: "+1 (312) 555-0144",
        location: "Chicago, IL",
        linkedIn: "linkedin.com/in/siennaalvarez",
      },
      summary:
        "Marketing coordinator with retail internship experience supporting email, social, and in-store promotions with clear ROI tracking.",
      experience: [
        {
          title: "Marketing Coordinator",
          company: "Lakeview Outfitters",
          location: "Chicago, IL",
          startDate: "2023",
          endDate: "Present",
          bullets: [
            "Managed content calendar for email and Instagram, lifting average open rate to 28%.",
            "Coordinated photo shoots and vendor assets for seasonal campaigns.",
            "Tracked UTM performance and reported weekly channel results to the marketing director.",
          ],
        },
      ],
      education: [
        {
          degree: "B.A. Marketing",
          school: "DePaul University",
          year: "2023",
        },
      ],
      skills: ["Email marketing", "Social media", "Canva", "Google Analytics", "Campaign coordination"],
      certifications: [{ name: "Google Analytics Certification", issuer: "Google", year: "2023" }],
    },
  },
  {
    id: "me-junior-project-coordinator",
    region: "ME",
    roleCategory: "project-management",
    industry: "construction",
    experienceLevel: "entry",
    title: "Middle East Junior Project Coordinator — Construction",
    description: "Coordinator CV with site logistics, documentation, and contractor scheduling support.",
    content: {
      fullName: "Yousef Karim",
      contact: {
        email: "yousef.karim@email.com",
        phone: "+971 50 555 7788",
        location: "Abu Dhabi, UAE",
      },
      summary:
        "Junior project coordinator supporting commercial construction teams with scheduling, procurement tracking, and bilingual site communications.",
      experience: [
        {
          title: "Project Coordinator",
          company: "Al Noor Builders",
          location: "Abu Dhabi, UAE",
          startDate: "2022",
          endDate: "Present",
          bullets: [
            "Maintained master schedule updates and weekly progress logs for a 12-storey mixed-use build.",
            "Coordinated material deliveries with suppliers to reduce idle crew time by 11%.",
            "Prepared HSE checklists and attendance records for subcontractor meetings.",
          ],
        },
      ],
      education: [
        {
          degree: "B.Sc. Construction Management",
          school: "Heriot-Watt University Dubai",
          year: "2022",
        },
      ],
      skills: ["MS Project", "Procurement tracking", "Site coordination", "HSE documentation", "Arabic/English"],
      certifications: [],
    },
  },
  {
    id: "intl-hr-coordinator",
    region: "INTL",
    roleCategory: "human-resources",
    industry: "consulting",
    experienceLevel: "entry",
    title: "International HR Coordinator",
    description: "HR coordinator CV with recruiting support, onboarding, and HRIS administration.",
    content: {
      fullName: "Amelia Rossi",
      contact: {
        email: "amelia.rossi@email.com",
        phone: "+39 345 555 0199",
        location: "Milan, Italy (Remote)",
        linkedIn: "linkedin.com/in/ameliarossi",
      },
      summary:
        "HR coordinator supporting distributed teams with recruiting coordination, onboarding programmes, and accurate HRIS records across EMEA.",
      experience: [
        {
          title: "HR Coordinator",
          company: "Northline Advisory",
          location: "Remote — EMEA",
          startDate: "2022",
          endDate: "Present",
          bullets: [
            "Scheduled interviews and managed offer letters for 40+ hires across 6 countries.",
            "Owned new-hire onboarding checklists with 98% completion within week one.",
            "Updated employee records and policy acknowledgements in HRIS with audit-ready accuracy.",
          ],
        },
      ],
      education: [
        {
          degree: "B.A. Human Resource Management",
          school: "Bocconi University",
          year: "2022",
        },
      ],
      skills: ["Recruiting coordination", "Onboarding", "HRIS", "Employee relations", "English/Italian"],
      certifications: [],
    },
  },
  {
    id: "us-csm-associate",
    region: "US",
    roleCategory: "customer-success",
    industry: "technology",
    experienceLevel: "entry",
    title: "US Customer Success Associate — SaaS",
    description: "Associate CSM CV with onboarding, health checks, and renewal support.",
    content: {
      fullName: "Logan Price",
      contact: {
        email: "logan.price@email.com",
        phone: "+1 (303) 555-0171",
        location: "Denver, CO",
        linkedIn: "linkedin.com/in/loganprice",
      },
      summary:
        "Customer success associate helping SMB accounts adopt core product workflows, reduce time-to-value, and escalate expansion opportunities.",
      experience: [
        {
          title: "Customer Success Associate",
          company: "Trailhead CRM",
          location: "Denver, CO",
          startDate: "2023",
          endDate: "Present",
          bullets: [
            "Managed onboarding for 50+ accounts with average health score of 82 within 30 days.",
            "Created help-centre articles that reduced tier-1 support tickets by 14%.",
            "Partnered with sales on 9 expansion conversations tied to usage milestones.",
          ],
        },
      ],
      education: [
        {
          degree: "B.B.A. Business Administration",
          school: "University of Colorado Boulder",
          year: "2023",
        },
      ],
      skills: ["Onboarding", "Salesforce", "QBR preparation", "Churn risk triage", "Technical writing"],
      certifications: [],
    },
  },
  {
    id: "uk-operations-coordinator",
    region: "UK",
    roleCategory: "operations",
    industry: "logistics",
    experienceLevel: "entry",
    title: "UK Operations Coordinator — Logistics",
    description: "Operations coordinator CV with warehouse KPIs, vendor coordination, and process documentation.",
    content: {
      fullName: "Chloe Bennett",
      contact: {
        email: "chloe.bennett@email.co.uk",
        phone: "+44 7700 900321",
        location: "Leeds, UK",
      },
      summary:
        "Operations coordinator supporting fulfilment teams with inventory accuracy, carrier scheduling, and continuous improvement initiatives.",
      experience: [
        {
          title: "Operations Coordinator",
          company: "Northern Parcel Group",
          location: "Leeds, UK",
          startDate: "2022",
          endDate: "Present",
          bullets: [
            "Tracked daily pick-pack KPIs and escalated SLA risks to shift supervisors.",
            "Coordinated carrier collections reducing dock wait times by 18 minutes on average.",
            "Documented SOP updates after Kaizen events across two fulfilment lines.",
          ],
        },
      ],
      education: [
        {
          degree: "BSc Logistics & Supply Chain Management",
          school: "University of Leeds",
          year: "2022",
        },
      ],
      skills: ["WMS", "Inventory control", "Carrier management", "KPI reporting", "Lean basics"],
      certifications: [],
    },
  },
];
