import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/app/auth/actions";
import { AuthLayout } from "@/components/auth-layout";

export default function RegisterPage() {
  return <AuthLayout eyebrow="Începe aici" title="Creează-ți contul."><AuthForm action={signUp} fields="signup" submitLabel="Creează cont" /><p className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-mist">Ai deja cont? <Link className="text-acid hover:text-white" href="/auth">Autentifică-te</Link></p></AuthLayout>;
}
