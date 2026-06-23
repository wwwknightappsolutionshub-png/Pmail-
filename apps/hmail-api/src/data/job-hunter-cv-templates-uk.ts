import type { JobHunterCvTemplate } from "../lib/job-hunter-cv-content.js";

/** UK-focused profession templates — two ATS-ready samples per profession, all region UK. */
export const JOB_HUNTER_CV_TEMPLATE_UK: JobHunterCvTemplate[] = [
  {
    id: "uk-trainee-solicitor",
    region: "UK",
    roleCategory: "legal",
    industry: "legal",
    experienceLevel: "entry",
    title: "UK Trainee Solicitor — Commercial",
    description: "LPC/SQE graduate CV with seat rotations, client matter support, and UK legal formatting.",
    content: {
      fullName: "Charlotte Reid",
      contact: {
        email: "charlotte.reid@email.co.uk",
        phone: "+44 7700 901102",
        location: "Leeds, UK",
        linkedIn: "linkedin.com/in/charlottereid",
      },
      summary:
        "Trainee solicitor completing a two-year training contract with exposure to commercial contracts, dispute resolution, and due diligence. Strong legal research, drafting, and client communication skills.",
      experience: [
        {
          title: "Trainee Solicitor",
          company: "Hartley & Shaw LLP",
          location: "Leeds, UK",
          startDate: "2023",
          endDate: "Present",
          bullets: [
            "Supported corporate team on share purchase agreements and disclosure schedules for mid-market deals.",
            "Drafted witness statements and chronologies for county court litigation matters.",
            "Conducted legal research on regulatory compliance queries for financial services clients.",
          ],
        },
        {
          title: "Paralegal — Litigation",
          company: "Hartley & Shaw LLP",
          location: "Leeds, UK",
          startDate: "2022",
          endDate: "2023",
          bullets: [
            "Managed document bundles and hearing preparation for 15+ active matters.",
            "Liaised with counsel and clients on filing deadlines and evidence requests.",
          ],
        },
      ],
      education: [
        {
          degree: "LLM Legal Practice (Distinction)",
          school: "University of Law",
          year: "2022",
          details: "SQE1 passed",
        },
        {
          degree: "LLB Law",
          school: "University of Manchester",
          year: "2021",
        },
      ],
      skills: ["Legal research", "Contract drafting", "Due diligence", "Westlaw", "Client care", "Case management"],
      certifications: [],
    },
  },
  {
    id: "uk-commercial-solicitor",
    region: "UK",
    roleCategory: "legal",
    industry: "legal",
    experienceLevel: "senior",
    title: "UK Commercial Solicitor — Technology",
    description: "Senior associate CV with SaaS contracts, IP licensing, and partner-ready matter leadership.",
    content: {
      fullName: "Jonathan Pierce",
      contact: {
        email: "jonathan.pierce@email.co.uk",
        phone: "+44 7700 901203",
        location: "London, UK",
        linkedIn: "linkedin.com/in/jonathanpierce",
      },
      summary:
        "Commercial solicitor with 8 years advising technology and media clients on SaaS agreements, data protection, and vendor negotiations. Trusted advisor to in-house legal teams on scalable contracting playbooks.",
      experience: [
        {
          title: "Senior Associate — Commercial",
          company: "Fairview Legal LLP",
          location: "London, UK",
          startDate: "2019",
          endDate: "Present",
          bullets: [
            "Led negotiation of master service agreements for scale-up clients with aggregate contract value exceeding £40M.",
            "Advised on GDPR-compliant data processing terms for cross-border SaaS deployments.",
            "Supervised 2 junior associates and paralegals on due diligence and closing checklists.",
          ],
        },
      ],
      education: [
        {
          degree: "LPC",
          school: "BPP Law School",
          year: "2016",
        },
        {
          degree: "LLB Law (First Class)",
          school: "King's College London",
          year: "2015",
        },
      ],
      skills: ["SaaS contracts", "Data protection", "IP licensing", "Negotiation", "Legal project management", "Mentoring"],
      certifications: [],
    },
  },
  {
    id: "uk-primary-school-teacher",
    region: "UK",
    roleCategory: "education",
    industry: "education",
    experienceLevel: "entry",
    title: "UK Primary School Teacher — KS2",
    description: "ECT CV with classroom management, curriculum delivery, and safeguarding awareness.",
    content: {
      fullName: "Amelia Hughes",
      contact: {
        email: "amelia.hughes@email.co.uk",
        phone: "+44 7700 901304",
        location: "Nottingham, UK",
      },
      summary:
        "Early career teacher specialising in Key Stage 2 with strong behaviour management and inclusive classroom practice. Experienced in phonics, maths mastery approaches, and parent engagement.",
      experience: [
        {
          title: "Primary School Teacher (ECT)",
          company: "Riverside Community Academy",
          location: "Nottingham, UK",
          startDate: "2023",
          endDate: "Present",
          bullets: [
            "Planned and delivered Year 4 curriculum across core subjects with above-average pupil progress in reading.",
            "Implemented adaptive learning strategies for pupils with SEND in mainstream classroom settings.",
            "Led after-school reading club attended by 18 pupils twice weekly.",
          ],
        },
        {
          title: "Teaching Placement — Year 5",
          company: "Meadowbank Primary School",
          location: "Derby, UK",
          startDate: "2022",
          endDate: "2023",
          bullets: [
            "Taught full classes under mentor supervision with positive feedback on lesson pacing and assessment.",
            "Contributed to school safeguarding procedures and weekly phase meetings.",
          ],
        },
      ],
      education: [
        {
          degree: "PGCE Primary Education",
          school: "University of Nottingham",
          year: "2023",
          details: "QTS awarded",
        },
        {
          degree: "BA English Literature",
          school: "University of Leicester",
          year: "2022",
        },
      ],
      skills: ["Lesson planning", "Behaviour management", "Differentiation", "Assessment for learning", "Safeguarding", "Parent communication"],
      certifications: [{ name: "DBS Enhanced Certificate", issuer: "UK DBS", year: "2023" }],
    },
  },
  {
    id: "uk-head-of-department-secondary",
    region: "UK",
    roleCategory: "education",
    industry: "education",
    experienceLevel: "senior",
    title: "UK Head of Department — Secondary Science",
    description: "Senior teacher CV with curriculum leadership, GCSE outcomes, and staff line management.",
    content: {
      fullName: "Dr. Raj Mehta",
      contact: {
        email: "raj.mehta@email.co.uk",
        phone: "+44 7700 901405",
        location: "Cambridge, UK",
        linkedIn: "linkedin.com/in/rajmehta",
      },
      summary:
        "Head of Science with 12 years in secondary education. Experienced leading departmental improvement plans, GCSE and A-Level outcomes, and coaching early career teachers.",
      experience: [
        {
          title: "Head of Science",
          company: "Cambridge Vale Secondary School",
          location: "Cambridge, UK",
          startDate: "2018",
          endDate: "Present",
          bullets: [
            "Raised GCSE combined science grades 4+ rate from 61% to 74% over three academic years.",
            "Line-managed team of 9 teachers including performance reviews and CPD planning.",
            "Introduced practical assessment rubrics adopted across the trust's science departments.",
          ],
        },
        {
          title: "Teacher of Chemistry",
          company: "Cambridge Vale Secondary School",
          location: "Cambridge, UK",
          startDate: "2014",
          endDate: "2018",
          bullets: [
            "Taught GCSE and A-Level chemistry with consistent value-added above school average.",
            "Ran STEM enrichment programme partnering with local university outreach.",
          ],
        },
      ],
      education: [
        {
          degree: "PhD Chemistry",
          school: "University of Cambridge",
          year: "2013",
        },
        {
          degree: "PGCE Secondary Science",
          school: "University of Cambridge",
          year: "2014",
          details: "QTS",
        },
      ],
      skills: ["Curriculum leadership", "GCSE/A-Level delivery", "Line management", "Data-driven intervention", "STEM outreach", "Safeguarding"],
      certifications: [],
    },
  },
  {
    id: "uk-social-worker-adult-services",
    region: "UK",
    roleCategory: "social-work",
    industry: "public-sector",
    experienceLevel: "mid",
    title: "UK Social Worker — Adult Services",
    description: "Registered social worker CV with care assessments, multi-agency working, and UK statutory duties.",
    content: {
      fullName: "Grace Okafor",
      contact: {
        email: "grace.okafor@email.co.uk",
        phone: "+44 7700 901506",
        location: "Sheffield, UK",
      },
      summary:
        "Social worker with 5 years in adult social care supporting safeguarding, care planning, and hospital discharge pathways. Skilled in strengths-based assessments and working with occupational therapy and health colleagues.",
      experience: [
        {
          title: "Social Worker — Adult Services",
          company: "Sheffield City Council",
          location: "Sheffield, UK",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Managed caseload of 28 service users with timely Care Act assessments and review meetings.",
            "Coordinated hospital discharge plans reducing delayed transfers of care by 12%.",
            "Contributed to safeguarding enquiries with clear chronologies and multi-agency minutes.",
          ],
        },
      ],
      education: [
        {
          degree: "MA Social Work",
          school: "University of Sheffield",
          year: "2019",
          details: "Social Work England registered",
        },
        {
          degree: "BSc Sociology",
          school: "University of Leeds",
          year: "2017",
        },
      ],
      skills: ["Care Act assessments", "Safeguarding", "Multi-agency working", "Care planning", "Court reports", "Case recording"],
      certifications: [{ name: "Social Work England Registration", issuer: "Social Work England", year: "2019" }],
    },
  },
  {
    id: "uk-senior-social-worker-children",
    region: "UK",
    roleCategory: "social-work",
    industry: "public-sector",
    experienceLevel: "senior",
    title: "UK Senior Social Worker — Children's Services",
    description: "Experienced practitioner CV with child protection, court work, and team supervision.",
    content: {
      fullName: "Michael Brennan",
      contact: {
        email: "michael.brennan@email.co.uk",
        phone: "+44 7700 901607",
        location: "Bristol, UK",
      },
      summary:
        "Senior social worker with 9 years in children's services including child protection, looked-after children, and court reporting. Experienced supervising newly qualified social workers and chairing strategy discussions.",
      experience: [
        {
          title: "Senior Social Worker — Child Protection",
          company: "Bristol City Council",
          location: "Bristol, UK",
          startDate: "2018",
          endDate: "Present",
          bullets: [
            "Held child protection caseload with complex domestic abuse and neglect factors.",
            "Prepared court statements and gave evidence in care proceedings.",
            "Mentored 3 ASYE social workers through statutory induction standards.",
          ],
        },
      ],
      education: [
        {
          degree: "MA Social Work",
          school: "University of the West of England",
          year: "2015",
          details: "Social Work England registered",
        },
      ],
      skills: ["Child protection", "Court work", "LAC reviews", "Supervision", "Child-centred planning", "Risk assessment"],
      certifications: [{ name: "Practice Educator Stage 1", issuer: "BASW", year: "2021" }],
    },
  },
  {
    id: "uk-front-office-supervisor",
    region: "UK",
    roleCategory: "hospitality",
    industry: "hospitality",
    experienceLevel: "entry",
    title: "UK Front Office Supervisor — Hotel",
    description: "Hospitality CV with guest experience, shift leadership, and UK hotel operations.",
    content: {
      fullName: "Ella Morrison",
      contact: {
        email: "ella.morrison@email.co.uk",
        phone: "+44 7700 901708",
        location: "York, UK",
      },
      summary:
        "Front office supervisor with 3 years in boutique and business hotels. Strong in guest relations, Opera PMS, and training front-desk teams on service standards and upsell programmes.",
      experience: [
        {
          title: "Front Office Supervisor",
          company: "The Minster Hotel",
          location: "York, UK",
          startDate: "2022",
          endDate: "Present",
          bullets: [
            "Supervised reception team of 6 across day and evening shifts with 4.7/5 guest satisfaction scores.",
            "Managed check-in/check-out for 120+ room property during peak tourism seasons.",
            "Trained staff on upselling room upgrades contributing £38K incremental revenue annually.",
          ],
        },
        {
          title: "Guest Services Agent",
          company: "The Minster Hotel",
          location: "York, UK",
          startDate: "2021",
          endDate: "2022",
          bullets: [
            "Resolved guest complaints within 15-minute service standard in 94% of cases.",
            "Supported night audit procedures and cash reconciliation accuracy.",
          ],
        },
      ],
      education: [
        {
          degree: "BA International Hospitality Management",
          school: "Leeds Beckett University",
          year: "2021",
        },
      ],
      skills: ["Opera PMS", "Guest relations", "Shift supervision", "Upselling", "Complaint resolution", "Cash handling"],
      certifications: [],
    },
  },
  {
    id: "uk-hotel-general-manager",
    region: "UK",
    roleCategory: "hospitality",
    industry: "hospitality",
    experienceLevel: "senior",
    title: "UK Hotel General Manager — City Centre",
    description: "GM CV with P&L ownership, team leadership, and RevPAR growth in UK markets.",
    content: {
      fullName: "Andrew Fletcher",
      contact: {
        email: "andrew.fletcher@email.co.uk",
        phone: "+44 7700 901809",
        location: "Glasgow, UK",
        linkedIn: "linkedin.com/in/andrewfletcher",
      },
      summary:
        "Hotel general manager with 11 years leading city-centre properties for independent and branded operators. Experienced in revenue management, labour cost control, and delivering memorable guest experiences.",
      experience: [
        {
          title: "General Manager",
          company: "Clyde Quarter Hotel",
          location: "Glasgow, UK",
          startDate: "2017",
          endDate: "Present",
          bullets: [
            "Grew RevPAR 18% over two years through dynamic pricing and corporate segment development.",
            "Reduced staff turnover from 42% to 26% via structured onboarding and career pathways.",
            "Achieved 88% mystery shopper score and Green Tourism silver accreditation.",
          ],
        },
      ],
      education: [
        {
          degree: "HND Hospitality Management",
          school: "City of Glasgow College",
          year: "2012",
        },
      ],
      skills: ["P&L management", "Revenue management", "Team leadership", "Health & safety", "Procurement", "Brand standards"],
      certifications: [{ name: "IHG Leadership Foundations", issuer: "IHG", year: "2019" }],
    },
  },
  {
    id: "uk-lettings-negotiator",
    region: "UK",
    roleCategory: "property",
    industry: "real-estate",
    experienceLevel: "entry",
    title: "UK Lettings Negotiator — Residential",
    description: "Estate agency CV with viewings, tenancy progression, and compliance checks.",
    content: {
      fullName: "Sophie Campbell",
      contact: {
        email: "sophie.campbell@email.co.uk",
        phone: "+44 7700 901910",
        location: "Brighton, UK",
      },
      summary:
        "Lettings negotiator with 2 years in fast-paced South Coast agency. Skilled in tenant vetting, landlord communication, and progressing applications to move-in within target timelines.",
      experience: [
        {
          title: "Lettings Negotiator",
          company: "Coastline Homes",
          location: "Brighton, UK",
          startDate: "2023",
          endDate: "Present",
          bullets: [
            "Conducted 25+ viewings weekly with 31% application conversion rate.",
            "Managed referencing and AST issuance for 40+ tenancies per quarter.",
            "Maintained CRM records and compliance documentation for deposit protection schemes.",
          ],
        },
      ],
      education: [
        {
          degree: "BA Business Management",
          school: "University of Sussex",
          year: "2022",
        },
      ],
      skills: ["Viewings", "Tenant referencing", "AST administration", "Landlord liaison", "CRM", "Compliance"],
      certifications: [{ name: "Propertymark Level 2 Award in Residential Letting", issuer: "Propertymark", year: "2023" }],
    },
  },
  {
    id: "uk-residential-property-manager",
    region: "UK",
    roleCategory: "property",
    industry: "real-estate",
    experienceLevel: "mid",
    title: "UK Property Manager — Residential Portfolio",
    description: "Portfolio manager CV with block management, contractor oversight, and service charge reporting.",
    content: {
      fullName: "Daniel Wright",
      contact: {
        email: "daniel.wright@email.co.uk",
        phone: "+44 7700 902011",
        location: "Birmingham, UK",
        linkedIn: "linkedin.com/in/danielwright",
      },
      summary:
        "Property manager overseeing 350+ residential units across mixed-tenure developments. Experienced in service charge budgets, section 20 consultations, and responsive repairs with contractor SLAs.",
      experience: [
        {
          title: "Property Manager",
          company: "Urban Living Management",
          location: "Birmingham, UK",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Reduced average repair completion time from 9 to 5 days through contractor scorecards.",
            "Prepared annual service charge budgets and year-end accounts for 6 RMC clients.",
            "Chaired resident liaison meetings and resolved escalations with 92% first-contact resolution.",
          ],
        },
      ],
      education: [
        {
          degree: "BSc Building Surveying",
          school: "Birmingham City University",
          year: "2019",
        },
      ],
      skills: ["Block management", "Service charges", "Contractor management", "Section 20", "Resident relations", "Budgeting"],
      certifications: [{ name: "IRPM Member", issuer: "IRPM", year: "2022" }],
    },
  },
];
