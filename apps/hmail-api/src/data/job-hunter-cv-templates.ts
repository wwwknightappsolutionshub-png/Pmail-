import type { JobHunterCvTemplate } from "../lib/job-hunter-cv-content.js";
import {
  CV_EXPERIENCE_LEVELS,
  CV_PROFESSION_LABELS,
  groupCvTemplatesByProfession,
  sortCvTemplates,
  type CvExperienceLevel,
} from "../lib/job-hunter-cv-hub.js";
import { JOB_HUNTER_CV_TEMPLATE_EXTRAS } from "./job-hunter-cv-templates-extra.js";
import { JOB_HUNTER_CV_TEMPLATE_MORE } from "./job-hunter-cv-templates-more.js";
import { JOB_HUNTER_CV_TEMPLATE_UK } from "./job-hunter-cv-templates-uk.js";
import { JOB_HUNTER_CV_TEMPLATE_HUB_FILL } from "./job-hunter-cv-templates-hub-fill.js";

export const JOB_HUNTER_CV_TEMPLATES: JobHunterCvTemplate[] = [
  {
    id: "us-software-engineer-tech",
    region: "US",
    roleCategory: "engineering",
    industry: "technology",
    experienceLevel: "senior",
    title: "US Software Engineer — Technology",
    description: "One-page US format with quantified engineering impact and ATS-friendly headings.",
    content: {
      fullName: "Jordan Lee",
      contact: {
        email: "jordan.lee@email.com",
        phone: "+1 (415) 555-0142",
        location: "San Francisco, CA",
        linkedIn: "linkedin.com/in/jordanlee",
      },
      summary:
        "Full-stack software engineer with 6+ years building SaaS products. Strong in TypeScript, React, and cloud-native APIs. Known for shipping reliable features on tight deadlines and improving deployment safety.",
      experience: [
        {
          title: "Senior Software Engineer",
          company: "Northwind Labs",
          location: "San Francisco, CA",
          startDate: "2021",
          endDate: "Present",
          bullets: [
            "Led migration of billing service to event-driven architecture, reducing failed payments by 18%.",
            "Built internal design system adopted by 4 product teams, cutting UI delivery time by 30%.",
            "Mentored 3 engineers through on-call rotations and production incident reviews.",
          ],
        },
        {
          title: "Software Engineer",
          company: "BrightPath Health",
          location: "Oakland, CA",
          startDate: "2018",
          endDate: "2021",
          bullets: [
            "Delivered patient portal features used by 120K monthly active users.",
            "Introduced automated API contract tests that reduced regression bugs by 25%.",
          ],
        },
      ],
      education: [
        {
          degree: "B.S. Computer Science",
          school: "University of California, Davis",
          year: "2018",
        },
      ],
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "CI/CD", "System design"],
      certifications: [{ name: "AWS Certified Developer – Associate", issuer: "Amazon Web Services", year: "2023" }],
    },
  },
  {
    id: "us-product-manager-saas",
    region: "US",
    roleCategory: "product",
    industry: "technology",
    experienceLevel: "senior",
    title: "US Product Manager — SaaS",
    description: "Outcome-focused PM resume with roadmap, metrics, and cross-functional leadership.",
    content: {
      fullName: "Avery Morgan",
      contact: {
        email: "avery.morgan@email.com",
        phone: "+1 (646) 555-0198",
        location: "New York, NY",
        linkedIn: "linkedin.com/in/averymorgan",
      },
      summary:
        "Product manager with 5 years in B2B SaaS. Experienced in discovery, PRD writing, and GTM alignment. Comfortable partnering with engineering, design, and customer success to launch features customers adopt.",
      experience: [
        {
          title: "Product Manager",
          company: "CloudDesk",
          location: "New York, NY",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Owned onboarding funnel improvements that increased trial-to-paid conversion by 12%.",
            "Prioritized roadmap using usage analytics and 40+ customer interviews per quarter.",
            "Launched admin audit logs feature driving enterprise upsells in regulated industries.",
          ],
        },
      ],
      education: [
        {
          degree: "MBA, Technology Management",
          school: "NYU Stern School of Business",
          year: "2020",
        },
        {
          degree: "B.A. Economics",
          school: "Boston University",
          year: "2016",
        },
      ],
      skills: ["Roadmapping", "User research", "SQL", "Figma", "Agile", "Stakeholder management"],
      certifications: [],
    },
  },
  {
    id: "ca-software-developer-fintech",
    region: "CA",
    roleCategory: "engineering",
    industry: "finance",
    experienceLevel: "mid",
    title: "Canada Software Developer — FinTech",
    description: "Canadian spelling and concise two-page-friendly structure for regulated finance roles.",
    content: {
      fullName: "Priya Sharma",
      contact: {
        email: "priya.sharma@email.ca",
        phone: "+1 (416) 555-0177",
        location: "Toronto, ON",
        linkedIn: "linkedin.com/in/priyasharma",
      },
      summary:
        "Software developer specializing in secure payment integrations and audit-ready services. Experienced collaborating with compliance teams in Canadian FinTech environments.",
      experience: [
        {
          title: "Software Developer II",
          company: "MaplePay",
          location: "Toronto, ON",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Implemented PCI-aware tokenization flow for merchant onboarding across English and French UI.",
            "Reduced reconciliation batch runtime by 35% through query optimization and caching.",
            "Participated in SOC 2 evidence collection and release control documentation.",
          ],
        },
      ],
      education: [
        {
          degree: "B.Eng. Software Engineering",
          school: "University of Waterloo",
          year: "2019",
        },
      ],
      skills: ["Java", "Spring Boot", "PostgreSQL", "Kafka", "Docker", "Security reviews"],
      certifications: [{ name: "Canadian Securities Course (CSC)", issuer: "CSI", year: "2021" }],
    },
  },
  {
    id: "ca-nurse-healthcare",
    region: "CA",
    roleCategory: "healthcare",
    industry: "healthcare",
    experienceLevel: "mid",
    title: "Canada Registered Nurse — Clinical",
    description: "Clinical RN CV with licensure, patient care metrics, and bilingual note for Canadian markets.",
    content: {
      fullName: "Emily Tremblay",
      contact: {
        email: "emily.tremblay@email.ca",
        phone: "+1 (514) 555-0133",
        location: "Montreal, QC",
      },
      summary:
        "Registered nurse with 7 years in acute care and patient education. Bilingual English/French. Recognized for calm triage under pressure and interdisciplinary collaboration.",
      experience: [
        {
          title: "Registered Nurse — Medical Unit",
          company: "Centre hospitalier du Mont-Royal",
          location: "Montreal, QC",
          startDate: "2019",
          endDate: "Present",
          bullets: [
            "Managed care for 5–6 patients per shift with strong medication administration accuracy.",
            "Led discharge planning sessions that improved follow-up appointment attendance.",
            "Precepted 4 new graduate nurses during orientation periods.",
          ],
        },
      ],
      education: [
        {
          degree: "B.Sc. Nursing",
          school: "McGill University",
          year: "2018",
          details: "Registered Nurse (OIIQ)",
        },
      ],
      skills: ["Patient assessment", "EMR documentation", "IV therapy", "Patient education", "Bilingual EN/FR"],
      certifications: [{ name: "BLS Certification", issuer: "Heart & Stroke Foundation", year: "2025" }],
    },
  },
  {
    id: "uk-data-analyst-consulting",
    region: "UK",
    roleCategory: "analytics",
    industry: "consulting",
    experienceLevel: "mid",
    title: "UK Data Analyst — Consulting",
    description: "UK CV style with clear sections, UK spelling, and consulting engagement highlights.",
    content: {
      fullName: "Olivia Bennett",
      contact: {
        email: "olivia.bennett@email.co.uk",
        phone: "+44 7700 900123",
        location: "London, UK",
        linkedIn: "linkedin.com/in/oliviabennett",
      },
      summary:
        "Data analyst with experience supporting strategy and operations teams across retail and public sector clients. Skilled in SQL, Power BI, and translating analysis into executive-ready recommendations.",
      experience: [
        {
          title: "Senior Data Analyst",
          company: "Harbor Consulting",
          location: "London, UK",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Built forecasting models that informed £2.1M cost-reduction programme for retail client.",
            "Automated weekly KPI packs, saving 12 analyst hours per month.",
            "Facilitated workshops with non-technical stakeholders to define success metrics.",
          ],
        },
      ],
      education: [
        {
          degree: "MSc Business Analytics",
          school: "University College London",
          year: "2019",
        },
      ],
      skills: ["SQL", "Power BI", "Python", "Excel", "Stakeholder communication", "A/B testing"],
      certifications: [],
    },
  },
  {
    id: "uk-marketing-manager-retail",
    region: "UK",
    roleCategory: "marketing",
    industry: "retail",
    experienceLevel: "senior",
    title: "UK Marketing Manager — Retail",
    description: "Campaign-led marketing CV tailored to UK retail employers and brand teams.",
    content: {
      fullName: "James Wright",
      contact: {
        email: "james.wright@email.co.uk",
        phone: "+44 7700 900456",
        location: "Manchester, UK",
      },
      summary:
        "Marketing manager with 8 years in omnichannel retail. Experienced in brand campaigns, CRM journeys, and vendor management with measurable ROI.",
      experience: [
        {
          title: "Marketing Manager",
          company: "Urban Thread Co.",
          location: "Manchester, UK",
          startDate: "2019",
          endDate: "Present",
          bullets: [
            "Increased email revenue by 22% through segmentation and lifecycle automation.",
            "Managed £450K annual media budget across paid social and influencer partnerships.",
            "Launched loyalty programme reaching 80K members in first year.",
          ],
        },
      ],
      education: [
        {
          degree: "BA Marketing",
          school: "University of Leeds",
          year: "2016",
        },
      ],
      skills: ["Campaign planning", "CRM", "Google Analytics", "Copywriting", "Budget management"],
      certifications: [{ name: "CIM Level 6 Diploma", issuer: "Chartered Institute of Marketing", year: "2020" }],
    },
  },
  {
    id: "me-project-manager-construction",
    region: "ME",
    roleCategory: "project-management",
    industry: "construction",
    experienceLevel: "senior",
    title: "Middle East Project Manager — Construction",
    description: "GCC-oriented CV with nationality/visa note and formal tone for infrastructure projects.",
    content: {
      fullName: "Ahmed Al-Rashid",
      contact: {
        email: "ahmed.alrashid@email.com",
        phone: "+971 50 123 4567",
        location: "Dubai, UAE",
      },
      summary:
        "Project manager with 10+ years delivering commercial and mixed-use developments across the GCC. Strong in contractor coordination, HSE compliance, and stakeholder reporting.",
      experience: [
        {
          title: "Senior Project Manager",
          company: "Gulf Horizon Developers",
          location: "Dubai, UAE",
          startDate: "2018",
          endDate: "Present",
          bullets: [
            "Delivered AED 240M tower fit-out 6 weeks ahead of schedule with zero lost-time incidents.",
            "Managed multidisciplinary teams of 45+ including consultants and subcontractors.",
            "Prepared monthly progress reports for investors and municipal authorities.",
          ],
        },
      ],
      education: [
        {
          degree: "B.Eng. Civil Engineering",
          school: "American University of Sharjah",
          year: "2013",
        },
      ],
      skills: ["Primavera P6", "Contract administration", "HSE", "Cost control", "Arabic/English"],
      certifications: [{ name: "PMP", issuer: "PMI", year: "2019" }],
    },
  },
  {
    id: "me-hr-business-partner",
    region: "ME",
    roleCategory: "human-resources",
    industry: "consulting",
    experienceLevel: "mid",
    title: "Middle East HR Business Partner",
    description: "HR BP template with regional employment law awareness and talent programmes.",
    content: {
      fullName: "Fatima Hassan",
      contact: {
        email: "fatima.hassan@email.com",
        phone: "+966 55 987 6543",
        location: "Riyadh, Saudi Arabia",
      },
      summary:
        "HR business partner supporting 600+ employee professional services firm. Experienced in workforce planning, Saudization programmes, and employee relations in multinational environments.",
      experience: [
        {
          title: "HR Business Partner",
          company: "Summit Advisory Group",
          location: "Riyadh, KSA",
          startDate: "2019",
          endDate: "Present",
          bullets: [
            "Partnered with practice leaders to reduce time-to-fill for critical roles by 28%.",
            "Designed graduate intake programme with 92% retention after 12 months.",
            "Led policy updates aligned with local labour regulations and company values.",
          ],
        },
      ],
      education: [
        {
          degree: "BBA Human Resource Management",
          school: "King Saud University",
          year: "2017",
        },
      ],
      skills: ["Talent acquisition", "Employee relations", "HRIS", "Performance management", "Arabic/English"],
      certifications: [{ name: "SHRM-CP", issuer: "SHRM", year: "2022" }],
    },
  },
  {
    id: "intl-customer-success-saas",
    region: "INTL",
    roleCategory: "customer-success",
    industry: "technology",
    experienceLevel: "mid",
    title: "International Customer Success — SaaS",
    description: "Neutral international format for remote-first SaaS companies.",
    content: {
      fullName: "Sofia Martins",
      contact: {
        email: "sofia.martins@email.com",
        phone: "+351 912 345 678",
        location: "Lisbon, Portugal (Remote)",
        linkedIn: "linkedin.com/in/sofiamartins",
      },
      summary:
        "Customer success manager supporting enterprise SaaS accounts across EMEA. Focused on onboarding, adoption, and renewal growth through proactive engagement and health scoring.",
      experience: [
        {
          title: "Customer Success Manager",
          company: "Orbit CRM",
          location: "Remote — EMEA",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Maintained 94% gross retention across portfolio of 35 mid-market accounts.",
            "Built playbooks that reduced time-to-first-value from 21 to 12 days.",
            "Collaborated with product on feature requests tied to $1.3M expansion pipeline.",
          ],
        },
      ],
      education: [
        {
          degree: "B.A. Business Administration",
          school: "Universidade Nova de Lisboa",
          year: "2018",
        },
      ],
      skills: ["Account management", "QBRs", "Salesforce", "Churn analysis", "English/Portuguese/Spanish"],
      certifications: [],
    },
  },
  {
    id: "intl-operations-lead-logistics",
    region: "INTL",
    roleCategory: "operations",
    industry: "logistics",
    experienceLevel: "senior",
    title: "International Operations Lead — Logistics",
    description: "Operations leadership CV for global supply chain and fulfilment roles.",
    content: {
      fullName: "Daniel Okonkwo",
      contact: {
        email: "daniel.okonkwo@email.com",
        phone: "+234 803 555 0199",
        location: "Lagos, Nigeria",
      },
      summary:
        "Operations lead with experience scaling warehouse and last-mile networks. Strong in KPI dashboards, vendor SLAs, and continuous improvement across multi-site teams.",
      experience: [
        {
          title: "Operations Lead",
          company: "SwiftParcel Africa",
          location: "Lagos, Nigeria",
          startDate: "2018",
          endDate: "Present",
          bullets: [
            "Improved order fulfilment accuracy from 96.2% to 99.1% within 9 months.",
            "Rolled out shift scheduling model that reduced overtime spend by 14%.",
            "Led ISO-aligned SOP refresh across 3 distribution centres.",
          ],
        },
      ],
      education: [
        {
          degree: "B.Sc. Industrial Engineering",
          school: "University of Lagos",
          year: "2016",
        },
      ],
      skills: ["Process improvement", "WMS", "Lean", "Team leadership", "Budget tracking"],
      certifications: [{ name: "Six Sigma Green Belt", issuer: "ASQ", year: "2021" }],
    },
  },
  ...JOB_HUNTER_CV_TEMPLATE_EXTRAS,
  ...JOB_HUNTER_CV_TEMPLATE_MORE,
  ...JOB_HUNTER_CV_TEMPLATE_UK,
  ...JOB_HUNTER_CV_TEMPLATE_HUB_FILL,
];

