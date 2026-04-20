"use client";

import emailjs from "@emailjs/browser";
import Image from "next/image";
import { useEffect, useState } from "react";

import { portfolioData } from "@/data/portfolioData";

const sectionClass = "relative mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24";
const cardClass =
  "group flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]";
const actionButtonClass =
  "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-white/15 bg-white/[0.03] px-6 text-sm font-medium text-white transition-all duration-200 hover:border-white/32 hover:bg-white/[0.07]";
const navItems = [
  { label: "About", id: "about" },
  { label: "Projects", id: "projects" },
  { label: "AI", id: "ai" },
  { label: "Contact", id: "contact" },
];

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
      <h2 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-white md:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-sm leading-7 text-white/60 md:text-base">{description}</p> : null}
    </div>
  );
}

function ProjectLinks({ project }) {
  const projectUrl = project.link || "#";
  const codeUrl = project.codeLink || "#";
  const hasProjectUrl = projectUrl !== "#";
  const hasCodeUrl = codeUrl !== "#";
  const duplicateLinks = hasProjectUrl && hasCodeUrl && projectUrl === codeUrl;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/68">
      {!duplicateLinks ? (
        <a
          href={hasProjectUrl ? projectUrl : "#"}
          target="_blank"
          rel="noreferrer"
          className={actionButtonClass}
        >
          See Project
        </a>
      ) : null}

      {hasCodeUrl ? (
        <a
          href={codeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:text-white"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.72-4.04-1.41-4.04-1.41-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.22 1.84 1.22 1.08 1.8 2.82 1.28 3.5.98.11-.76.42-1.28.77-1.58-2.67-.3-5.47-1.31-5.47-5.86 0-1.3.47-2.36 1.23-3.19-.12-.3-.53-1.52.12-3.17 0 0 1.01-.32 3.3 1.22a11.6 11.6 0 0 1 6 0c2.28-1.54 3.29-1.22 3.29-1.22.66 1.65.25 2.87.12 3.17.77.83 1.23 1.89 1.23 3.19 0 4.56-2.8 5.55-5.48 5.85.43.37.81 1.1.81 2.23v3.31c0 .32.21.69.83.58A12 12 0 0 0 12 .5Z" />
          </svg>
          <span>View Code</span>
        </a>
      ) : null}
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
        {project.outcome ? (
          <p className="mt-4 text-sm italic leading-6 text-white/48">{project.outcome}</p>
        ) : null}
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap gap-2.5">
          {project.tools.map((tool) => (
            <span
              key={tool}
              className="inline-flex w-fit items-center rounded-full border border-white/12 bg-black/30 px-3 py-1.5 text-xs text-white/68 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/24 hover:bg-black/40 hover:text-white"
            >
              {tool}
            </span>
          ))}
        </div>

        <ProjectLinks project={project} />
      </div>
    </article>
  );
}

