# Shipping Address Validation & Vietnam Address Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Zod-based validation to the shipping address form, replace free-text district/city/province inputs with Province -> Ward cascading dropdowns backed by a static Vietnam post-2025 address dataset.

**Architecture:** A shared Zod schema in `src/lib/validation.ts` is used by both the checkout page (client) and the orders API route (server). Address data lives in `src/data/vn-address.json` with typed helpers in `src/lib/vn-address.ts`. `ShippingForm` receives an `errors` prop and passes each error to the relevant field.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zod (new), Tailwind CSS, Firebase

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/types.ts` | Modify | Remove `district`, rename `city` -> `ward` in `ShippingAddress` |
| `src/lib/i18n/translations.ts` | Modify | Replace `shipping.district`/`shipping.city` with `shipping.ward`; add 5 `validation.*` keys |
| `src/lib/i18n/en.ts` | Modify | Same key replacements + English validation messages |
| `src/lib/i18n/vi.ts` | Modify | Same key replacements + Vietnamese validation messages |
| `src/data/vn-address.json` | Create | Static Province -> Wards dataset (post-2025, no districts) |
| `src/lib/vn-address.ts` | Create | `getProvinces()` and `getWards(provinceCode)` typed helpers |
| `src/lib/validation.ts` | Create | Zod `shippingAddressSchema` + `parseShippingErrors()` |
| `src/components/checkout/ShippingForm.tsx` | Modify | Cascading dropdowns + `errors` prop |
| `src/app/checkout/page.tsx` | Modify | Zod validation on submit + `addressErrors` state |
| `src/app/api/orders/route.ts` | Modify | Server-side Zod validation before transaction |
| `src/app/admin/orders/page.tsx` | Modify | Fix `.district`/`.city` -> `.ward`/`.province` display |
| `src/app/orders/[id]/page.tsx` | Modify | Fix address display to use `.ward`/`.province` |

---

## Task 1: Install Zod

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install zod**

```bash
npm install zod
```

Expected: `package.json` now lists `"zod"` under `dependencies`.

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npm run build
```

Expected: Build succeeds (no new errors from adding the package).

---

## Task 2: Update ShippingAddress type

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Remove `district`, rename `city` to `ward`**

In `src/lib/types.ts`, replace the `ShippingAddress` interface:

```typescript
export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  ward: string;
  province: string;
}
```

The full file after the change:

```typescript
export type PaymentMethod = "vietqr" | "momo";
export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderStatus = "pending" | "confirmed" | "shipping" | "delivered" | "cancelled";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  categoryId: string;
  stock: number;
  isPublished: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  ward: string;
  province: string;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  slug: string;
}
```

- [ ] **Step 2: Check how many type errors this creates**

```bash
npm run build 2>&1 | grep "error TS"
```

Expected: Several errors in files that reference `.district` or `.city` on `ShippingAddress`. These are fixed in subsequent tasks — do not fix them now, just confirm the errors are only in the files listed in the File Map above.

---

## Task 3: Update i18n keys

**Files:**
- Modify: `src/lib/i18n/translations.ts`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/vi.ts`

- [ ] **Step 1: Update `translations.ts`**

Replace the `shipping.district` and `shipping.city` keys with `shipping.ward`. Add 5 new `validation.*` keys. In `src/lib/i18n/translations.ts`:

Replace this block:
```typescript
  | "shipping.district"
  | "shipping.city"
  | "shipping.province"
```

With:
```typescript
  | "shipping.ward"
  | "shipping.province"
  | "shipping.selectProvince"
  | "shipping.selectWard"
  | "validation.nameMin"
  | "validation.phoneInvalid"
  | "validation.addressMin"
  | "validation.wardRequired"
  | "validation.provinceRequired"
```

- [ ] **Step 2: Update `en.ts`**

Replace:
```typescript
  "shipping.district": "District",
  "shipping.city": "City",
  "shipping.province": "Province",
```

With:
```typescript
  "shipping.ward": "Ward",
  "shipping.province": "Province / City",
  "shipping.selectProvince": "Select province...",
  "shipping.selectWard": "Select ward...",
  "validation.nameMin": "Name must be at least 2 characters",
  "validation.phoneInvalid": "Enter a valid phone number",
  "validation.addressMin": "Address must be at least 5 characters",
  "validation.wardRequired": "Please select a ward",
  "validation.provinceRequired": "Please select a province",
