"use client";

import { useMemo, useState } from "react";

const tabs = ["Overview", "Jobs"];

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

function Metric({ value, label }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
      <p className="text-3xl font-semibold tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-2 text-xs text-white/42">{label}</p>
    </div>
  );
}

function Score({ score }) {
  const tone = score >= 90 ? "text-emerald-300" : score >= 80 ? "text-sky-300" : "text-amber-200";
  return <span className={`text-2xl font-semibold tracking-[-0.04em] ${tone}`}>{score}</span>;
}

function freshnessTone(freshness) {
  if (freshness === "≤24h") return "good";
  if (freshness === "1–3d") return "blue";
  if (freshness === "3–7d") return "neutral";
  if (freshness) return "warn";
  return "neutral";
}

function JobCard({ job }) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 transition hover:border-white/18 hover:bg-white/[0.05]">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={job.status === "Ready to Submit" ? "good" : "blue"}>{job.status}</Pill>
            <Pill>{job.location}</Pill>
            {job.freshness ? <Pill tone={freshnessTone(job.freshness)}>{job.freshness}</Pill> : null}
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-white">{job.role}</h3>
          <p className="mt-1 text-sm text-white/44">{job.company}</p>
        </div>
        <div className="text-right">
          <Score score={job.score} />
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/25">match</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-end">
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

export default function DashboardClient({ jobSearchData }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [query, setQuery] = useState("");

  const activeJobs = jobSearchData.jobs.filter((job) => job.status !== "Closed");
  const readyJobs = activeJobs.filter((job) => job.status === "Ready to Submit");
  const appliedPlus = activeJobs.filter((job) => ["Applied", "Interview", "Offer"].includes(job.status));
  const freshJobs = activeJobs.filter((job) => job.freshness === "≤24h");

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...activeJobs]
      .filter((job) => !normalized || `${job.company} ${job.role} ${job.status}`.toLowerCase().includes(normalized))
      .sort((a, b) => {
        const readyDelta = Number(b.status === "Ready to Submit") - Number(a.status === "Ready to Submit");
        if (readyDelta) return readyDelta;
        return b.score - a.score;
      });
  }, [query, jobSearchData]);

  const priorityJobs = [...activeJobs]
    .sort((a, b) => {
      const readyDelta = Number(b.status === "Ready to Submit") - Number(a.status === "Ready to Submit");
      if (readyDelta) return readyDelta;
      const freshDelta = Number(b.freshness === "≤24h") - Number(a.freshness === "≤24h");
      if (freshDelta) return freshDelta;
      return b.score - a.score;
    })
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.10),transparent_55%)]" />

      <div className="relative mx-auto max-w-[1180px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 rounded-[26px] border border-white/10 bg-black/70 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-2xl md:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em]">Career Control Center</p>
              <p className="mt-0.5 text-[11px] text-white/34">Updated {jobSearchData.updatedAt}</p>
            </div>
            <Pill tone="good">Automation active</Pill>
          </div>
        </header>

        <section className="px-1 pb-6 pt-10 md:pt-14">
          <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Your application queue.</h1>
          <p className="mt-3 text-sm text-white/42">Only the information you need to decide what to apply to next.</p>
        </section>

        <nav className="mb-6 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
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
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <Metric value={readyJobs.length} label="Ready to submit" />
              <Metric value={appliedPlus.length} label="Applied + active" />
              <Metric value={freshJobs.length} label="Fresh ≤24h" />
              <Metric value={activeJobs.length} label="Active jobs" />
            </div>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.025] p-5 md:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/28">Next actions</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Priority queue</h2>
                </div>
                <button onClick={() => setActiveTab("Jobs")} className="text-xs text-white/44 transition hover:text-white">
                  View all →
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {priorityJobs.map((job) => (
                  <div key={`${job.company}-${job.role}`} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/25 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{job.role}</p>
                        {job.freshness ? <Pill tone={freshnessTone(job.freshness)}>{job.freshness}</Pill> : null}
                      </div>
                      <p className="mt-1 text-xs text-white/38">{job.company} · {job.location} · {job.status}</p>
                    </div>
                    <Score score={job.score} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "Jobs" ? (
          <section>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company, role, or status..."
              className="mb-5 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredJobs.map((job) => <JobCard key={`${job.company}-${job.role}`} job={job} />)}
            </div>
          </section>
        ) : null}

        <footer className="mt-12 border-t border-white/8 px-1 pt-6 text-xs text-white/25">
          Private · Face ID / PIN protected · search indexing disabled
        </footer>
      </div>
    </main>
  );
}
