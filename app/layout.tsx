import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import AuthNav from "@/components/AuthNav";

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
            <Link
              className="brand brandLogo"
              href="/"
              aria-label="RC Endurance Racing - Home"
            >
              <Image
                src="/logo.png"
                alt="RC Endurance Racing"
                width={420}
                height={200}
                priority
                className="logoImage"
              />
            </Link>

            <nav className="navs">
              <Link className="nav" href="/">
                Home
              </Link>

              <Link className="nav" href="/championship">
                Series Details
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
