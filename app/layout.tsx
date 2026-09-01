import "./globals.css";
import Link from "next/link";
import AuthNav from "@/components/AuthNav";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header>
          <div className="wrap head">
            <Link className="brand" href="/">
              RC ENDURANCE SERIES
            </Link>

            <nav className="navs">
              <Link className="nav" href="/">
                Home
              </Link>

              <Link className="nav" href="/championship">
                Championship
              </Link>

              <Link className="nav" href="/drivers">
                Drivers
              </Link>

              <Link className="nav" href="/teams">
                Teams
              </Link>

              <AuthNav />
            </nav>
          </div>
        </header>

        <main className="main">{children}</main>
      </body>
    </html>
  );
}
