"use client";

import { useEffect, useState } from "react";

import { portfolioData } from "@/data/portfolioData";

const sectionClass = "relative mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24";
const cardClass =
  "group flex h-full min-h-[320px] flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]";

function SectionHeader({ eyebrow, title, description, align = "left" }) {
  const alignment =
    align === "center"
      ? "mx-auto text-center"
      : align === "right"
        ? "ml-auto text-right"
        : "text-left";

  return (
    <div className={`max-w-2xl ${alignment}`} data-reveal>
      {eyebrow ? (
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">{eyebrow}</p>
      ) : null}
      <h2 className="mt-4 text-3xl font-medium leading-tight tracking-[-0.03em] text-white md:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-sm text-white/60 md:text-base">{description}</p> : null}
    </div>
  );
}

function ProjectCard({ project, index }) {
  return (
    <article
      data-reveal
      style={{ transitionDelay: `${index * 60}ms` }}
      className={cardClass}
    >
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">{project.subtitle}</p>
        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">{project.title}</h3>
        <p className="mt-5 text-sm leading-6 text-white/72 md:text-base md:leading-7">{project.description}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {project.tools.map((tool) => (
          <span
            key={tool}
            className="inline-flex w-fit items-center rounded-full border border-white/12 bg-black/30 px-3 py-1.5 text-xs text-white/68"
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
    } catch {
      setAnswer("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(64,123,255,0.12),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.03),_transparent_26%,_transparent_78%,_rgba(255,255,255,0.02))]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <a
            href="#home"
            className="text-sm font-medium tracking-[0.2em] text-white/90 transition-colors duration-200 hover:text-white"
          >
            {personal.name}
          </a>

          <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            {[
              ["Projects", "projects"],
              ["AI", "ai"],
              ["Contact", "contact"],
            ].map(([label, id]) => (
              <a key={id} href={`#${id}`} className="transition-colors duration-200 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section id="home" className={sectionClass}>
        <div className="grid items-end gap-10 lg:grid-cols-[1.28fr_0.72fr]">
          <div className="max-w-3xl text-center lg:text-left" data-reveal>
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">{personal.location}</p>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.93] tracking-[-0.05em] text-white sm:text-6xl md:text-7xl lg:text-[5.15rem]">
              {personal.heroTitle.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="mx-auto mt-6 max-w-[34rem] text-base text-white/68 md:text-lg lg:mx-0">{personal.heroDescription}</p>

            <div className="mt-10 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a
                href="#projects"
                aria-label="View projects"
                className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/32 hover:bg-white/[0.07]"
              >
                View Projects
              </a>
              <a
                href="#ai"
                aria-label="Ask the assistant"
                className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/32 hover:bg-white/[0.07]"
              >
                Ask Assistant
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-7" data-reveal>
            <div className="grid grid-cols-2 auto-rows-fr gap-3">
              {metrics.stats.map((item, index) => (
                <div
                  key={item.label}
                  data-reveal
                  style={{ transitionDelay: `${index * 60}ms` }}
                  className="flex h-full min-h-[106px] flex-col justify-between rounded-2xl border border-white/8 bg-black/30 px-4 py-5 text-center"
                >
                  <p className="text-3xl font-semibold tracking-[-0.03em]">{item.value}</p>
                  <p className="mt-2 text-xs text-white/56 md:text-sm">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="projects" className={sectionClass}>
        <SectionHeader
          eyebrow="Projects"
          title="Selected work"
          description="Analytics and AI projects with measurable outcomes."
          align="center"
        />

        <div className="mt-10 grid auto-rows-fr gap-6 md:mt-12 lg:grid-cols-2">
          {projects.map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index} />
          ))}

          <article
            data-reveal
            style={{ transitionDelay: `${projects.length * 60}ms` }}
            className={cardClass}
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Design</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">{ux.heading}</h3>
              <p className="mt-5 text-sm leading-6 text-white/72 md:text-base md:leading-7">{ux.body}</p>
            </div>

            <div className="mt-6">
              <a
                href={ux.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/32 hover:bg-white/[0.07]"
              >
                {ux.linkLabel}
              </a>
            </div>
          </article>
        </div>
      </section>

      <section id="ai" className={sectionClass}>
        <SectionHeader eyebrow="AI Assistant" title={ai.heading} description={ai.subtext} align="right" />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <form onSubmit={handleAsk} className="flex flex-col gap-4">
              <label htmlFor="portfolio-question" className="text-sm text-white/56">
                Ask for detail. This page stays intentionally minimal.
              </label>

              <textarea
                id="portfolio-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={ai.sampleQuestions[0]}
                className="min-h-[160px] rounded-3xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none transition-all duration-200 placeholder:text-white/30 focus:border-white/28"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-all duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Thinking..." : "Ask AI"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuestion("");
                    setAnswer("");
                  }}
                  className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/32 hover:bg-white/[0.07]"
                >
                  Clear
                </button>
              </div>
            </form>

            <div className="mt-8 rounded-3xl border border-white/10 bg-black/35 p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Response</p>
              <div className="mt-4 min-h-[110px] whitespace-pre-wrap text-sm leading-7 text-white/78 md:text-base">
                {answer || "Assistant response appears here."}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Suggested prompts</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ai.sampleQuestions.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  data-reveal
                  style={{ transitionDelay: `${index * 60}ms` }}
                  onClick={() => setQuestion(item)}
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/24 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className={sectionClass}>
        <SectionHeader eyebrow="Contact" title="Letâ€™s connect" description="Open to analytics and AI roles." align="center" />

        <div className="mx-auto mt-10 grid w-full max-w-3xl gap-5 md:grid-cols-2">
          <a
            href={`mailto:${contact.publicEmail}`}
            data-reveal
            className="group flex min-h-[112px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]"
          >
            <span className="text-base font-medium text-white/78 transition-colors duration-200 group-hover:text-white">Email</span>
          </a>

          <a
            href={contact.linkedin}
            target="_blank"
            rel="noreferrer"
            data-reveal
            style={{ transitionDelay: "60ms" }}
            className="group flex min-h-[112px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]"
          >
            <span className="text-base font-medium text-white/78 transition-colors duration-200 group-hover:text-white">LinkedIn</span>
          </a>
        </div>

        <p className="mt-6 text-center text-xs uppercase tracking-[0.25em] text-white/45">{contact.location}</p>
      </section>
    </main>
  );
}
