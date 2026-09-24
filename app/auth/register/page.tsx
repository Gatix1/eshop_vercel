import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/app/auth/actions";
import { AuthLayout } from "@/components/auth-layout";

export default function RegisterPage() {
  return <AuthLayout eyebrow="Start here" title="Create your account."><AuthForm action={signUp} fields="signup" submitLabel="Create account" /><p className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-mist">Already registered? <Link className="text-acid hover:text-white" href="/auth">Sign in</Link></p></AuthLayout>;
}