function StatCard({ item, index }) {
  return (
    <div
      key={item.label}
      data-reveal
      style={{ transitionDelay: `${index * 60}ms` }}
      className="flex h-full min-h-[112px] flex-col justify-center rounded-2xl border border-white/8 bg-black/30 px-4 py-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-white/18 hover:bg-black/40"
    >
      <p className="text-3xl font-semibold tracking-[-0.03em] text-white">{item.value}</p>
      <p className="mt-2 text-sm leading-5 text-white/56">{item.label}</p>
    </div>
  );
}

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("about");
  const [profileImageError, setProfileImageError] = useState(false);
  const [heroCycleCount, setHeroCycleCount] = useState(0);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [resumeEmail, setResumeEmail] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [resumeConfirmation, setResumeConfirmation] = useState("");
  const [resumeSending, setResumeSending] = useState(false);

  const { personal, about, contact, projects, metrics, ai, ux } = portfolioData;

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

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    if (!sections.length) return undefined;

    const updateActiveSection = () => {
      const viewportTarget = window.innerHeight * 0.32;
      let currentSection = sections[0].id;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();

        if (rect.top <= viewportTarget && rect.bottom >= viewportTarget) {
          currentSection = section.id;
        }
      });

      setActiveSection(currentSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroCycleCount((count) => count + 1);
    }, 2800);

    return () => window.clearInterval(interval);
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

  function openResumeModal() {
    setResumeModalOpen(true);
    setResumeError("");
    setResumeConfirmation("");
  }

  function closeResumeModal() {
    setResumeModalOpen(false);
    setResumeError("");
    setResumeSending(false);
  }

  async function handleResumeRequest() {
    const email = resumeEmail.trim();

    if (!email || !email.includes("@")) {
      setResumeError("Please enter a valid email.");
      return;
    }

    setResumeSending(true);
    setResumeError("");

    try {
      await emailjs.send(
        "service_wyr9isx",
        "template_7sua9lt",
        { from_email: email },
        "uBpLKSHkhcuEeOxsx"
      );

      setResumeModalOpen(false);
      setResumeEmail("");
      setResumeError("");
      setResumeConfirmation("Request sent! Misha will be in touch.");
    } catch {
      setResumeError("Something went wrong. Please email micksems01@gmail.com directly.");
    } finally {
      setResumeSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(212,175,55,0.14),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.03),_transparent_26%,_transparent_78%,_rgba(255,255,255,0.02))]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <a
            href="#home"
            className="text-sm font-medium tracking-[0.2em] text-white/90 transition-colors duration-200 hover:text-white"
          >
            {personal.name}
          </a>

          <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`rounded-full px-3 py-1.5 transition-all duration-200 ${
                  activeSection === item.id
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section id="home" className={sectionClass}>
        <div className="grid items-end gap-10 lg:grid-cols-[1.28fr_0.72fr]">
          <div className="max-w-3xl text-center lg:text-left" data-reveal>
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">{personal.location}</p>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.01] tracking-[-0.045em] text-white sm:text-6xl md:text-7xl lg:text-[5.15rem]">
              <span className="block">{personal.heroTitle[0]}</span>
              <span className="block">{personal.heroTitle[1]}</span>
              <span className="hero-word-wrap mt-1 block">
                <span className="hero-word hero-word-primary">Numbers</span>
                <span key={heroCycleCount} className="hero-word hero-word-secondary">
                  <span className="hero-word-secondary-text">Solutions</span>
                </span>
              </span>
            </h1>

            <div className="mt-10 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a href="#projects" aria-label="View projects" className={actionButtonClass}>
                View Projects
              </a>
              <a href="#ai" aria-label="Ask the assistant" className={actionButtonClass}>
                Ask Assistant
              </a>
              <a
                href="#resume-request"
                onClick={(event) => {
                  event.preventDefault();
                  openResumeModal();
                }}
                className={actionButtonClass}
              >
                Request Resume
              </a>
            </div>

            {resumeConfirmation ? (
              <p className="mt-4 text-sm text-white/68">{resumeConfirmation}</p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-7 lg:-translate-y-2" data-reveal>
            <div className="grid grid-cols-2 auto-rows-fr gap-3">
              {metrics.stats.map((item, index) => (
                <StatCard key={item.label} item={item} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="about" className={sectionClass}>
        <div className="grid items-center gap-10 lg:grid-cols-[0.62fr_1.38fr]">
          <div className="flex justify-center lg:justify-start" data-reveal>
            {!profileImageError ? (
              <div className="relative h-52 w-52 overflow-hidden rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.04)] md:h-60 md:w-60">
                <Image
                  src={about.image}
                  alt={about.name}
                  fill
                  sizes="(max-width: 768px) 208px, 240px"
                  className="object-cover object-[58%_center]"
                  onError={() => setProfileImageError(true)}
                />
              </div>
            ) : (
              <div className="flex h-52 w-52 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-4xl font-semibold text-white/80 md:h-60 md:w-60">
                MS
              </div>
            )}
          </div>

          <div data-reveal>
            <SectionHeader eyebrow="About" title={about.name} description={about.bio.join(" ")} />
          </div>
        </div>
      </section>

      <section id="projects" className={sectionClass}>
        <SectionHeader
          eyebrow="Projects"
          title="Selected work"
          description="A concise look at projects across analytics, AI, automation, and product thinking."
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
              <a href={ux.link || "#"} target="_blank" rel="noreferrer" className={actionButtonClass}>
                {ux.linkLabel}
              </a>
            </div>
          </article>
        </div>
      </section>

      <section id="ai" className={sectionClass}>
        <SectionHeader eyebrow="AI Assistant" title={ai.heading} description={ai.subtext} align="center" />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <form onSubmit={handleAsk} className="flex flex-col gap-4">
              <label htmlFor="portfolio-question" className="text-sm text-white/56">
                Ask about my work, experience, or the value I could bring to a team.
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
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-all duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Thinking..." : "Ask AI"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuestion("");
                    setAnswer("");
                  }}
                  className={actionButtonClass}
                >
                  Clear
                </button>
              </div>
            </form>

            <div className="mt-8 rounded-3xl border border-white/10 bg-black/35 p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Response</p>
              <div className="mt-4 min-h-[160px] break-words whitespace-pre-wrap text-sm leading-7 text-white/78 md:text-base">
                {answer ? (
                  answer
                ) : (
                  <div className="flex items-center gap-2 italic text-white/46">
                    <span className="h-4 w-px animate-pulse bg-white/45" aria-hidden="true" />
                    <span>Your answer will appear here...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Suggested prompts</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {ai.sampleQuestions.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  data-reveal
                  style={{ transitionDelay: `${index * 60}ms` }}
                  onClick={() => setQuestion(item)}
                  className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-left text-sm leading-6 text-white/72 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/[0.1] hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className={sectionClass}>
        <div data-reveal className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">Contact</p>
          <h2 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-white md:text-4xl">Let&apos;s Work Together</h2>
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-3xl flex-col gap-4 md:flex-row">
          <a
            href={`mailto:${contact.publicEmail}`}
            data-reveal
            className="inline-flex min-h-[56px] flex-1 items-center justify-center rounded-full border border-white/20 bg-transparent px-6 py-4 text-center text-base font-medium text-white transition-all duration-200 hover:border-white hover:bg-white"
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#000000";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#ffffff";
            }}
          >
            Email
          </a>

          <a
            href={contact.linkedin || "#"}
            target="_blank"
            rel="noreferrer"
            data-reveal
            style={{ transitionDelay: "60ms" }}
            className="inline-flex min-h-[56px] flex-1 items-center justify-center rounded-full border border-white/20 bg-transparent px-6 py-4 text-center text-base font-medium text-white transition-all duration-200 hover:border-white hover:bg-white"
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#000000";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#ffffff";
            }}
          >
            LinkedIn
          </a>
        </div>
      </section>

      <footer className="pb-8 pt-4 text-center text-xs text-[#666666]">
        &copy; 2026 Misha Semenov
      </footer>

      {resumeModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0b0c] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Request Misha&apos;s Resume</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Drop your email and Misha will send it over.
                </p>
              </div>

              <button
                type="button"
                onClick={closeResumeModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 pb-[1px] text-xl leading-none text-white/55 transition-colors duration-200 hover:text-white"
                aria-label="Close resume request modal"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <input
                type="email"
                value={resumeEmail}
                onChange={(event) => {
                  setResumeEmail(event.target.value);
                  if (resumeError) setResumeError("");
                }}
                placeholder="Your email address"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition-all duration-200 placeholder:text-white/30 focus:border-white/28"
              />
              {resumeError ? <p className="mt-2 text-sm text-red-300">{resumeError}</p> : null}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleResumeRequest}
                disabled={resumeSending}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-all duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {resumeSending ? "Sending..." : "Send Request"}
              </button>
              <button
                type="button"
                onClick={closeResumeModal}
                className="text-sm text-white/55 transition-colors duration-200 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
