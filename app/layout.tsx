import "./globals.css";
import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import MessagesNav from "@/components/MessagesNav";
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
              <span className="brandFlag">▰▰▰</span>
            </Link>

            <div className="navArea">
              <nav className="navs">
                <Link className="nav" href="/">
                  Home
                </Link>

                <Link
                  className="nav"
                  href="/championship"
                >
                  Series Details
                </Link>

                <AuthNav />
              </nav>

              <div className="navActions">
                <MessagesNav />
                <ThemeToggle />
              </div>
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
