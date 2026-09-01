import "./globals.css";
import Link from "next/link";
import AuthNav from "@/components/AuthNav";

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>
    <header className="siteHeader"><div className="wrap head">
      <Link className="brand" href="/"><span className="brandRC">RC</span><span className="brandWords">ENDURANCE<br/>SERIES</span><span className="brandFlag">▰▰▰</span></Link>
      <nav className="navs">
        <Link className="nav" href="/">Home</Link>
        <Link className="nav" href="/championship">Series Details</Link>
        <Link className="nav" href="/drivers">Drivers</Link>
        <Link className="nav" href="/teams">Teams</Link>
        <AuthNav/>
      </nav>
    </div></header>
    <main className="main">{children}</main>
  </body></html>
}
