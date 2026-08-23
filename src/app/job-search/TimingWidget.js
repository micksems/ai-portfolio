function median(values) {
  const numbers = values.filter((value) => Number.isFinite(Number(value))).map(Number).sort((a, b) => a - b);
  if (!numbers.length) return null;
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2;
}

function formatHours(value) {
  if (value === null) return "—";
  return `${value.toFixed(1)}h`;
}

export default function TimingWidget({ jobs = [] }) {
  const fresh = jobs.filter((job) => job.freshness === "≤24h").length;
  const medianReady = median(jobs.map((job) => job.hoursToReady));
  const medianApply = median(jobs.map((job) => job.hoursToApply));
  const hasTimingData = jobs.some(
    (job) => job.freshness || job.firstSeenAt || job.readyAt || job.appliedAt || job.hoursToReady != null || job.hoursToApply != null,
  );

  return (
    <aside className="fixed bottom-4 right-4 z-30 w-[280px] rounded-[24px] border border-white/10 bg-black/75 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/30">Application speed</p>
          <p className="mt-1 text-sm font-medium text-white/80">Freshness + time to apply</p>
        </div>
        <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2.5 py-1 text-[10px] font-medium text-emerald-200">Live</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
          <p className="text-lg font-semibold tracking-[-0.04em]">{fresh}</p>
          <p className="mt-1 text-[10px] leading-4 text-white/36">Fresh ≤24h</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
          <p className="text-lg font-semibold tracking-[-0.04em]">{formatHours(medianReady)}</p>
          <p className="mt-1 text-[10px] leading-4 text-white/36">Median ready</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
          <p className="text-lg font-semibold tracking-[-0.04em]">{formatHours(medianApply)}</p>
          <p className="mt-1 text-[10px] leading-4 text-white/36">Median apply</p>
        </div>
      </div>

      {!hasTimingData ? (
        <p className="mt-3 text-[10px] leading-4 text-white/30">Timing starts with the next newly discovered jobs; legacy rows are intentionally not backfilled.</p>
      ) : null}
    </aside>
  );
}
