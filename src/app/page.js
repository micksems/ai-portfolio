"use client";

import { useEffect, useState } from "react";

import { portfolioData } from "@/data/portfolioData";

function SectionHeader({ eyebrow, title, description, align = "left" }) {
  const alignment =
    align === "center"
      ? "mx-auto text-center"
      : align === "right"
        ? "ml-auto text-right"
        : "text-left";

  return (
    <div className={`max-w-3xl ${alignment}`} data-reveal>
      <p className="text-xs uppercase tracking-[0.35em] text-white/40">{eyebrow}</p>
      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-[44ch] text-sm leading-7 text-white/60 md:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function ProjectCard({ project, index }) {
  return (
    <article
      data-reveal
      style={{ transitionDelay: `${index * 70}ms` }}
      className="group flex h-full min-h-[290px] flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
    >
      <div className="flex flex-col">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">{project.subtitle}</p>
        <h3 className="mt-3 max-w-[18ch] text-xl font-semibold tracking-[-0.03em] text-white md:text-2xl">
          {project.title}
        </h3>
        <p className="mt-4 max-w-[42ch] text-sm leading-7 text-white/68">
          {project.description}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {project.tools.map((tool) => (
          <span
            key={tool}
            className="inline-flex w-fit items-center rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/66 transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:border-white/22 hover:bg-black/40"
          >
            {tool}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const { personal, contact, projects, metrics, ai, ux } = portfolioData;
  const sectionClass = "relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20";
  useEffect(() => {
    const elements = document.querySelectorAll("[data-reveal]");

    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  async function handleAsk(event) {
    event.preventDefault();

    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAnswer(data.error || "Something went wrong.");
      } else {
        setAnswer(data.answer || "No response generated.");
      }
    } catch (error) {
      setAnswer("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(64,123,255,0.14),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.05),_transparent_22%,_transparent_78%,_rgba(255,255,255,0.03))]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <a
            href="#home"
            className="text-sm font-medium tracking-[0.2em] text-white/90 transition-colors duration-200 ease-in-out hover:text-white"
          >
            {personal.name}
          </a>

          <nav className="hidden items-center gap-6 text-sm text-white/62 md:flex">
            {[
              ["Projects", "projects"],
              ["AI", "ai"],
              ["Contact", "contact"],
            ].map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="transition-colors duration-200 ease-in-out hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section id="home" className={sectionClass}>
        <div className="grid gap-12 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
          <div className="max-w-4xl text-center lg:text-left" data-reveal>
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">
              {personal.location}
            </p>

            <h1 className="mt-6 text-5xl font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              {personal.heroTitle.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>

            <p className="mx-auto mt-6 max-w-[30rem] text-base leading-7 text-white/66 md:text-lg lg:mx-0">
              {personal.heroDescription}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a
                href="#projects"
                aria-label="View projects"
                className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:border-white/35 hover:bg-white/[0.06]"
              >
                View Projects
              </a>
              <a
                href="#ai"
                aria-label="Ask the assistant"
                className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:border-white/35 hover:bg-white/[0.06]"
              >
                Ask the Assistant
              </a>
            </div>
          </div>

          <div
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
            data-reveal
          >
            <div className="grid grid-cols-2 gap-4 lg:gap-5">
              {metrics.stats.map((item, index) => (
                <div
                  key={item.label}
                  data-reveal
                  style={{ transitionDelay: `${index * 70}ms` }}
                  className="flex min-h-[108px] flex-col justify-between rounded-2xl border border-white/8 bg-black/30 px-4 py-5 text-center"
                >
                  <p className="text-3xl font-semibold tracking-[-0.04em]">{item.value}</p>
                  <p className="mt-2 text-sm text-white/58">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="projects" className={sectionClass}>
        <SectionHeader
          eyebrow="Projects"
          title="Selected work."
          description="Analytics, AI, and automation projects."
          align="center"
        />

        <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-2">
          {projects.map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index} />
          ))}

          <article
            data-reveal
            style={{ transitionDelay: `${projects.length * 70}ms` }}
            className="group flex h-full min-h-[290px] flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
          >
            <div className="flex flex-col">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">UX</p>
              <h3 className="mt-3 max-w-[18ch] text-xl font-semibold tracking-[-0.03em] text-white md:text-2xl">
                {ux.heading}
              </h3>
              <p className="mt-4 max-w-[42ch] text-sm leading-7 text-white/68">{ux.body}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={ux.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.06]"
              >
                {ux.linkLabel}
              </a>
            </div>
          </article>
        </div>
      </section>

      <section id="ai" className={sectionClass}>
        <SectionHeader
          eyebrow="AI Assistant"
          title={ai.heading}
          description={ai.subtext}
          align="right"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <form onSubmit={handleAsk} className="flex flex-col gap-4">
              <label htmlFor="portfolio-question" className="text-sm text-white/58">
                Ask about experience, projects, skills, education, timeline, or tools.
              </label>

              <textarea
                id="portfolio-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={ai.sampleQuestions[0]}
                className="min-h-[170px] rounded-[1.5rem] border border-white/10 bg-black/40 px-5 py-4 text-white outline-none transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out placeholder:text-white/28 focus:border-white/28"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Thinking..." : "Ask AI"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuestion("");
                    setAnswer("");
                  }}
                  className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:border-white/35 hover:bg-white/[0.06]"
                >
                  Clear
                </button>
              </div>
            </form>

            <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/35 p-5 md:p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/38">Response</p>
              <div className="mt-4 min-h-[120px] whitespace-pre-wrap text-base leading-7 text-white/78">
                {answer || "The portfolio assistant response will appear here."}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 md:p-8">
            <div className="mt-4 flex flex-wrap gap-3">
              {ai.sampleQuestions.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  data-reveal
                  style={{ transitionDelay: `${index * 70}ms` }}
                  onClick={() => setQuestion(item)}
                  className="inline-flex w-fit items-center rounded-full border border-white/10 bg-black/25 px-4 py-3 text-left text-sm leading-6 text-white/70 transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:-translate-y-0.5 hover:border-white/24 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 md:px-8 md:pb-24 md:pt-20"
      >
        <p className="mb-8 text-center text-xs uppercase tracking-[0.35em] text-white/40">Contact</p>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          <a
            href={`mailto:${contact.publicEmail}`}
            data-reveal
            className="group flex min-h-[104px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-center transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-white/76 transition-colors duration-200 ease-in-out group-hover:text-white">
              Email
            </p>
          </a>

          <a
            href={contact.linkedin}
            target="_blank"
            rel="noreferrer"
            data-reveal
            style={{ transitionDelay: "70ms" }}
            className="group flex min-h-[104px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-center transition-[color,background-color,border-color,opacity,transform] duration-200 ease-in-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-white/76 transition-colors duration-200 ease-in-out group-hover:text-white">
              LinkedIn
            </p>
          </a>
        </div>

        <p className="mt-6 text-center text-xs uppercase tracking-[0.2em] text-white/45">
          {contact.location}
        </p>
      </section>
    </main>
  );
}
