"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    const supabase = createClient();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      window.location.href = "/";
      return;
    }

    const name = String(formData.get("name") || "").trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: data.user.id,
          name,
          email,
          role: "driver",
        });

      if (profileError) {
        setMessage(`Account created, but profile setup failed: ${profileError.message}`);
        return;
      }
    }

    setMessage(
      data.session
        ? "Registration successful. You are now logged in."
        : "Registration successful. Please check your email and confirm your account."
    );
  }

  return (
    <form action={submit} className="card">
      {mode === "register" && (
        <label>
          Name
          <input className="input" name="name" required />
        </label>
      )}

      <label>
        Email address
        <input className="input" name="email" type="email" required />
      </label>

      <label>
        Password
        <input
          className="input"
          name="password"
          type="password"
          minLength={6}
          required
        />
      </label>

      <button className="btn space" type="submit">
        {mode === "login" ? "Login" : "Create account"}
      </button>

      {message && <p className="space">{message}</p>}
    </form>
  );
}
