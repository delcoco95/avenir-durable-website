import type { Metadata } from "next";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration Avenir Durable" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
