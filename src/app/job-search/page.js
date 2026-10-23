import DashboardClient from "./DashboardClient";
import { jobSearchData } from "@/data/jobSearchData";

export const dynamic = "force-dynamic";

export default function JobSearchPage() {
  return <DashboardClient jobSearchData={jobSearchData} />;
}