const ALL_CV_TEMPLATES = JOB_HUNTER_CV_TEMPLATES;

export function listCvTemplates(filters?: {
  region?: string;
  role?: string;
  industry?: string;
  experienceLevel?: string;
  sortBy?: "country" | "experience" | "profession";
}) {
  const filtered = ALL_CV_TEMPLATES.filter((template) => {
    if (filters?.region && template.region !== filters.region.toUpperCase()) return false;
    if (filters?.role && template.roleCategory !== filters.role.toLowerCase()) return false;
    if (filters?.industry && template.industry !== filters.industry.toLowerCase()) return false;
    if (filters?.experienceLevel && template.experienceLevel !== filters.experienceLevel.toLowerCase()) return false;
    return true;
  }).map(({ content: _content, ...meta }) => meta);

  return sortCvTemplates(filtered, filters?.sortBy ?? "profession");
}

export function listCvTemplateHub(filters?: {
  region?: string;
  role?: string;
  industry?: string;
  experienceLevel?: string;
  sortBy?: "country" | "experience" | "profession";
}) {
  const templates = listCvTemplates(filters);
  return {
    templates,
    groupedByProfession: groupCvTemplatesByProfession(templates),
    filters: listCvTemplateFilters(),
  };
}

export function getCvTemplateById(id: string) {
  return ALL_CV_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function listCvTemplateFilters() {
  const roleCategories = [...new Set(ALL_CV_TEMPLATES.map((t) => t.roleCategory))].sort();
  const industries = [...new Set(ALL_CV_TEMPLATES.map((t) => t.industry))].sort();
  const experienceLevels = [...CV_EXPERIENCE_LEVELS];
  const professions = roleCategories.map((code) => ({
    code,
    label: CV_PROFESSION_LABELS[code] ?? code.replace(/-/g, " "),
  }));
  return { roleCategories, industries, experienceLevels, professions };
}
