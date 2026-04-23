import { z } from "zod";
import type { ShippingAddress } from "@/lib/types";

// Accepts: 0xxxxxxxxx (10 digits) or +84xxxxxxxxx (12 chars with country code)
const vnPhoneRegex = /^(?:0[0-9]{9}|\+84[0-9]{9})$/;

export const shippingAddressSchema = z.object({
  name: z.string().min(2),
  phone: z
    .string()
    .regex(vnPhoneRegex, "Enter a valid Vietnamese phone number (e.g. 0901234567)"),
  address: z.string().min(5),
  ward: z.string().min(1),
  province: z.string().min(1),
});

export function parseShippingErrors(
  error: z.ZodError
): Partial<Record<keyof ShippingAddress, string>> {
  const result: Partial<Record<keyof ShippingAddress, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof ShippingAddress;
    if (!result[field]) {
      result[field] = issue.message;
    }
  }
  return result;
}