```

- [ ] **Step 3: Update `vi.ts`**

Replace:
```typescript
  "shipping.district": "Quận/Huyện",
  "shipping.city": "Thành phố",
  "shipping.province": "Tỉnh",
```

With:
```typescript
  "shipping.ward": "Phường/Xã",
  "shipping.province": "Tỉnh/Thành phố",
  "shipping.selectProvince": "Chọn tỉnh/thành phố...",
  "shipping.selectWard": "Chọn phường/xã...",
  "validation.nameMin": "Tên phải có ít nhất 2 ký tự",
  "validation.phoneInvalid": "Số điện thoại không hợp lệ",
  "validation.addressMin": "Địa chỉ phải có ít nhất 5 ký tự",
  "validation.wardRequired": "Vui lòng chọn phường/xã",
  "validation.provinceRequired": "Vui lòng chọn tỉnh/thành phố",
```

- [ ] **Step 4: Verify build (i18n errors only)**

```bash
npm run build 2>&1 | grep "error TS"
```

Expected: Errors are only in files that still use `.district`/`.city` on `ShippingAddress` or `shipping.district`/`shipping.city` translation keys. The i18n files themselves should be error-free.

---

## Task 4: Create Vietnam address dataset

**Files:**
- Create: `src/data/vn-address.json`
- Create: `src/lib/vn-address.ts`

- [ ] **Step 1: Source and create `vn-address.json`**

Download the post-2025 Vietnam administrative data (no district level) from:
`https://raw.githubusercontent.com/ThangLeQuoc/vietnamese-provinces-database/master/json/generated_data_with_nested_children.json`

Verify the file contains only two levels (province -> wards, no districts). If the upstream format differs, transform it into this structure and save as `src/data/vn-address.json`:

```json
[
  {
    "code": "01",
    "name": "Ha Noi",
    "wards": [
      { "code": "00001", "name": "Phuc Xa" },
      { "code": "00004", "name": "Truc Bach" }
    ]
  },
  {
    "code": "79",
    "name": "Ho Chi Minh City",
    "wards": [
      { "code": "26734", "name": "Ben Nghe" },
      { "code": "26737", "name": "Ben Thanh" }
    ]
  }
]
```

Each province has `code` (string), `name` (string), and `wards` array where each ward has `code` (string) and `name` (string).

- [ ] **Step 2: Create `src/lib/vn-address.ts`**

```typescript
import data from "@/data/vn-address.json";

export interface VnProvince {
  code: string;
  name: string;
}

export interface VnWard {
  code: string;
  name: string;
}

interface ProvinceEntry {
  code: string;
  name: string;
  wards: VnWard[];
}

const provinces = data as ProvinceEntry[];

export function getProvinces(): VnProvince[] {
  return provinces.map(({ code, name }) => ({ code, name }));
}

export function getWards(provinceCode: string): VnWard[] {
  const province = provinces.find((p) => p.code === provinceCode);
  return province ? province.wards : [];
}
```

- [ ] **Step 3: Verify types compile**

```bash
npm run build 2>&1 | grep "vn-address"
```

Expected: No errors mentioning `vn-address`.

---

## Task 5: Create validation schema

**Files:**
- Create: `src/lib/validation.ts`

- [ ] **Step 1: Create `src/lib/validation.ts`**

```typescript
import { z } from "zod";
import type { ShippingAddress } from "@/lib/types";

export const shippingAddressSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+?[\d\s\-(). ]{7,20}$/),
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
```

Note: The error messages returned by `parseShippingErrors` use Zod's default English messages. The caller (checkout page) will replace these with localized messages using `t()`. See Task 6 for how the checkout page maps Zod errors to translation keys.

- [ ] **Step 2: Verify no type errors**

```bash
npm run build 2>&1 | grep "validation.ts"
```

Expected: No errors.

---

## Task 6: Update ShippingForm

**Files:**
- Modify: `src/components/checkout/ShippingForm.tsx`

- [ ] **Step 1: Rewrite `ShippingForm.tsx`**

Key design decisions:
- `ShippingAddress.province` stores the province **name** (human-readable, stored in Firestore)
- The province `<select>` value tracks a **code** internally to filter wards; the code is resolved back from the stored name via `provinces.find`
- `ShippingAddress.ward` stores the ward **name**
- Selecting a new province resets ward to `""`

