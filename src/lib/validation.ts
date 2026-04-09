import { z } from "zod";
import type { ShippingAddress } from "@/lib/types";

export const shippingAddressSchema = z.object({
  name: z.string().min(2),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-(). ]{7,20}$/)
    .refine((val) => val.replace(/\D/g, "").length >= 7, {
      message: "Phone number must contain at least 7 digits",
    }),
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
