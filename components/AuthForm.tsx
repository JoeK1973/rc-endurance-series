"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({
  mode,
}: {
  mode: "login" | "register";
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setMessage("");
    setLoading(true);

    const supabase = createClient();

    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(formData.get("password") || "");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
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
        data: {
          name,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage("Account creation failed. Please try again.");
      setLoading(false);
      return;
    }

    setMessage(
      data.session
        ? "Registration successful. You are now logged in."
        : "Registration successful. Please check your email and confirm your account."
    );

    setLoading(false);
  }

  return (
    <form action={submit} className="card">
      {mode === "register" && (
        <label>
          Name
          <input
            className="input"
            name="name"
            required
            disabled={loading}
          />
        </label>
      )}

      <label>
        Email address
        <input
          className="input"
          name="email"
          type="email"
          required
          disabled={loading}
        />
      </label>

      <label>
        Password
        <input
          className="input"
          name="password"
          type="password"
          minLength={6}
          required
          disabled={loading}
        />
      </label>

      <button
        className="btn space"
        type="submit"
        disabled={loading}
      >
        {loading
          ? mode === "login"
            ? "Logging in..."
            : "Creating account..."
          : mode === "login"
          ? "Login"
          : "Create account"}
      </button>

      {message && <p className="space">{message}</p>}
    </form>
  );
}
