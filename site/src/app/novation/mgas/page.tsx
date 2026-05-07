import type { Metadata } from "next";
import MGAsClient from "./MGAsClient";

export const metadata: Metadata = {
  title: "Novation for MGAs — Advisor Succession Tools | Klarum",
  description:
    "Give your advisors a real succession path and keep every transition inside your MGA ecosystem. Novation by Klarum.",
  openGraph: {
    title: "Novation for MGAs — Advisor Succession Tools | Klarum",
    description:
      "Give your advisors a real succession path and keep every transition inside your MGA ecosystem. Novation by Klarum.",
    url: "https://klarum.ca/novation/mgas",
  },
};

export default function MGAsPage() {
  return <MGAsClient />;
}
