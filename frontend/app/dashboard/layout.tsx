import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon espace",
  description: "Dashboard client SERVIS",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
