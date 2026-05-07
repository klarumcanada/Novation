import type { Metadata } from "next";
import AdvisorsClient from "./AdvisorsClient";

export const metadata: Metadata = {
  title: "Novation for Advisors — Buy or Sell Your Book | Klarum",
  description:
    "Whether you're retiring or growing, Novation connects Canadian life insurance advisors with the right buyers and sellers — through your MGA.",
  openGraph: {
    title: "Novation for Advisors — Buy or Sell Your Book | Klarum",
    description:
      "Whether you're retiring or growing, Novation connects Canadian life insurance advisors with the right buyers and sellers — through your MGA.",
    url: "https://klarum.ca/novation/advisors",
  },
};

export default function AdvisorsPage() {
  return <AdvisorsClient />;
}
