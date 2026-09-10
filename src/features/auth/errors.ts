export const EMAIL_NOT_CONFIRMED_MESSAGE =
  "Please verify your email before logging in.";
export const EXISTING_ACCOUNT_MESSAGE =
  "An account with this email already exists. Try logging in instead.";

/** Translates a raw Supabase Auth error into a user-facing message. */
export function mapAuthError(error: { message: string } | null): string {
  if (!error) return "Something went wrong. Please try again.";
  const msg = error.message.toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (msg.includes("email not confirmed")) {
    return EMAIL_NOT_CONFIRMED_MESSAGE;
  }
  if (msg.includes("already registered") || msg.includes("already exists")) {
    return EXISTING_ACCOUNT_MESSAGE;
  }
  if (msg.includes("password should be at least") || msg.includes("password")) {
    return "Password does not meet the minimum requirements.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("user not found")) {
    return "Incorrect email or password.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}
