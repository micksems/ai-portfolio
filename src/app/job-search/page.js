"use client";

import { useMemo, useState } from "react";
import { jobSearchData } from "@/data/jobSearchData";

const tabs = ["Overview", "Jobs", "Outreach", "Reports", "Scope"];

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-white/10 bg-white/[0.04] text-white/62",
    good: "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-200",
    warn: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
    blue: "border-sky-400/15 bg-sky-400/[0.08] text-sky-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Metric({ value, label, note }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
      <p className="text-3xl font-semibold tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-2 text-sm font-medium text-white/74">{label}</p>
      {note ? <p className="mt-1 text-xs leading-5 text-white/38">{note}</p> : null}
    </div>
  );
}

function Score({ score }) {
  const tone = score >= 90 ? "text-emerald-300" : score >= 85 ? "text-sky-300" : "text-amber-200";
  return <span className={`text-2xl font-semibold tracking-[-0.04em] ${tone}`}>{score}</span>;
}

function JobCard({ job }) {
  return (
    <article className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 transition hover:border-white/18 hover:bg-white/[0.05] md:p-6">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="blue">{job.status}</Pill>
            <Pill>{job.location}</Pill>
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-white">{job.role}</h3>
          <p className="mt-1 text-sm text-white/48">{job.company}</p>
        </div>
        <div className="text-right">
          <Score score={job.score} />
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/28">match</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">Why it fits</p>
          <p className="mt-2 text-sm leading-6 text-white/66">{job.fit}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">Watch</p>
          <p className="mt-2 text-sm leading-6 text-white/55">{job.risk}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-white/38">{job.contacts} relevant contact{job.contacts === 1 ? "" : "s"}</span>
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-medium text-white/78 transition hover:border-white/24 hover:bg-white/[0.08] hover:text-white"
        >
          Open role ↗
        </a>
      </div>
    </article>
  );
}

