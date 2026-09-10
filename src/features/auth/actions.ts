"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getOrigin } from "@/lib/get-origin";
import { buildConfirmUrl } from "./confirm-url";
import { getCurrentProfile, destinationForProfile } from "./profile";
import { mapAuthError, EXISTING_ACCOUNT_MESSAGE } from "./errors";
import {
  signUpSchema,
  logInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  onboardingSchema,
} from "./schemas";
import type { AuthFormState } from "./types";

const NOT_CONFIGURED_STATE: AuthFormState = {
  status: "error",
  message:
    "Supabase isn't configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
};

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!env.isSupabaseConfiguredPublic()) return NOT_CONFIGURED_STATE;

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const origin = await getOrigin();

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: buildConfirmUrl(origin, "/onboarding?verified=1"),
      },
    });

    if (error) {
      return { status: "error", message: mapAuthError(error) };
    }

    // Supabase returns success with an empty identities array (no error)
    // when the email is already registered and confirmed, to avoid
    // leaking which emails exist. Surface that as an "existing account"
    // error instead of a false "check your email" success.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { status: "error", message: EXISTING_ACCOUNT_MESSAGE };
    }

    return {
      status: "success",
      message: `We sent a confirmation link to ${parsed.data.email}. Check your inbox to verify your account.`,
    };
  } catch {
    return {
      status: "error",
      message: "Network error. Check your connection and try again.",
    };
  }
}

export async function logInAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!env.isSupabaseConfiguredPublic()) return NOT_CONFIGURED_STATE;

  const parsed = logInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let destination: "/onboarding" | "/app";
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return { status: "error", message: mapAuthError(error) };
    }

    const { profile } = await getCurrentProfile(supabase);
    destination = destinationForProfile(profile);
  } catch {
    return {
      status: "error",
      message: "Network error. Check your connection and try again.",
    };
  }

  redirect(destination);
}

export async function logOutAction() {
  // redirect() throws internally, so it must never sit inside a
  // try/catch that could swallow that throw as a regular error.
  let failed = false;

  if (env.isSupabaseConfiguredPublic()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.signOut();
      failed = Boolean(error);
    } catch {
      failed = true;
    }
  }

  redirect(failed ? "/app?error=logout_failed" : "/");
}

export async function forgotPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!env.isSupabaseConfiguredPublic()) return NOT_CONFIGURED_STATE;

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Always return the same success message whether or not the email is
  // registered, so this can't be used to enumerate accounts.
  const successState: AuthFormState = {
    status: "success",
    message:
      "If an account exists for that email, we sent a link to reset your password.",
  };

  try {
    const supabase = await createClient();
    const origin = await getOrigin();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: buildConfirmUrl(origin, "/reset-password"),
    });
  } catch {
    return {
      status: "error",
      message: "Network error. Check your connection and try again.",
    };
  }

  return successState;
}

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!env.isSupabaseConfiguredPublic()) return NOT_CONFIGURED_STATE;

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) {
      return { status: "error", message: mapAuthError(error) };
    }
    // Sign out of the one-time recovery session so the user logs in fresh
    // with the new password.
    await supabase.auth.signOut();
  } catch {
    return {
      status: "error",
      message: "Network error. Check your connection and try again.",
    };
  }

  redirect("/login?reset=success");
}

export async function resendVerificationAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!env.isSupabaseConfiguredPublic()) return NOT_CONFIGURED_STATE;

  const parsed = resendVerificationSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address first." };
  }

  try {
    const supabase = await createClient();
    const origin = await getOrigin();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: { emailRedirectTo: buildConfirmUrl(origin, "/onboarding?verified=1") },
    });
    if (error) {
      return { status: "error", message: mapAuthError(error) };
    }
  } catch {
    return {
      status: "error",
      message: "Network error. Check your connection and try again.",
    };
  }

  return {
    status: "success",
    message: `We sent a new confirmation link to ${parsed.data.email}.`,
  };
}

export async function completeOnboardingAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!env.isSupabaseConfiguredPublic()) return NOT_CONFIGURED_STATE;

  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
    isFarmer: formData.get("isFarmer") === "on",
    isProvider: formData.get("isProvider") === "on",
    phone: formData.get("phone") || undefined,
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { status: "error", message: "Your session has expired. Please log in again." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.displayName,
        is_farmer: parsed.data.isFarmer,
        is_provider: parsed.data.isProvider,
        phone: parsed.data.phone || null,
        location: parsed.data.location || null,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (error) {
      return { status: "error", message: "Could not save your profile. Please try again." };
    }
  } catch {
    return {
      status: "error",
      message: "Network error. Check your connection and try again.",
    };
  }

  redirect("/app");
}
