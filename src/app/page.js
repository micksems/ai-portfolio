"use client";

import { useEffect, useState } from "react";

import { portfolioData } from "@/data/portfolioData";

const sectionClass = "relative mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24";
const surfaceClass =
  "rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm";

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
        <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--muted-strong)]">{eyebrow}</p>
      ) : null}
      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-white md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-sm leading-7 text-[var(--muted)] md:text-base">{description}</p>
      ) : null}
    </div>
  );
}

function ProjectCard({ project, index }) {
  return (
    <article
      data-reveal
      style={{ transitionDelay: `${index * 70}ms` }}
      className={`${surfaceClass} group flex h-full flex-col justify-between p-6 md:p-8`}
    >
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">{project.subtitle}</p>
        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">{project.title}</h3>
        <p className="mt-5 text-sm leading-7 text-[var(--muted)] md:text-base">{project.description}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2.5">
        {project.tools.map((tool) => (
          <span
            key={tool}
            className="inline-flex w-fit items-center rounded-full border border-white/12 bg-black/25 px-3 py-1.5 text-xs text-[var(--muted)]"
          >
            {tool}
          </span>
        ))}
      </div>
    </article>
  );
}

function ExperienceCard({ item, index }) {
  return (
    <article
      data-reveal
      style={{ transitionDelay: `${index * 80}ms` }}
      className={`${surfaceClass} p-6 md:p-7`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">{item.category}</p>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">{item.role}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {item.company}
            {item.location ? ` • ${item.location}` : ""}
          </p>
        </div>

        <p className="rounded-full border border-white/12 bg-black/20 px-3 py-1.5 text-xs text-[var(--muted)]">
          {item.start} - {item.end}
        </p>
      </div>

      <p className="mt-5 text-sm leading-7 text-[var(--muted)] md:text-base">{item.summary}</p>

      <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--muted)]">
        {item.highlights.map((highlight) => (
          <li key={highlight} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    personal,
    contact,
    summary,
    experience,
    projects,
    metrics,
    ai,
    ux,
    skills,
    tools,
    athletics,
  } = portfolioData;

  const featuredExperience = experience.slice(0, 3);
  const featuredSkills = skills.slice(0, 6);
  const featuredTools = tools.slice(0, 8);

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
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,214,170,0.14),transparent_22%),radial-gradient(circle_at_78%_12%,rgba(91,141,239,0.22),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(8,10,18,0.74)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <a
            href="#home"
            className="text-sm font-semibold tracking-[0.22em] text-white/90 transition-colors duration-200 hover:text-white"
          >
            {personal.name}
          </a>

          <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
            {[
              ["Work", "projects"],
              ["Experience", "experience"],
              ["Assistant", "ai"],
              ["Contact", "contact"],
            ].map(([label, id]) => (
              <a key={id} href={`#${id}`} className="transition-colors duration-200 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section id="home" className={`${sectionClass} pt-12 md:pt-16`}>
        <div className="grid items-start gap-8 lg:grid-cols-[1.18fr_0.82fr]">
          <div data-reveal className={`${surfaceClass} p-8 md:p-10 lg:p-12`}>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
              <span className="rounded-full border border-white/12 bg-black/20 px-4 py-2">{personal.location}</span>
              <span className="rounded-full border border-[rgba(255,214,170,0.25)] bg-[rgba(255,214,170,0.09)] px-4 py-2 text-[var(--accent-soft)]">
                {personal.headline}
              </span>
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[0.9] tracking-[-0.06em] text-white sm:text-6xl lg:text-[5.4rem]">
              {personal.heroTitle.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
              {personal.heroDescription}
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <p className="text-sm leading-7 text-[var(--muted)]">{summary.long}</p>
              <p className="text-sm leading-7 text-[var(--muted)]">{summary.secondary}</p>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="#projects"
                className="rounded-full bg-white px-6 py-3 text-sm font-medium text-[#0b1020] transition-transform duration-200 hover:-translate-y-0.5"
              >
                See selected work
              </a>
              <a
                href="#contact"
                className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/30 hover:bg-white/[0.08]"
              >
                Get in touch
              </a>
            </div>
          </div>

          <div className="grid gap-6">
            <div data-reveal className={`${surfaceClass} p-6 md:p-7`}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">Snapshot</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {metrics.stats.map((item, index) => (
                  <div
                    key={item.label}
                    data-reveal
                    style={{ transitionDelay: `${index * 70}ms` }}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5"
                  >
                    <p className="text-3xl font-semibold tracking-[-0.04em] text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div data-reveal className={`${surfaceClass} p-6 md:p-7`}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">What I focus on</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {summary.focusAreas.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--muted)]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <p className="mt-6 text-sm leading-7 text-[var(--muted)]">{athletics.profile}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div data-reveal className={`${surfaceClass} p-7 md:p-8`}>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">How I work</p>
            <p className="mt-5 text-lg leading-8 text-white md:text-[1.35rem]">{summary.short}</p>
            <p className="mt-5 text-sm leading-7 text-[var(--muted)] md:text-base">{summary.tertiary}</p>
          </div>

          <div data-reveal className={`${surfaceClass} p-7 md:p-8`}>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">Tools I use often</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {featuredTools.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--muted)]"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="projects" className={sectionClass}>
        <SectionHeader
          eyebrow="Selected Work"
          title="Projects built to be useful, not just technically interesting"
          description="A mix of analytics, automation, and AI work shaped around business decisions and clearer communication."
          align="center"
        />

        <div className="mt-10 grid auto-rows-fr gap-6 lg:grid-cols-2">
          {projects.slice(0, 6).map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index} />
          ))}

          <article
            data-reveal
            style={{ transitionDelay: `${projects.length * 70}ms` }}
            className={`${surfaceClass} flex h-full flex-col justify-between p-6 md:p-8`}
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">UX and product thinking</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">{ux.heading}</h3>
              <p className="mt-5 text-sm leading-7 text-[var(--muted)] md:text-base">{ux.body}</p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {featuredSkills.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--muted)]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8">
              <a
                href={ux.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/30 hover:bg-white/[0.08]"
              >
                {ux.linkLabel}
              </a>
            </div>
          </article>
        </div>
      </section>

      <section id="experience" className={sectionClass}>
        <SectionHeader
          eyebrow="Experience"
          title="Recent roles where analytics met operations"
          description="The common thread across these roles is turning moving pieces into something clearer, faster, and more actionable."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {featuredExperience.map((item, index) => (
            <ExperienceCard key={`${item.company}-${item.role}`} item={item} index={index} />
          ))}
        </div>
      </section>

      <section id="ai" className={sectionClass}>
        <SectionHeader
          eyebrow="Assistant"
          title={ai.heading}
          description={ai.subtext}
          align="right"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div data-reveal className={`${surfaceClass} p-6 md:p-8`}>
            <form onSubmit={handleAsk} className="flex flex-col gap-4">
              <label htmlFor="portfolio-question" className="text-sm text-[var(--muted)]">
                Ask about projects, background, tools, or how different experiences connect.
              </label>

              <textarea
                id="portfolio-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={ai.sampleQuestions[0]}
                className="min-h-[180px] rounded-[24px] border border-white/10 bg-black/30 px-5 py-4 text-white outline-none transition-all duration-200 placeholder:text-white/28 focus:border-white/28 focus:bg-black/40"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[#171a20] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Thinking..." : "Ask the assistant"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuestion("");
                    setAnswer("");
                  }}
                  className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/30 hover:bg-white/[0.08]"
                >
                  Clear
                </button>
              </div>
            </form>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-black/28 p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">Response</p>
              <div className="mt-4 min-h-[110px] whitespace-pre-wrap text-sm leading-7 text-[var(--muted)] md:text-base">
                {answer || "Assistant replies will appear here."}
              </div>
            </div>
          </div>

          <div data-reveal className={`${surfaceClass} p-6 md:p-8`}>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">Try these prompts</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Short prompts work fine, but the assistant handles more specific questions well too.
            </p>

            <div className="mt-6 grid gap-3">
              {ai.sampleQuestions.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  data-reveal
                  style={{ transitionDelay: `${index * 70}ms` }}
                  onClick={() => setQuestion(item)}
                  className="flex w-full items-center justify-between rounded-[20px] border border-white/10 bg-black/20 px-4 py-4 text-left text-sm text-[var(--muted)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/24 hover:text-white"
                >
                  <span>{item}</span>
                  <span className="text-white/30">Fill</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className={sectionClass}>
        <div data-reveal className={`${surfaceClass} mx-auto max-w-4xl p-8 md:p-10`}>
          <SectionHeader
            eyebrow="Contact"
            title="Let's connect"
            description="I’m open to conversations around analytics, AI, automation, and roles where clear thinking matters as much as technical execution."
            align="center"
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <a
              href={`mailto:${contact.publicEmail}`}
              className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-white/24"
            >
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">Email</p>
              <p className="mt-4 text-base font-medium text-white">{contact.publicEmail}</p>
            </a>

            <a
              href={contact.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-white/24"
            >
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted-strong)]">LinkedIn</p>
              <p className="mt-4 text-base font-medium text-white">View profile</p>
            </a>
          </div>

          <p className="mt-8 text-center text-sm text-[var(--muted)]">{contact.location}</p>
        </div>
      </section>
    </main>
  );
}
