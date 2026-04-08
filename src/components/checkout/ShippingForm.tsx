"use client";

import { Input } from "@/components/ui/Input";
import { useLocale } from "@/lib/i18n/locale-context";
import type { ShippingAddress } from "@/lib/types";

interface ShippingFormProps {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
}

export function ShippingForm({ address, onChange }: ShippingFormProps) {
  const { t } = useLocale();
  const update = (field: keyof ShippingAddress, value: string) => {
    onChange({ ...address, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">{t("shipping.title")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("shipping.fullName")}
          value={address.name}
          onChange={(e) => update("name", e.target.value)}
          required
        />
        <Input
          label={t("shipping.phone")}
          value={address.phone}
          onChange={(e) => update("phone", e.target.value)}
          required
        />
      </div>
      <Input
        label={t("shipping.address")}
        value={address.address}
        onChange={(e) => update("address", e.target.value)}
        placeholder={t("shipping.addressPlaceholder")}
        required
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label={t("shipping.district")}
          value={address.district}
          onChange={(e) => update("district", e.target.value)}
          required
        />
        <Input
          label={t("shipping.city")}
          value={address.city}
          onChange={(e) => update("city", e.target.value)}
          required
        />
        <Input
          label={t("shipping.province")}
          value={address.province}
          onChange={(e) => update("province", e.target.value)}
          required
        />
      </div>
    </div>
  );
}
