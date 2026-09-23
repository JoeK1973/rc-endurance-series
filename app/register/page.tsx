import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <>
      <h1>Register</h1>
      <p className="muted">Create your RC Endurance Series account.</p>
      <AuthForm mode="register" />
      <p className="space">
        Already registered? <Link href="/login">Login here</Link>.
      </p>
    </>
  );
}
