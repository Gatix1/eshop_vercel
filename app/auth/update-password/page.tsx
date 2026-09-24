import { AuthForm } from "@/components/auth-form";
import { updatePassword } from "@/app/auth/actions";
import { AuthLayout } from "@/components/auth-layout";

export default function UpdatePasswordPage() {
  return <AuthLayout eyebrow="Almost there" title="Choose a new password."><AuthForm action={updatePassword} fields="password" submitLabel="Update password" /></AuthLayout>;
}
