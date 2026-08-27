import { redirect } from "next/navigation";

/** /legal → mentions par défaut */
export default function LegalIndexPage() {
  redirect("/legal/mentions");
}