export default function JobSearchPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("All");

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return jobSearchData.jobs.filter((job) => {
      const matchesQuery = !normalized || `${job.company} ${job.role} ${job.fit}`.toLowerCase().includes(normalized);
      const matchesLocation = location === "All" || job.location === location;
      return matchesQuery && matchesLocation;
    });
  }, [query, location]);

  const topJobs = [...jobSearchData.jobs].sort((a, b) => b.score - a.score).slice(0, 3);
  const activeJobs = jobSearchData.jobs.filter((job) => job.status !== "Closed");
  const highMatch = jobSearchData.jobs.filter((job) => job.score >= 90).length;
  const newContacts = jobSearchData.outreach.filter((item) => item.status === "New").length;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.11),transparent_54%)]" />

      <div className="relative mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 rounded-[28px] border border-white/10 bg-black/65 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-2xl md:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em] text-white">Career Control Center</p>
              <p className="mt-0.5 text-[11px] text-white/34">Updated {jobSearchData.updatedAt}</p>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="good">Automation active</Pill>
              <Pill>{jobSearchData.nextReport}</Pill>
            </div>
          </div>
        </header>

        <section className="px-1 pb-6 pt-12 md:pt-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/32">Job search command center</p>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-[-0.055em] text-white sm:text-5xl md:text-6xl">
                Find the right role. Keep the pipeline moving.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/48 md:text-base">
                One view for research, fit scoring, applications, outreach, and scheduled reports.
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/[0.025] px-5 py-4 text-sm text-white/54">
              <p>Next written report</p>
              <p className="mt-1 text-lg font-medium text-white">{jobSearchData.nextReport}</p>
              <p className="mt-1 text-xs text-white/32">Then {jobSearchData.recurringReport.toLowerCase()}</p>
            </div>
          </div>
        </section>

        <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition ${
                activeTab === tab
                  ? "border-white/25 bg-white text-black"
                  : "border-white/10 bg-white/[0.03] text-white/54 hover:border-white/20 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Overview" ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric value={activeJobs.length} label="Active jobs" note="Currently tracked" />
              <Metric value={highMatch} label="90+ match" note="Highest-priority roles" />
              <Metric value={newContacts} label="Outreach leads" note="Not contacted yet" />
              <Metric value="9 AM" label="Daily report" note="America/New_York" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
              <section className="rounded-[32px] border border-white/10 bg-white/[0.025] p-5 md:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/28">Priority queue</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Strongest current roles</h2>
                  </div>
                  <button onClick={() => setActiveTab("Jobs")} className="text-xs text-white/44 transition hover:text-white">
                    View all →
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {topJobs.map((job) => (
                    <div key={`${job.company}-${job.role}`} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/25 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{job.role}</p>
                        <p className="mt-1 text-xs text-white/38">{job.company} · {job.location}</p>
                      </div>
                      <Score score={job.score} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/[0.025] p-5 md:p-7">
                <p className="text-xs uppercase tracking-[0.24em] text-white/28">Search scope</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Flexible by design</h2>
                <p className="mt-3 text-sm leading-6 text-white/44">The agent searches by responsibility fit, not exact title match.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {jobSearchData.roleFamilies.map((family) => <Pill key={family}>{family}</Pill>)}
                </div>
                <div className="mt-6 border-t border-white/8 pt-5">
                  <p className="text-xs text-white/30">Locations</p>
                  <p className="mt-2 text-sm leading-6 text-white/66">{jobSearchData.locations.join(" · ")}</p>
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {activeTab === "Jobs" ? (
          <section>
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search company, role, or fit..."
                className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
              />
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="h-12 rounded-2xl border border-white/10 bg-[#0b0b0c] px-4 text-sm text-white/72 outline-none focus:border-white/25"
              >
                <option>All</option>
                {jobSearchData.locations.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredJobs.map((job) => <JobCard key={`${job.company}-${job.role}`} job={job} />)}
            </div>
          </section>
        ) : null}

        {activeTab === "Outreach" ? (
          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.025]">
            <div className="border-b border-white/8 px-5 py-5 md:px-7">
              <p className="text-xs uppercase tracking-[0.24em] text-white/28">Networking queue</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Relevant people, not random scraping</h2>
            </div>
            <div className="divide-y divide-white/8">
              {jobSearchData.outreach.map((item) => (
                <div key={`${item.company}-${item.name}`} className="grid gap-4 px-5 py-5 md:grid-cols-[1.1fr_1.1fr_auto] md:items-center md:px-7">
                  <div>
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-xs text-white/40">{item.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/62">{item.company}</p>
                    <p className="mt-1 text-xs text-white/32">{item.role}</p>
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <Pill tone={item.status === "New" ? "blue" : "neutral"}>{item.status}</Pill>
                    <a href={item.linkedin} target="_blank" rel="noreferrer" className="text-xs text-white/42 transition hover:text-white">LinkedIn ↗</a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "Reports" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {jobSearchData.reports.map((report) => (
              <article key={`${report.date}-${report.time}`} className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-white/32">{report.date} · {report.time}</p>
                    <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{report.title}</h3>
                  </div>
                  <Pill tone={report.status === "Scheduled" ? "warn" : "good"}>{report.status}</Pill>
                </div>
                <p className="mt-5 text-sm leading-6 text-white/48">{report.note}</p>
              </article>
            ))}
          </section>
        ) : null}

        {activeTab === "Scope" ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-white/28">Role families</p>
              <div className="mt-5 space-y-3">
                {jobSearchData.roleFamilies.map((family, index) => (
                  <div key={family} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/25 p-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-xs text-white/36">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-sm text-white/72">{family}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-white/28">Operating rules</p>
              <div className="mt-5 space-y-5 text-sm leading-7 text-white/56">
                <p>Search by actual responsibilities and transferable fit, not exact title matching.</p>
                <p>Reject duplicates, clearly over-senior roles, incompatible locations, explicit incompatible sponsorship language, and mandatory qualification gaps.</p>
                <p>Tailor wording substantially for each application while preserving every verified fact, metric, title, date, tool, and scope.</p>
                <p>Prioritize relevant recruiters, hiring-side leaders, team members, and credible network paths. Never guess emails.</p>
                <p>Dashboard refreshes and written ChatGPT reports are both required outputs of each scheduled run.</p>
              </div>
            </div>
          </section>
        ) : null}

        <footer className="mt-12 border-t border-white/8 px-1 pt-6 text-xs text-white/25">
          Unlisted dashboard · no public navigation link · search indexing disabled
        </footer>
      </div>
    </main>
  );
}
