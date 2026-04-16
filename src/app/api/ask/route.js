import { NextResponse } from "next/server";

import { portfolioData } from "@/data/portfolioData";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatList(items = []) {
  return safeArray(items).map((item) => `- ${item}`).join("\n");
}

function formatEducation(items = []) {
  return safeArray(items)
    .map((item) => {
      const range = `${item.start}-${item.end}`;
      const detailsList = safeArray(item.details);
      const details = detailsList.length ? ` (${detailsList.join(" ")})` : "";
      return `- ${item.school}, ${item.degree}, ${range}, ${item.location}${details}`;
    })
    .join("\n");
}

function formatExperience(items = []) {
  return safeArray(items)
    .map((item) => {
      const highlightsList = safeArray(item.highlights);
      const toolsList = safeArray(item.tools);
      const highlights = highlightsList.length
        ? ` Highlights: ${highlightsList.join(" ")}`
        : "";

      return [
        `- ${item.company}`,
        `  Role: ${item.role}`,
        `  Dates: ${item.start} to ${item.end}`,
        `  Category: ${item.category}`,
        `  Summary: ${item.summary}`,
        `  Tools: ${toolsList.join(", ")}`,
        highlights ? `  ${highlights.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

function formatProjects(items = []) {
  return safeArray(items)
    .map((item) => {
      const link = item.link ? ` Link: ${item.link}` : "";
      const highlightsList = safeArray(item.highlights);
      const toolsList = safeArray(item.tools);
      const highlights = highlightsList.length
        ? `  Highlights: ${highlightsList.join(" | ")}`
        : null;

      return [
        `- ${item.title}`,
        `  Subtitle: ${item.subtitle}`,
        `  Description: ${item.description}`,
        highlights,
        `  Tools: ${toolsList.join(", ")}${link}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

function buildPortfolioContext() {
  const { personal, contact, summary, education, experience, projects, skills, tools, certifications, languages, honors, athletics, metrics } =
    portfolioData;

  const contactLines = [
    `- Public email: ${contact.publicEmail}`,
    contact.academicEmail ? `- Academic email: ${contact.academicEmail}` : null,
    `- LinkedIn: ${contact.linkedin}`,
    `- Availability: ${contact.availability}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `
PERSONAL
- Name: ${personal.name}
- Full name: ${personal.fullName}
- Location: ${personal.location}
- Headline: ${personal.headline}
- Hero summary: ${personal.heroDescription}

CONTACT
${contactLines}

SUMMARY
- Short summary: ${summary.short}
- Long summary: ${summary.long}
- Focus areas:
${formatList(summary.focusAreas)}

EDUCATION
${formatEducation(education)}

EXPERIENCE
${formatExperience(experience)}

PROJECTS
${formatProjects(projects)}

SKILLS
${formatList(skills)}

TOOLS
${formatList(tools)}

CERTIFICATIONS
${certifications
  .map(
    (item) =>
      `- ${item.name}: issuer ${item.issuer}, year ${item.year}. ${item.note}`
  )
  .join("\n")}

LANGUAGES
${formatList(languages)}

HONORS
${formatList(honors)}

ATHLETICS
- Profile: ${athletics.profile}
- Highlights:
${formatList(athletics.highlights)}

METRICS
- professionalExperienceStartYear: ${metrics.professionalExperienceStartYear}
- analyticsExperienceStartYear: ${metrics.analyticsExperienceStartYear}
- aiExperienceStartYear: ${metrics.aiExperienceStartYear}
- swimmingYears: ${metrics.swimmingYears}
- coachingYears: ${metrics.coachingYears}
- languagesSpoken: ${metrics.languagesSpoken}
- educationProgramsListed: ${metrics.educationProgramsListed}
- projectCount: ${metrics.projectCount}
`.trim();
}

function buildPrompt(question) {
  const context = buildPortfolioContext();

  return `
You are the AI assistant for Misha Semenov's portfolio website.

Your job:
- Answer naturally, clearly, and professionally.
- Use only the portfolio information provided below.
- Do not invent hard facts, credentials, employers, dates, or metrics that are not supported by the portfolio.
- You may make grounded, clearly implied judgments when the user asks evaluative questions such as:
  - why Misha is a strong candidate
  - whether he could contribute quickly
  - what his strengths are
  - how he communicates findings
- For those evaluative questions, synthesize from the evidence in the portfolio instead of refusing automatically.
- If the portfolio truly does not contain enough evidence, say so plainly.
- When dates or metric fields are available, use them to answer timeline and duration questions.
- Distinguish carefully between:
  - overall professional experience
  - analytics experience
  - AI experience
  - swimming background
  - coaching background
- If a metric is a placeholder, acknowledge that it is not finalized.
- Prefer concise answers, but give helpful context when the question asks for it.
- When answering employer-style questions, connect the answer to the available evidence from projects, education, tools, and experience.
- When appropriate, write in 2 short paragraphs or 3 concise bullets.

Reasoning rules for date questions:
- Overall professional experience should use professionalExperienceStartYear when relevant.
- Analytics experience should use analyticsExperienceStartYear when relevant.
- AI experience should use aiExperienceStartYear when relevant.
- Swimming background should use swimmingYears.
- Coaching background should only use coachingYears, and if it is a placeholder, say the exact number is not specified.
- Use explicit dates from experience entries when the user asks about a specific role or timeline.

Examples of grounded synthesis that are allowed:
- "Misha could contribute quickly because he has already worked across AI automation, reporting, and analytics projects."
- "His communication appears strong because several roles involved stakeholder reporting, program coordination, and translating analysis for non-technical users."

Examples that are not allowed:
- claiming a certification not listed
- claiming years of experience beyond the provided dates and metrics
- claiming technologies or job titles not present in the portfolio

Portfolio information:
${context}

User question:
${question}
`.trim();
}

export async function POST(request) {
  try {
    const { question } = await request.json();

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: "No question provided." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in .env.local." },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(question.trim());

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topP: 0.8,
            topK: 20,
            maxOutputTokens: 700,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return NextResponse.json(
        { error: data?.error?.message || "Gemini request failed." },
        { status: response.status }
      );
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No response generated.";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Server error:", error);

    return NextResponse.json(
      { error: error.message || "Server error." },
      { status: 500 }
    );
  }
}
