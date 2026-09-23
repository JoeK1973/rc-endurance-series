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
            <Link className="brand brandLogo" href="/">
              <img
                src="/logo-light.png"
                alt="RC Endurance Racing"
                className="logoImage logoLight"
              />

              <img
                src="/logo-dark.png"
                alt="RC Endurance Racing"
                className="logoImage logoDark"
              />
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
