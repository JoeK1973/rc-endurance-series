import "./globals.css";
import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import ThemeToggle from "@/components/ThemeToggle";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <div className="wrap head">
            <Link className="brand" href="/">
              <span className="brandRC">RC</span>

              <span className="brandWords">
                ENDURANCE
                <br />
                SERIES
              </span>

              <span className="brandFlag">
                ▰▰▰
              </span>
            </Link>

            <nav className="navs">
              <Link
                className="nav"
                href="/"
              >
                Home
              </Link>

              <Link
                className="nav"
                href="/championship"
              >
                Series Details
              </Link>

              <Link
                className="nav"
                href="/teams"
              >
                Teams
              </Link>

              <AuthNav />
            </nav>

            <div className="themeToggleArea">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="main">
          {children}
        </main>
      </body>
    </html>
  );
}
