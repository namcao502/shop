export const SHIPPING_FREE_THRESHOLD = 500_000;
export const SHIPPING_FEE_HCM_HN = 20_000;
export const SHIPPING_FEE_DEFAULT = 35_000;

// Province codes from src/data/vn-address.json
const HCM_HN_CODES = new Set(["79", "01"]);

/**
 * Calculate shipping fee based on destination province and order subtotal.
 * Returns 0 (free) if subtotal >= SHIPPING_FREE_THRESHOLD.
 */
export function calculateShippingFee(
  provinceCode: string,
  subtotal: number
): number {
  if (subtotal >= SHIPPING_FREE_THRESHOLD) return 0;
  return HCM_HN_CODES.has(provinceCode)
    ? SHIPPING_FEE_HCM_HN
    : SHIPPING_FEE_DEFAULT;
}
