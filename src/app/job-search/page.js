import { cookies } from "next/headers";
import DashboardClient from "./DashboardClient";
import { jobSearchData } from "@/data/jobSearchData";

export const dynamic = "force-dynamic";

export default async function JobSearchPage() {
  await cookies();
  return <DashboardClient jobSearchData={jobSearchData} />;
}