Replace the entire file:

```typescript
"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { getProvinces, getWards } from "@/lib/vn-address";
import type { ShippingAddress } from "@/lib/types";
import { Input } from "@/components/ui/Input";

interface ShippingFormProps {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
  errors?: Partial<Record<keyof ShippingAddress, string>>;
}

const selectClass = (hasError: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white ${
    hasError ? "border-red-500" : "border-gray-300"
  }`;

export function ShippingForm({ address, onChange, errors = {} }: ShippingFormProps) {
  const { t } = useLocale();
  const provinces = getProvinces();
  const selectedProvinceCode =
    provinces.find((p) => p.name === address.province)?.code ?? "";
  const wards = selectedProvinceCode ? getWards(selectedProvinceCode) : [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">{t("shipping.title")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("shipping.fullName")}
          value={address.name}
          onChange={(e) => onChange({ ...address, name: e.target.value })}
          error={errors.name}
        />
        <Input
          label={t("shipping.phone")}
          value={address.phone}
          onChange={(e) => onChange({ ...address, phone: e.target.value })}
          error={errors.phone}
        />
      </div>
      <Input
        label={t("shipping.address")}
        value={address.address}
        onChange={(e) => onChange({ ...address, address: e.target.value })}
        placeholder={t("shipping.addressPlaceholder")}
        error={errors.address}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            {t("shipping.province")}
          </label>
          <select
            className={selectClass(!!errors.province)}
            value={selectedProvinceCode}
            onChange={(e) => {
              const selected = provinces.find((p) => p.code === e.target.value);
              onChange({ ...address, province: selected?.name ?? "", ward: "" });
            }}
          >
            <option value="">{t("shipping.selectProvince")}</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.province && (
            <p className="text-xs text-red-600">{errors.province}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            {t("shipping.ward")}
          </label>
          <select
            className={selectClass(!!errors.ward)}
            value={address.ward}
            onChange={(e) => onChange({ ...address, ward: e.target.value })}
            disabled={!selectedProvinceCode}
          >
            <option value="">{t("shipping.selectWard")}</option>
            {wards.map((w) => (
              <option key={w.code} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>
          {errors.ward && (
            <p className="text-xs text-red-600">{errors.ward}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors in ShippingForm**

```bash
npm run build 2>&1 | grep "ShippingForm"
```

Expected: No errors mentioning `ShippingForm.tsx`.

---

## Task 7: Update CheckoutPage

**Files:**
- Modify: `src/app/checkout/page.tsx`

- [ ] **Step 1: Update imports and initial state**

At the top of `src/app/checkout/page.tsx`, add the validation import:

```typescript
import { shippingAddressSchema, parseShippingErrors } from "@/lib/validation";
```

Update the initial address state (remove `district`/`city`, add `ward`):

```typescript
const [address, setAddress] = useState<ShippingAddress>({
  name: "",
  phone: "",
  address: "",
  ward: "",
  province: "",
});
```

Add the errors state after the existing state declarations:

```typescript
const [addressErrors, setAddressErrors] = useState<
  Partial<Record<keyof ShippingAddress, string>>
>({});
```

- [ ] **Step 2: Replace validation logic in `handleSubmit`**

Replace this block in `handleSubmit`:

```typescript
if (!isAddressComplete) {
  setError(t("checkout.fillAllFields"));
  return;
}
```

With:

```typescript
const validation = shippingAddressSchema.safeParse(address);
if (!validation.success) {
  const fieldErrors = parseShippingErrors(validation.error);
  // Map Zod default messages to localized messages
  const localized: Partial<Record<keyof ShippingAddress, string>> = {};
  if (fieldErrors.name) localized.name = t("validation.nameMin");
  if (fieldErrors.phone) localized.phone = t("validation.phoneInvalid");
  if (fieldErrors.address) localized.address = t("validation.addressMin");
  if (fieldErrors.ward) localized.ward = t("validation.wardRequired");
  if (fieldErrors.province) localized.province = t("validation.provinceRequired");
  setAddressErrors(localized);
  return;
}
setAddressErrors({});
```

- [ ] **Step 3: Remove `isAddressComplete` and pass `addressErrors` to `ShippingForm`**

Delete this line:
```typescript
const isAddressComplete = Object.values(address).every((v) => v.trim() !== "");
```

Update the `<ShippingForm>` usage:
```typescript
<ShippingForm address={address} onChange={setAddress} errors={addressErrors} />
```

- [ ] **Step 4: Verify checkout page compiles**

```bash
npm run build 2>&1 | grep "checkout"
```

Expected: No errors mentioning `checkout/page.tsx`.

---

## Task 8: Update orders API route

**Files:**
- Modify: `src/app/api/orders/route.ts`

- [ ] **Step 1: Add Zod validation before the transaction**

Add import at the top of `src/app/api/orders/route.ts`:

```typescript
import { shippingAddressSchema } from "@/lib/validation";
```

After the existing `!body.items?.length || !body.shippingAddress || !body.paymentMethod` check, add:

```typescript
const addressValidation = shippingAddressSchema.safeParse(body.shippingAddress);
if (!addressValidation.success) {
  return NextResponse.json(
    { error: "Invalid shipping address", details: addressValidation.error.flatten().fieldErrors },
    { status: 400 }
  );
}
```

The full updated validation block becomes:

```typescript
if (!body.items?.length || !body.shippingAddress || !body.paymentMethod) {
  return NextResponse.json(
    { error: "Missing required fields" },
    { status: 400 }
  );
}

if (!["vietqr", "momo"].includes(body.paymentMethod)) {
  return NextResponse.json(
    { error: "Invalid payment method" },
    { status: 400 }
  );
}

const addressValidation = shippingAddressSchema.safeParse(body.shippingAddress);
if (!addressValidation.success) {
  return NextResponse.json(
    { error: "Invalid shipping address", details: addressValidation.error.flatten().fieldErrors },
    { status: 400 }
  );
}
```

- [ ] **Step 2: Verify API route compiles**

```bash
npm run build 2>&1 | grep "api/orders"
```

Expected: No errors.

---

## Task 9: Fix address display in order views

**Files:**
- Modify: `src/app/orders/[id]/page.tsx`
- Modify: `src/app/admin/orders/page.tsx`

- [ ] **Step 1: Fix `src/app/orders/[id]/page.tsx`**

Find this block (around line 131-135):

```typescript
<p className="text-sm text-gray-600">
  {order.shippingAddress.address}, {order.shippingAddress.district}
</p>
<p className="text-sm text-gray-600">
  {order.shippingAddress.city}, {order.shippingAddress.province}
</p>
```

Replace with:

```typescript
<p className="text-sm text-gray-600">
  {order.shippingAddress.address}, {order.shippingAddress.ward}
</p>
<p className="text-sm text-gray-600">
  {order.shippingAddress.province}
</p>
```

- [ ] **Step 2: Fix `src/app/admin/orders/page.tsx`**

Find this block (around line 141-142):

```typescript
{t("admin.shipTo")} {order.shippingAddress.name},{" "}
{order.shippingAddress.district}, {order.shippingAddress.city}
```

Replace with:

```typescript
{t("admin.shipTo")} {order.shippingAddress.name},{" "}
{order.shippingAddress.ward}, {order.shippingAddress.province}
```

- [ ] **Step 3: Final build — all errors resolved**

```bash
npm run build
```

Expected: Build succeeds with zero TypeScript errors. This is the acceptance check for the entire feature.

---

## Task 10: Manual smoke test

No automated test framework is configured. Verify the feature end-to-end:

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test validation errors**

1. Navigate to `http://localhost:3000/checkout` (sign in if needed, add items to cart)
2. Click "Place Order" without filling anything
3. Expected: Inline error messages appear under each field (name, phone, address, province, ward)

- [ ] **Step 3: Test cascading dropdowns**

1. Select a Province — Ward dropdown should become enabled and populate
2. Change Province — Ward dropdown should reset to empty
3. Select a Ward
4. Expected: No errors on province/ward fields after selecting both

- [ ] **Step 4: Test phone validation**

1. Enter `abc` in the phone field, click Place Order
2. Expected: "Enter a valid phone number" error
3. Enter `+84 912 345 678`, click Place Order
4. Expected: No phone error

- [ ] **Step 5: Test successful order placement**

Fill all fields correctly and place an order. Expected: Order creates successfully (QR or MoMo redirect appears).
