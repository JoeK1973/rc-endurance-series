"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppIcon from "@/components/AppIcon";

const groups = [
  {
    id: "championship",
    label: "Championship",
    icon: "calendar" as const,
    items: [
      { href: "/admin/rounds", label: "Rounds" },
      { href: "/admin/classes", label: "Classes" },
      { href: "/admin/results", label: "Results" },
      { href: "/admin/regulations", label: "Regulations" },
    ],
  },
  {
    id: "people",
    label: "People & Teams",
    icon: "users" as const,
    items: [
      { href: "/admin/drivers", label: "Drivers" },
      { href: "/admin/teams", label: "Teams" },
      { href: "/admin/team-applications", label: "Team Applications" },
      { href: "/admin/bodyshells", label: "Bodyshell Approvals" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: "clipboard" as const,
    items: [
      { href: "/admin/registrations", label: "Registrations & Payments" },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: "settings" as const,
    items: [
      { href: "/admin/admins", label: "Administrators" },
      { href: "/admin/settings", label: "Settings" },
    ],
  },
];

export default function AdminTabs() {
  const pathname = usePathname();
  const activeGroup = groups.find((group) =>
    group.items.some((item) => item.href === pathname)
  ) || groups[0];

  return (
    <div className="adminNavigation">
      <nav className="adminGroupNav" aria-label="Admin sections">
        {groups.map((group) => (
          <Link
            key={group.id}
            href={group.items[0].href}
            className={`adminGroupLink${activeGroup.id === group.id ? " active" : ""}`}
          >
            <AppIcon name={group.icon} size={18} />
            <span>{group.label}</span>
          </Link>
        ))}
      </nav>

      <nav className="adminSubNav" aria-label={`${activeGroup.label} pages`}>
        {activeGroup.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`adminSubLink${pathname === item.href ? " active" : ""}`}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
