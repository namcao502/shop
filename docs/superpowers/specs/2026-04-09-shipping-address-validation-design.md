# Shipping Address Validation & Vietnam Address Selection

**Date:** 2026-04-09
**Status:** Approved

## Overview

Add proper validation to the shipping address form and replace the free-text province/district/city inputs with cascading Province -> Ward dropdowns reflecting Vietnam's post-2025 two-level administrative structure (no district level).

## Requirements

- Validation runs on both client (on submit) and server (API route)
- Inline field-level error messages per field
- Phone accepts any international format
- Province and ward selected from dropdowns backed by a static bundled JSON dataset
- Street address remains a free-text input
- Final stored address format: `street, ward, province` (e.g. `100 Do Thi Loi, Tan Phu, Tay Ninh`)

## Data Model

### ShippingAddress type (`src/lib/types.ts`)

Remove `district`. Rename `city` to `ward`.

```typescript
export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;   // street: "100 Do Thi Loi"
  ward: string;      // ward: "Tan Phu"
  province: string;  // province: "Tay Ninh"
}
```

Old Firestore orders with `city`/`district` fields are unaffected (schema-less).

## Components & Files

### `src/data/vn-address.json` (new)

Static two-level dataset: Province -> Wards. No districts. Before implementation, verify that the chosen dataset reflects the post-2025 Vietnam administrative reform (no district level). A candidate source is `ThangLeQuoc/vietnamese-provinces-database` on GitHub, but confirm the data format matches the schema below before committing to it.

```json
[
  {
    "code": "37",
    "name": "Tay Ninh",
    "wards": [
      { "code": "37001", "name": "Tan Phu" }
    ]
  }
]
```

### `src/lib/vn-address.ts` (new)

Types and helpers over the JSON:

```typescript
export interface VnProvince {
  code: string;
  name: string;
}

export interface VnWard {
  code: string;
  name: string;
}

export function getProvinces(): VnProvince[]
export function getWards(provinceCode: string): VnWard[]
```

### `src/lib/validation.ts` (new)

Zod schema shared by client and server:

```typescript
export const shippingAddressSchema = z.object({
  name:     z.string().min(2),
  phone:    z.string().regex(/^\+?[\d\s\-().]{7,20}$/),
  address:  z.string().min(5),
  ward:     z.string().min(1),
  province: z.string().min(1),
})

// Returns field->message map; call when safeParse result.success === false
export function parseShippingErrors(
  error: z.ZodError
): Partial<Record<keyof ShippingAddress, string>>
```

The schema shape must match `ShippingAddress` exactly so `z.infer<typeof shippingAddressSchema>` is identical to `ShippingAddress`. Do not create a separate `ShippingAddressInput` type.

### `src/components/checkout/ShippingForm.tsx` (updated)

- Accept `errors: Partial<Record<keyof ShippingAddress, string>>` prop
- Replace `district`/`city`/`province` text inputs with:
  - Province dropdown (always populated)
  - Ward dropdown (populated after province is selected, disabled until then)
- Pass each field's error to its `Input` or select element

### `src/app/checkout/page.tsx` (updated)

- Add `addressErrors` state (`Partial<Record<keyof ShippingAddress, string>>`)
- On submit: run `shippingAddressSchema.safeParse(address)`; if invalid, call `parseShippingErrors` and set state, abort
- Remove old `isAddressComplete` check
- Pass `addressErrors` to `ShippingForm`
- Update initial address state: remove `district`/`city`, add `ward`

### `src/app/api/orders/route.ts` (updated)

- Import `shippingAddressSchema`
- After parsing request body, run `shippingAddressSchema.safeParse(body.shippingAddress)`
- Return `400` with field errors if invalid
- Update `CreateOrderBody` interface to use updated `ShippingAddress`

## Validation Rules

| Field    | Rule                                              |
|----------|---------------------------------------------------|
| name     | Required, min 2 characters                        |
| phone    | Required, matches `+?[\d\s\-().]{7,20}`           |
| address  | Required, min 5 characters (street + number)      |
| ward     | Required, non-empty                               |
| province | Required, non-empty                               |

## Error Display

Errors appear after the user clicks "Place Order" (submit-time only, no on-blur validation). Each field shows its own inline error message via the existing `error` prop on the `Input` component. Dropdowns get a red border + message below via the same pattern.

## Error Messages

Error messages must support both `vi` and `en` locales. New translation keys added to `src/lib/i18n/translations.ts` (`TranslationKey` union), `src/lib/i18n/en.ts`, and `src/lib/i18n/vi.ts`:

| Key                          | English                              | Vietnamese                          |
|------------------------------|--------------------------------------|-------------------------------------|
| `validation.nameMin`         | Name must be at least 2 characters   | Ten phai co it nhat 2 ky tu         |
| `validation.phoneInvalid`    | Enter a valid phone number           | So dien thoai khong hop le          |
| `validation.addressMin`      | Address must be at least 5 characters| Dia chi phai co it nhat 5 ky tu     |
| `validation.wardRequired`    | Please select a ward                 | Vui long chon phuong/xa             |
| `validation.provinceRequired`| Please select a province             | Vui long chon tinh/thanh pho        |

## Dependencies

- `zod` (new) - install via `npm install zod`

## Out of Scope

- On-blur / real-time validation
- Address autocomplete
- Saving a preferred address for repeat users
