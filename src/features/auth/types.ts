export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Raw submitted field values, echoed back on a validation error so a
   * form with uncontrolled inputs can restore what the user typed
   * instead of re-rendering blank. */
  values?: Record<string, string>;
};

export const initialAuthFormState: AuthFormState = { status: "idle" };
