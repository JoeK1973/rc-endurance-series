import Link from "next/link";
import AppIcon from "@/components/AppIcon";

const sections = [
  {
    title: "Championship",
    description: "Set up the season and publish championship information.",
    icon: "calendar" as const,
    links: [
      { label: "Manage rounds", href: "/admin/rounds", detail: "Dates, venues and entry limits" },
      { label: "Manage classes", href: "/admin/classes", detail: "Create and manage racing classes" },
      { label: "Manage results", href: "/admin/results", detail: "Publish results links" },
      { label: "Regulations", href: "/admin/regulations", detail: "Rules and documents" },
    ],
  },
  {
    title: "People & Teams",
    description: "Manage the people, teams and approvals that make up the series.",
    icon: "users" as const,
    links: [
      { label: "Manage drivers", href: "/admin/drivers", detail: "Driver accounts and profiles" },
      { label: "Manage teams", href: "/admin/teams", detail: "Approved teams and managers" },
      { label: "Team applications", href: "/admin/team-applications", detail: "Review new team requests" },
      { label: "Bodyshell approvals", href: "/admin/bodyshells", detail: "Review team livery submissions" },
    ],
  },
  {
    title: "Operations",
    description: "Keep track of entries and event administration.",
    icon: "clipboard" as const,
    links: [
      { label: "Registrations & payments", href: "/admin/registrations", detail: "Entries, payment status and waiting lists" },
    ],
  },
  {
    title: "System",
    description: "Control access and application-wide settings.",
    icon: "settings" as const,
    links: [
      { label: "Administrators", href: "/admin/admins", detail: "Manage administrator permissions" },
      { label: "Settings", href: "/admin/settings", detail: "Application-wide settings" },
    ],
  },
];

export default function AdminDashboard() {
  return (
    <div className="adminDashboard">
      <div className="adminWelcome card">
        <div className="adminWelcomeIcon"><AppIcon name="shield" size={26} /></div>
        <div>
          <h2>Welcome to administration</h2>
          <p className="muted">Choose an area below to manage the RC Endurance Series.</p>
        </div>
      </div>

      <div className="adminDashboardGrid">
        {sections.map((section) => (
          <section className="card adminSectionCard" key={section.title}>
            <div className="adminSectionHeading">
              <span className="adminSectionIcon"><AppIcon name={section.icon} size={22} /></span>
              <div>
                <h2>{section.title}</h2>
                <p className="muted">{section.description}</p>
              </div>
            </div>
            <div className="adminQuickLinks">
              {section.links.map((link) => (
                <Link className="adminQuickLink" href={link.href} key={link.href}>
                  <span>
                    <strong>{link.label}</strong>
                    <small>{link.detail}</small>
                  </span>
                  <AppIcon name="chevron-right" size={18} />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
