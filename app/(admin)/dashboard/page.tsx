import { redirect } from "next/navigation";

// Dashboard moved — admin now starts at Dispatch Centre
export default function DashboardRedirect() {
  redirect("/dispatch");
}
