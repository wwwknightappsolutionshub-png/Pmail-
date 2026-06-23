import type { JobHunterCvContent } from "../api/client";

type WizardSuggestions = {
  title: string;
  role: string;
  industry: string;
  content: JobHunterCvContent;
};

const SUGGESTIONS_BY_REGION: Record<string, WizardSuggestions> = {
  US: {
    title: "Product Manager CV — United States",
    role: "product",
    industry: "technology",
    content: {
      fullName: "Alex Rivera",
      contact: {
        email: "alex.rivera@email.com",
        phone: "+1 (415) 555-0101",
        location: "San Francisco, CA",
        linkedIn: "linkedin.com/in/alexrivera",
      },
      summary:
        "Product manager with 4+ years in B2B SaaS. Experienced in discovery interviews, roadmap prioritization, and shipping features that improve activation and retention.",
      experience: [
        {
          title: "Product Manager",
          company: "Northwind Analytics",
          location: "San Francisco, CA",
          startDate: "2021",
          endDate: "Present",
          bullets: [
            "Increased trial activation by 14% through guided onboarding experiments.",
            "Partnered with design and engineering to ship audit-log exports for enterprise accounts.",
          ],
        },
      ],
      education: [{ degree: "B.S. Information Systems", school: "San Jose State University", year: "2020" }],
      skills: ["Roadmapping", "SQL", "User research", "Agile", "Stakeholder management"],
      certifications: [],
    },
  },
  UK: {
    title: "Data Analyst CV — United Kingdom",
    role: "analytics",
    industry: "consulting",
    content: {
      fullName: "Priya Shah",
      contact: {
        email: "priya.shah@email.co.uk",
        phone: "+44 7700 900212",
        location: "London, UK",
        linkedIn: "linkedin.com/in/priyashah",
      },
      summary:
        "Data analyst supporting consulting clients with SQL modelling, executive dashboards, and clear written recommendations.",
      experience: [
        {
          title: "Data Analyst",
          company: "Harbor Consulting",
          location: "London, UK",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "Built forecasting models informing a £1.8M cost-reduction programme.",
            "Automated weekly KPI packs saving 10 analyst hours per month.",
          ],
        },
      ],
      education: [{ degree: "MSc Business Analytics", school: "University College London", year: "2019" }],
      skills: ["SQL", "Power BI", "Python", "Stakeholder communication"],
      certifications: [],
    },
  },
};

export function getCvWizardSuggestions(region: string): WizardSuggestions {
  return SUGGESTIONS_BY_REGION[region] ?? SUGGESTIONS_BY_REGION.US;
}
