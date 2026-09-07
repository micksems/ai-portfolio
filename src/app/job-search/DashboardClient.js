export default function DashboardClient({ jobSearchData }) {
  const jobs = jobSearchData.jobs || [];
  const ready = jobs.filter((job) => job.status === "Ready to Submit").length;
  const metrics = [
    {
      label: "Submitted",
      value: jobs.filter((job) => ["Applied", "Interview", "Offer"].includes(job.status)).length,
      description: "Includes interviews and offers",
    },
    {
      label: "Interviews",
      value: jobs.filter((job) => job.status === "Interview").length,
      description: "Currently interviewing",
    },
    {
      label: "Offers",
      value: jobs.filter((job) => job.status === "Offer").length,
      description: "Offers received",
    },
    {
      label: "Active jobs",
      value: jobs.filter((job) => job.status !== "Closed").length,
      description: "Across your whole pipeline",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-10 text-slate-950 selection:bg-blue-100 selection:text-blue-950 sm:px-8 sm:py-16 lg:py-24">
      <section aria-labelledby="job-search-heading" className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-3 text-sm font-medium text-slate-500">Career Control Center</p>
            <h1 id="job-search-heading" className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Job search
            </h1>
            <p className="mt-3 break-words text-sm leading-6 text-slate-600">
              {jobSearchData.updatedAt ? `Updated ${jobSearchData.updatedAt}` : "Update time unavailable"}
            </p>
          </div>
          <a
            href="https://docs.google.com/spreadsheets/d/1Kvb_4CM_FcOEVubMq8LTNFve6LOqw4uxU_SMDMVN44o/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:self-auto"
          >
            Open full tracker <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </header>
        <dl className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-[1.15fr_1fr_1fr]">
          <div className="flex min-h-64 flex-col justify-between rounded-3xl border border-blue-100 bg-[#edf4ff] p-7 min-[360px]:col-span-2 sm:p-8 md:col-span-1 md:row-span-2">
            <dt className="text-base font-medium text-blue-900">Ready to submit</dt>
            <dd className="my-6 text-8xl font-semibold leading-none tracking-[-0.055em] text-blue-700 tabular-nums sm:text-9xl">
              {ready}
            </dd>
            <div className="max-w-52 text-sm leading-6 text-blue-900">
              {ready > 0 ? "Your next applications, ready to send." : "New applications will appear here when ready."}
            </div>
          </div>
          {metrics.map((metric) => (
            <div key={metric.label} className="flex min-h-44 flex-col rounded-3xl border border-slate-200/80 bg-white p-5 sm:min-h-48 sm:p-6">
              <dt className="text-sm font-medium text-slate-700">{metric.label}</dt>
              <dd className="mt-4 text-5xl font-semibold leading-none tracking-[-0.045em] tabular-nums">{metric.value}</dd>
              <div className="mt-auto pt-4 text-sm leading-5 text-slate-600">{metric.description}</div>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
