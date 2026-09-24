"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AuthResult = { error?: string; success?: string };

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function callbackUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`;
}

export async function signUp(_state: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formValue(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = formValue(formData, "fullName");

  if (!email || !password || !fullName) return { error: "Name, email, and password are required." };
  if (password.length < 8) return { error: "Password must contain at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: callbackUrl("/auth/callback?next=/account") },
  });

  if (error) return { error: error.message };
  if (data.session) redirect("/account");
  return { success: "Check your email to verify your account before signing in." };
}

export async function signIn(_state: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formValue(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = formValue(formData, "next") || "/account";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "Email or password is incorrect." };
  redirect(next.startsWith("/") ? next : "/account");
}

export async function requestPasswordReset(_state: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formValue(formData, "email").toLowerCase();
  if (!email) return { error: "Enter your account email." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl("/auth/callback?next=/auth/update-password") });
  if (error) return { error: error.message };
  return { success: "If an account exists, a password reset link is on its way." };
}

export async function updatePassword(_state: AuthResult, formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must contain at least 8 characters." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function authOrigin() {
  const origin = (await headers()).get("origin");
  return origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
