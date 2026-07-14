import { canUseWholesale, getSession } from "@/lib/auth";
import type { PricingTier } from "@/lib/products";

export async function getCurrentPricingTier(): Promise<PricingTier> {
  return canUseWholesale(await getSession()) ? "b2b" : "b2c";
}
