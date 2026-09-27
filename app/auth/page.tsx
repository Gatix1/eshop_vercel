import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signIn } from "@/app/auth/actions";
import { AuthLayout } from "@/components/auth-layout";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return <AuthLayout eyebrow="Bine ai revenit" title="Intră în cont."><AuthForm action={signIn} fields="login" submitLabel="Autentificare" next={next} />{error ? <p className="mt-5 text-center text-sm text-red-300">{error}</p> : null}<p className="mt-5 text-center text-xs text-mist"><Link className="transition hover:text-acid" href="/auth/forgot-password">Ai uitat parola?</Link></p><p className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-mist">Nu ai cont? <Link className="text-acid hover:text-white" href="/auth/register">Creează unul</Link></p></AuthLayout>;
}
