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
  `w-full rounded-lg border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-stone-800 dark:text-gray-100 ${
    hasError ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-stone-600"
  }`;

export function ShippingForm({ address, onChange, errors = {} }: ShippingFormProps) {
  const { t } = useLocale();
  const provinces = getProvinces();
  const selectedProvinceCode =
    provinces.find((p) => p.name === address.province)?.code ?? "";
  const wards = selectedProvinceCode ? getWards(selectedProvinceCode) : [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t("shipping.title")}</h2>
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
          <label htmlFor="province-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("shipping.province")}
          </label>
          <select
            id="province-select"
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
          <label htmlFor="ward-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("shipping.ward")}
          </label>
          <select
            id="ward-select"
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
