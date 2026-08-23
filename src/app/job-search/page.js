import { cookies } from "next/headers";
import DashboardClient from "./DashboardClient";
import TimingWidget from "./TimingWidget";
import { jobSearchData } from "@/data/jobSearchData";

export const dynamic = "force-dynamic";

export default async function JobSearchPage() {
  await cookies();
  return (
    <>
      <TimingWidget jobs={jobSearchData.jobs} />
      <DashboardClient jobSearchData={jobSearchData} />
    </>
  );
}
