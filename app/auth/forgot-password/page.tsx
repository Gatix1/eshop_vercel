import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthLayout } from "@/components/auth-layout";

export default function ForgotPasswordPage() {
  return <AuthLayout eyebrow="Account recovery" title="Reset your password."><p className="mb-6 text-sm leading-6 text-mist">Enter your email and we&apos;ll send you a secure reset link.</p><AuthForm action={requestPasswordReset} fields="reset" submitLabel="Send reset link" /><p className="mt-8 text-center text-sm text-mist"><Link className="text-acid hover:text-white" href="/auth">Back to sign in</Link></p></AuthLayout>;
}
