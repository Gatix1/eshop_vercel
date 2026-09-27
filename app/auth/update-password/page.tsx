import { AuthForm } from "@/components/auth-form";
import { updatePassword } from "@/app/auth/actions";
import { AuthLayout } from "@/components/auth-layout";

export default function UpdatePasswordPage() {
  return <AuthLayout eyebrow="Aproape gata" title="Alege o parolă nouă."><AuthForm action={updatePassword} fields="password" submitLabel="Actualizează parola" /></AuthLayout>;
}
