export type MarketplaceFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialMarketplaceFormState: MarketplaceFormState = { status: "idle" };
