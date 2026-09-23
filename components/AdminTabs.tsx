"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Manage Rounds" },
  { href: "/admin/drivers", label: "Manage Drivers" },
  { href: "/admin/teams", label: "Manage Teams" },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="sectionTabs" aria-label="Admin navigation">
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
