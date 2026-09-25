export default function DashboardClient({ jobSearchData }) {
  const jobs = jobSearchData.jobs || [];
  const activeJobs = jobs.filter((job) => ["Found", "Ready to Submit"].includes(job.status));
  const pending = activeJobs.filter((job) => job.status === "Found").length;
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
      label: "Rejections",
      value: jobs.filter((job) => job.status === "Rejected").length,
      description: "Applications not moved forward",
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
            <dt className="text-base font-medium text-blue-900">Active jobs</dt>
            <dd className="my-6 text-8xl font-semibold leading-none tracking-[-0.055em] text-blue-700 tabular-nums sm:text-9xl">
              {activeJobs.length}
            </dd>
            <div className="max-w-52 text-sm leading-6 text-blue-900">
              {activeJobs.length > 0
                ? `${ready} ready to submit · ${pending} awaiting form review`
                : "New opportunities will appear here after the next search."}
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
        <section aria-labelledby="active-jobs-heading" className="mt-10">
          <h2 id="active-jobs-heading" className="text-xl font-semibold">Your current shortlist</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ready to submit means the application form has been checked. The other roles remain in your shortlist while their final form review is pending.
          </p>
          <ul className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {activeJobs.map((job) => (
              <li key={job.url || `${job.company}-${job.position}`} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">{job.company}</p>
                  <h3 className="mt-1 font-semibold">{job.position}</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {job.status === "Ready to Submit" ? "Ready to submit" : "Awaiting form review"}
                  </p>
                </div>
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center self-start rounded-full border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:self-auto">
                  View job <span aria-hidden="true" className="ml-2">↗</span>
                  <span className="sr-only"> at {job.company} (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
