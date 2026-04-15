export const portfolioData = {
  personal: {
    name: "Misha Semenov",
    fullName: "Mykhailo 'Misha' Semenov",
    firstName: "Misha",
    location: "New York, NY",
    headline: "Business analytics graduate student building practical AI tools.",
    heroTitle: ["Analytics that", "make sense fast", "and hold up later"],
    heroDescription:
      "I build reporting, automation, and AI workflows that help teams move from raw information to clearer decisions.",
  },

  contact: {
    publicEmail: "micksems01@gmail.com",
    linkedin: "https://www.linkedin.com/in/mykhailo-semenov/",
    location: "New York, NY",
    availability: "",
  },

  summary: {
    short: "Practical analytics work with a strong communication layer.",
    long: "My work sits between analysis, automation, and business context, so the output is useful to the people making decisions.",
    secondary: "I care about making technical work understandable, not just impressive.",
    tertiary: "If you want more detail, the assistant can walk through projects, tools, and experience.",
    focusAreas: [
      "Agentic AI",
      "Workflow Automation",
      "Business Analytics",
      "Data Visualization",
      "CRM and Marketing Analytics",
    ],
  },

  education: [
    {
      school: "Fordham University Gabelli School of Business",
      degree: "MS in Business Analytics",
      location: "New York, NY",
      start: "2025",
      end: "2026",
      current: true,
      details: ["Focused on AI systems, reporting, and decision support for real business use cases."],
    },
    {
      school: "Lewis University",
      degree: "BS in Business Administration",
      location: "Romeoville, IL",
      start: "2021",
      end: "2025",
      current: false,
      details: ["Completed while competing as a Division I NCAA swimmer and balancing a high-performance schedule."],
    },
    {
      school: "Emmanuel University",
      degree: "BS studies in Business Administration",
      location: "Franklin Springs, GA",
      start: "2021",
      end: "2023",
      current: false,
      details: ["Started my business studies here before transferring and continuing the degree path elsewhere."],
    },
  ],

  experience: [
    {
      company: "United Nations",
      role: "AI & Automation Intern",
      location: "New York",
      start: "Jan 2026",
      end: "Present",
      category: "AI & Automation",
      summary: "Building internal AI tooling with Microsoft Copilot Studio to support day-to-day operations.",
      highlights: [
        "Built workflow tools in a live operating environment where reliability matters.",
        "Created assistant experiences for recurring administrative and analytical requests.",
      ],
      tools: ["Microsoft Copilot Studio", "Power Automate", "Teams", "Slack"],
    },
    {
      company: "Lewis University",
      role: "ISGSS Coordinator",
      location: "",
      start: "Aug 2024",
      end: "May 2025",
      category: "Coordination",
      summary: "Managed program coordination and kept communication moving across teams.",
      highlights: [
        "Coordinated planning and delivery across student and staff stakeholders.",
        "Kept recurring work organized and dependable across changing needs.",
      ],
      tools: ["Excel", "PowerPoint", "Teams"],
    },
    {
      company: "Camp Vega",
      role: "AI Data Analytics Intern",
      location: "",
      start: "May 2024",
      end: "Aug 2024",
      category: "Analytics",
      summary: "Handled operational analysis and AI-supported reporting for leadership review.",
      highlights: [
        "Analyzed seasonal operations and turned the results into usable reports.",
        "Packaged analysis in a way that worked for non-technical decision-makers.",
      ],
      tools: ["Python", "Excel", "Google Colab"],
    },
    {
      company: "Pinear",
      role: "Marketing Analytics Intern",
      location: "",
      start: "Mar 2024",
      end: "Jun 2024",
      category: "Marketing Analytics",
      summary: "Built performance reporting and behavior analysis around marketing data.",
      highlights: [
        "Created campaign reporting tied to weekly decisions, not just passive dashboards.",
        "Analyzed customer behavior and channel performance across marketing data.",
      ],
      tools: ["Excel", "Tableau", "SEO"],
    },
    {
      company: "Svitlovodsk Metal Producing Factory",
      role: "Sales Manager",
      location: "Ukraine",
      start: "Aug 2019",
      end: "Jan 2021",
      category: "Sales",
      summary: "Managed sales activity and client communication in a fast-moving environment.",
      highlights: [
        "Handled client communication and recurring sales operations.",
        "Built an early foundation in pace, accountability, and execution discipline.",
      ],
      tools: ["Sales Operations", "Client Communication"],
    },
  ],

  projects: [
    {
      title: "AI Portfolio Assistant",
      subtitle: "Conversational AI",
      description:
        "Built a Gemini-powered assistant on top of structured portfolio data so recruiters and hiring managers can explore my background naturally.",
      tools: ["Next.js", "Gemini API", "Tailwind CSS", "JavaScript"],
      image: null,
      link: null,
    },
    {
      title: "UN Internal Copilot Agent",
      subtitle: "Enterprise Automation",
      description:
        "Designed Copilot Studio flows with Power Automate to handle recurring support requests inside real operational constraints.",
      tools: ["Microsoft Copilot Studio", "Power Automate", "Teams"],
      image: null,
      link: null,
    },
    {
      title: "March Madness Prediction Model",
      subtitle: "Predictive Analytics",
      description:
        "Built a Python and SQL classification pipeline, improving prediction quality through feature engineering and disciplined data cleaning.",
      tools: ["Python", "SQL", "Machine Learning", "Data Preprocessing"],
      image: null,
      link: null,
    },
    {
      title: "Decision Reporting in Excel",
      subtitle: "Business Reporting",
      description:
        "Created Excel reporting models with clear KPI logic and presentation-ready outputs for faster stakeholder review.",
      tools: ["Excel", "Data Modeling", "PowerPoint"],
      image: null,
      link: null,
    },
    {
      title: "Machine Learning for Business",
      subtitle: "Applied ML",
      description:
        "Applied supervised learning to business cases and translated the results into actions non-technical teams could actually use.",
      tools: ["Python", "Google Colab", "Data Preprocessing"],
      image: null,
      link: null,
    },
    {
      title: "Tableau Executive Dashboards",
      subtitle: "Data Visualization",
      description:
        "Built Tableau dashboards that reduced chart clutter and highlighted trend, risk, and performance signals for faster executive reads.",
      tools: ["Tableau", "Data Visualization", "Business Analytics"],
      image: null,
      link: null,
    },
    {
      title: "Python Fitness Tracker",
      subtitle: "Product Analytics",
      description:
        "Developed a lightweight Python tracker with structured data flow and progress metrics for recurring performance analysis.",
      tools: ["Python", "Data Modeling"],
      image: null,
      link: null,
    },
  ],

  skills: [
    "Business Analytics",
    "AI Systems",
    "Workflow Automation",
    "CRM Workflows",
    "Marketing Analytics",
    "Data Visualization",
    "Data Modeling",
    "Data Preprocessing",
    "Database Management",
    "UX Design",
    "SEO",
    "Presentation and Communication",
  ],

  tools: [
    "Python",
    "SQL",
    "Excel",
    "Tableau",
    "Oracle",
    "Apex",
    "Microsoft Copilot Studio",
    "Power BI",
    "Odoo",
    "Power Automate",
    "PowerPoint",
    "Slack",
    "Teams",
    "Google Colab",
  ],

  certifications: [
    {
      name: "Certifications",
      issuer: "Placeholder",
      year: "Add when ready",
      note: "Included so the structure stays complete until certifications are finalized.",
    },
  ],

  languages: ["English", "Ukrainian", "Russian", "Polish"],

  honors: ["NCAA medalist", "NCAA All-American", "Dean's Scholarship recipient"],

  athletics: {
    profile: "NCAA swimmer with more than 20 years in the sport.",
    highlights: [
      "NCAA swimmer",
      "20+ years in the water",
      "All-American",
      "Long-term coaching background",
    ],
  },

  metrics: {
    professionalExperienceStartYear: 2019,
    analyticsExperienceStartYear: 2023,
    aiExperienceStartYear: 2024,
    swimmingYears: 20,
    coachingYears: "Placeholder - add exact number if needed",
    languagesSpoken: 4,
    educationProgramsListed: 3,
    projectCount: 7,
    stats: [
      { value: "2019", label: "Professional start" },
      { value: "2024", label: "AI systems since" },
      { value: "7", label: "Featured projects" },
      { value: "4", label: "Languages" },
    ],
  },

  ai: {
    heading: "Ask for the details behind the highlights",
    subtext: "The page stays concise on purpose. The assistant can fill in the context.",
    sampleQuestions: [
      "Experience",
      "Projects",
      "Skills",
      "Education",
      "Timeline",
      "UN project",
    ],
    responseStyle:
      "Clear, concise, natural, and grounded only in the provided portfolio information.",
  },

  ux: {
    heading: "UX Prototype Work",
    intro: "",
    body: "Built no-code prototypes to test interaction flow, messaging, and how a user moves through a product story.",
    linkLabel: "View prototypes",
    link: "https://micksems01.wixstudio.com/my-site",
  },
};
