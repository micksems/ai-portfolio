"use client";

function Metric({ value, label }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] px-5 py-7 sm:px-6">
      <div className="text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">{value}</div>
      <div className="mt-3 text-sm text-white/42">{label}</div>
    </div>
  );
}

export default function DashboardClient({ jobSearchData }) {
  const jobs = jobSearchData.jobs || [];
  const activeJobs = jobs.filter((job) => job.status !== "Closed");
  const ready = activeJobs.filter((job) => job.status === "Ready to Submit").length;
  const submitted = activeJobs.filter((job) => ["Applied", "Interview", "Offer"].includes(job.status)).length;
  const interviews = activeJobs.filter((job) => job.status === "Interview").length;
  const offers = activeJobs.filter((job) => job.status === "Offer").length;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto flex min-h-screen max-w-[920px] flex-col justify-center px-5 py-12 sm:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/45">Career Control Center</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Job search scoreboard</h1>
          </div>
          <div className="text-right text-xs text-white/30">
            <div>Daily sync</div>
            <div className="mt-1 text-white/55">9:00 AM ET</div>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric value={ready} label="Ready" />
          <Metric value={submitted} label="Submitted" />
          <Metric value={interviews} label="Interviews" />
          <Metric value={offers} label="Offers" />
          <Metric value={activeJobs.length} label="Active jobs" />
        </section>

        <div className="mt-8 flex items-center justify-between border-t border-white/8 pt-6 text-xs">
          <span className="text-white/28">Private · simple by design</span>
          <a
            href="https://docs.google.com/spreadsheets/d/1Kvb_4CM_FcOEVubMq8LTNFve6LOqw4uxU_SMDMVN44o/edit"
            target="_blank"
            rel="noreferrer"
            className="text-white/55 transition hover:text-white"
          >
            Open full tracker ↗
          </a>
        </div>
      </div>
    </main>
  );
}
