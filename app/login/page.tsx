import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <>
      <h1>Login</h1>
      <p className="muted">Login to manage your driver profile, team or messages.</p>
      <AuthForm mode="login" />
      <p className="space">
        Need an account? <Link href="/register">Register here</Link>.
      </p>
    </>
  );
}
