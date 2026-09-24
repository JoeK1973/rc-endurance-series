"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/firebase/client";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      const s = createClient();
      const { data: { user } } = await s.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data: profile } = await s.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!["admin", "superuser"].includes(profile?.role || "")) {
        window.location.href = "/";
        return;
      }
      setAllowed(true);
    }
    void check();
  }, []);

  if (allowed !== true) return <p className="muted">Checking permissions...</p>;
  return <>{children}</>;
}
