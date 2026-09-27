import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthLayout } from "@/components/auth-layout";

export default function ForgotPasswordPage() {
  return <AuthLayout eyebrow="Recuperare cont" title="Resetează parola."><p className="mb-6 text-sm leading-6 text-mist">Introdu emailul și îți vom trimite un link securizat pentru resetare.</p><AuthForm action={requestPasswordReset} fields="reset" submitLabel="Trimite linkul" /><p className="mt-8 text-center text-sm text-mist"><Link className="text-acid hover:text-white" href="/auth">Înapoi la autentificare</Link></p></AuthLayout>;
}
