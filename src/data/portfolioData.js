export const portfolioData = {
  personal: {
    name: "Misha Semenov",
    fullName: "Mykhailo 'Misha' Semenov",
    firstName: "Misha",
    location: "New York, NY",
    headline: "Business analytics. AI systems. Built to work.",
    heroTitle: ["Business analytics.", "AI systems.", "Built to work."],
    heroDescription:
      "I'm Misha Semenov, a graduate student in New York. I build analytics and AI tools, and I care whether they hold up once someone actually uses them.",
    professionalSummary: [
      "I'm a Business Analytics graduate student at Fordham University's Gabelli School of Business. Before that, I finished my undergraduate degree at Lewis University while competing as a Division I swimmer.",
      "Most of my work is practical. Internal AI tools. Reporting that reads cleanly. Automation that does its job and gets out of the way.",
      "I've worked in CRM, marketing analytics, agentic AI, and business intelligence. What matters to me is whether the result is useful on a real day of work.",
    ],
    athleticsNote:
      "I've spent more than twenty years in the pool. NCAA medalist. All-American. That background taught me to trust repetition and standards, not mood.",
  },

  contact: {
    publicEmail: "micksems01@gmail.com",
    linkedin: "https://www.linkedin.com/in/mykhailo-semenov/",
    location: "New York, NY",
    availability:
      "If something here lines up with what you're building, feel free to reach out.",
  },

  summary: {
    short: "Sharp with details. Better when the work is real.",
    long:
      "I'm at Fordham now, studying Business Analytics with a focus on AI systems, reporting, and applied decision-making. Before that, I was at Lewis University, finishing my undergraduate degree and training full-time as a Division I swimmer.",
    secondary:
      "I like work that has a clear use case. A dashboard someone can read quickly. An automation that saves time. An assistant that answers without wandering.",
    tertiary:
      "The roles have been different, but the standard stays the same. Keep it useful. Keep it clean. Make it hold up.",
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
      details: [
        "Graduate work centered on AI systems, reporting, and applied decision-making.",
      ],
    },
    {
      school: "Lewis University",
      degree: "BS in Business Administration",
      location: "Romeoville, IL",
      start: "2021",
      end: "2025",
      current: false,
      details: [
        "Completed undergraduate study while competing as a Division I NCAA swimmer.",
      ],
    },
    {
      school: "Emmanuel University",
      degree: "BS studies in Business Administration",
      location: "Franklin Springs, GA",
      start: "2021",
      end: "2023",
      current: false,
      details: [
        "Early business administration studies before continuing the academic path at Lewis University.",
      ],
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
      summary:
        "Working on internal AI initiatives with Microsoft Copilot Studio. The work is less about demos and more about whether the tool earns its place.",
      highlights: [
        "Internal AI workflow tooling in a real operating environment.",
        "Assistant experiences for administrative and analytical use cases.",
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
      summary:
        "Managed program coordination and stakeholder communication for a university-facing initiative. A lot of the value came from keeping moving parts under control.",
      highlights: [
        "Program coordination across stakeholders.",
        "Execution built on consistency and communication.",
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
      summary:
        "Analyzed operational data and helped shape AI-supported reporting workflows. Seasonal work, but the output still had to be tight.",
      highlights: [
        "Operational analysis tied to reporting output.",
        "Seasonal work with clear deliverables and clean structure.",
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
      summary:
        "Supported performance reporting and behavioral analysis tied to marketing decisions. Most of the work lived in Excel, Tableau, and SEO tools.",
      highlights: [
        "Performance reporting tied to decision-making.",
        "Behavioral analysis across marketing data.",
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
      summary:
        "An early role in sales management and client operations in Ukraine. That's where professional discipline started for me.",
      highlights: [
        "Client operations and sales management.",
        "Foundation for pace, discipline, and accountability.",
      ],
      tools: ["Sales Operations", "Client Communication"],
    },
  ],

  projects: [
    {
      title: "AI Portfolio Assistant",
      subtitle: "Structured prompt design with Gemini",
      description:
        "I built this so the assistant could answer from structure, not fluff. The hard part was getting the context and wording right, not wiring up a chat box.",
      highlights: [
        "Structured context instead of loose prompt stuffing.",
        "Answers stay tied to the portfolio.",
      ],
      tools: ["Next.js", "Gemini API", "Tailwind CSS", "JavaScript"],
      image: null,
      link: null,
    },
    {
      title: "UN Internal Copilot Agent Project",
      subtitle: "Microsoft Copilot Studio in a real environment",
      description:
        "This work happened in a real internal environment, which changes everything. Constraints are stricter. The standard is higher. The tool has to make sense for the people using it.",
      highlights: [
        "Internal constraints shaped the build.",
        "Practical AI over novelty features.",
      ],
      tools: ["Microsoft Copilot Studio", "Power Automate", "Teams"],
      image: null,
      link: null,
    },
    {
      title: "March Madness Prediction Model",
      subtitle: "Classification and interpretation",
      description:
        "Built a classification model for March Madness bracket prediction. Most of the real work was in prep, cleanup, and making the output worth reading.",
      highlights: [
        "Data preparation did the heavy lifting.",
        "Output had to be interpretable.",
      ],
      tools: ["Python", "SQL", "Machine Learning", "Data Preprocessing"],
      image: null,
      link: null,
    },
    {
      title: "Data Analytics in Excel",
      subtitle: "Reporting that reads cleanly",
      description:
        "Built Excel reporting workflows that surface trends fast. The goal was simple: someone should be able to open the file and know what matters.",
      highlights: [
        "Structured reporting built for decision support.",
        "Presentation-ready outputs without extra framing.",
      ],
      tools: ["Excel", "Data Modeling", "PowerPoint"],
      image: null,
      link: null,
    },
    {
      title: "Machine Learning for Business",
      subtitle: "Business-facing model interpretation",
      description:
        "Applied machine learning in business settings where the model alone was never enough. The output had to make sense to someone who didn't build it.",
      highlights: [
        "Business context stayed in front of the model.",
        "Interpretation mattered as much as prediction.",
      ],
      tools: ["Python", "Google Colab", "Data Preprocessing"],
      image: null,
      link: null,
    },
    {
      title: "Tableau Data Visualization",
      subtitle: "Dashboards with restraint",
      description:
        "Turned raw datasets into dashboards that could say something quickly. I cared more about restraint than chart count.",
      highlights: [
        "Dashboards built for readability.",
        "Clutter got cut early.",
      ],
      tools: ["Tableau", "Data Visualization", "Business Analytics"],
      image: null,
      link: null,
    },
    {
      title: "Python Fitness Tracker",
      subtitle: "Small scope, clear structure",
      description:
        "A smaller Python build, but a useful one for thinking through flow, state, and user-facing structure without hiding behind scale.",
      highlights: [
        "Simple structure that still feels deliberate.",
        "Data flow and user logic handled cleanly.",
      ],
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
      note:
        "Included so the site structure stays complete. Add exact certifications when you're ready.",
    },
  ],

  languages: ["English", "Ukrainian", "Russian", "Polish"],

  honors: [
    "NCAA medalist",
    "NCAA All-American",
    "Dean's Scholarship recipient",
  ],

  athletics: {
    profile:
      "I've competed in swimming for over twenty years. NCAA medalist. All-American. It shaped how I work long before I had a resume.",
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
      { value: "20+", label: "Years in the water" },
      { value: "7", label: "Featured projects" },
      { value: "4", label: "Languages" },
    ],
  },

  ai: {
    heading: "Ask about the work",
    subtext:
      "This assistant is fed from structured portfolio data, so it can answer specific questions without sounding generic.",
    sampleQuestions: [
      "What AI work has Misha done at the UN?",
      "What tools does Misha work with day to day?",
      "What is his analytics background?",
      "Where has he studied?",
    ],
    responseStyle:
      "Clear, concise, natural, and grounded only in the provided portfolio information.",
  },

  ux: {
    heading: "Earlier UX work",
    intro:
      "Before I leaned this hard into analytics and AI, I spent time building with no-code tools because they let me move faster.",
    body:
      "These are early demos, some built for businesses, some just for fun. Raw, but still part of the path.",
    linkLabel: "View UX demos",
    link: "https://micksems01.wixstudio.com/my-site",
  },
};
