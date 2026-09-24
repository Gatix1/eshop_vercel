import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signIn } from "@/app/auth/actions";
import { AuthLayout } from "@/components/auth-layout";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthLayout eyebrow="Welcome back" title="Sign in to your account."><AuthForm action={signIn} fields="login" submitLabel="Sign in" next={next} /><p className="mt-5 text-center text-xs text-mist"><Link className="transition hover:text-acid" href="/auth/forgot-password">Forgot your password?</Link></p><p className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-mist">New here? <Link className="text-acid hover:text-white" href="/auth/register">Create an account</Link></p></AuthLayout>;
}
