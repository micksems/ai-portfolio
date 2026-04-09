export const portfolioData = {
  personal: {
    name: "Misha Semenov",
    fullName: "Mykhailo 'Misha' Semenov",
    firstName: "Misha",
    location: "New York, NY",
    headline: "Business analytics. AI systems. Built to work.",
    heroTitle: ["Business analytics.", "AI systems.", "Built to work."],
    heroDescription:
      "I'm Misha Semenov — a graduate student, NCAA swimmer, and practitioner who builds analytics and AI tools that hold up in real environments. Based in New York.",
    professionalSummary: [
      "I'm a Business Analytics graduate student at Fordham University's Gabelli School of Business, where I focus on AI systems, reporting, and applied decision-making. Before that, I completed my undergraduate degree at Lewis University while competing as a Division I NCAA swimmer.",
      "My work sits at the intersection of data and execution. That means clean automation, readable dashboards, and AI workflows with a clear purpose.",
      "I've worked across CRM, marketing analytics, agentic AI, and business intelligence. The thread is simple: make the output useful for the person receiving it.",
    ],
    athleticsNote:
      "I've competed in swimming for over twenty years — NCAA medalist, All-American, and Dean's Scholarship recipient. It shapes how I approach work: with consistency, not bursts.",
  },

  contact: {
    publicEmail: "micksems01@gmail.com",
    linkedin: "https://www.linkedin.com/in/mykhailo-semenov/",
    location: "New York, NY",
    availability:
      "I'm open to conversations around analytics, AI work, and automation. If something I've built is relevant to what you're working on, reach out.",
  },

  summary: {
    short:
      "Analytical by training. Practical by preference.",
    long:
      "I'm a Business Analytics graduate student at Fordham University's Gabelli School of Business, where I focus on AI systems, reporting, and applied decision-making. Before that, I completed my undergraduate degree at Lewis University while competing as a Division I NCAA swimmer.",
    secondary:
      "My work sits at the intersection of data and execution — building tools that are meant to be used, not just demonstrated. That means clean automation, readable dashboards, and AI workflows with a clear purpose.",
    tertiary:
      "I've worked across CRM, marketing analytics, agentic AI, and business intelligence. The thread connecting all of it is the same: make the output useful for the person receiving it.",
    focusAreas: [
      "Agentic AI",
      "Workflow Automation",
      "Business Analytics",
      "Data Visualization",
      "CRM & Marketing Analytics",
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
        "Working on internal AI initiatives using Microsoft Copilot Studio. Designed assistant experiences for administrative and analytical workflows, with a focus on practical use cases over novelty.",
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
        "Managed program coordination and stakeholder communication for a university-facing initiative. Kept things organized and moving.",
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
        "Analyzed operational data and contributed to AI-supported reporting workflows. Work was seasonal and remote, output was structured.",
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
        "Supported performance reporting and behavioral analysis for marketing decisions. Worked in Excel, Tableau, and SEO tooling.",
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
        "Early career role in sales management and client operations in Ukraine. Where professional discipline started.",
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
        "Built a portfolio assistant powered by Gemini that answers questions about my background using structured data instead of generic prompting. The focus was on accuracy and usability, not the AI wrapper.",
      highlights: [
        "Structured context instead of loose prompt stuffing.",
        "Readable output grounded in the portfolio itself.",
      ],
      tools: ["Next.js", "Gemini API", "Tailwind CSS", "JavaScript"],
      image: null,
      link: null,
    },
    {
      title: "UN Internal Copilot Agent Project",
      subtitle: "Microsoft Copilot Studio in a real environment",
      description:
        "Contributed to internal AI workflow tooling at the United Nations using Microsoft Copilot Studio. Real-environment constraints made this different from academic project work.",
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
        "Built a classification model for March Madness bracket prediction. I spent more time on data preparation and interpreting output than on the model architecture itself — which is usually where the actual work is.",
      highlights: [
        "Data preparation did the heavy lifting.",
        "Model output translated into something usable.",
      ],
      tools: ["Python", "SQL", "Machine Learning", "Data Preprocessing"],
      image: null,
      link: null,
    },
    {
      title: "Data Analytics in Excel",
      subtitle: "Reporting that reads cleanly",
      description:
        "Structured reporting workflows in Excel designed to surface trends and support decisions. Focused on outputs that are presentation-ready without needing explanation.",
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
        "Applied ML to business scenarios with an emphasis on translating model results into something a non-technical audience can act on.",
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
        "Turned raw datasets into dashboards that tell a story. Visual clarity was the constraint, not adding more charts.",
      highlights: [
        "Dashboards built for readability.",
        "Story first, clutter cut out.",
      ],
      tools: ["Tableau", "Data Visualization", "Business Analytics"],
      image: null,
      link: null,
    },
    {
      title: "Python Fitness Tracker",
      subtitle: "Small scope, clear structure",
      description:
        "Built a small Python project around data flow and user-facing structure. Practical scope, intentional design.",
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
      "I've competed in swimming for over twenty years — NCAA medalist, All-American, and Dean's Scholarship recipient. It shapes how I approach work: with consistency, not bursts.",
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
    heading: "Ask about the work.",
    subtext:
      "This assistant is grounded in structured portfolio data, not generic prompts. It can answer questions about my experience, projects, tools, education, and timeline with reasonable accuracy.",
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
    heading: "UX work.",
    intro:
      "I started using automated no-code tools when AI was just starting to rise, because it felt more efficient than trying to code everything myself.",
    body:
      "These are raw demos I built for businesses or for fun during the period when I was more focused on UX design.",
    linkLabel: "View UX demos",
    link: "https://micksems01.wixstudio.com/my-site",
  },
};
