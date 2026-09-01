"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/championship", label: "Calendar" },
  { href: "/championship/regulations", label: "Regulations" },
  { href: "/championship/results", label: "Results" },
];

export default function ChampionshipTabs() {
  const pathname = usePathname();

  return (
    <nav className="sectionTabs" aria-label="Championship navigation">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`sectionTab${pathname === tab.href ? " active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
