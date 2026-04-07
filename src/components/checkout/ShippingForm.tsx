"use client";

import { Input } from "@/components/ui/Input";
import type { ShippingAddress } from "@/lib/types";

interface ShippingFormProps {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
}

export function ShippingForm({ address, onChange }: ShippingFormProps) {
  const update = (field: keyof ShippingAddress, value: string) => {
    onChange({ ...address, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Shipping Address</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full Name"
          value={address.name}
          onChange={(e) => update("name", e.target.value)}
          required
        />
        <Input
          label="Phone Number"
          value={address.phone}
          onChange={(e) => update("phone", e.target.value)}
          required
        />
      </div>
      <Input
        label="Address"
        value={address.address}
        onChange={(e) => update("address", e.target.value)}
        placeholder="House number, street name"
        required
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="District"
          value={address.district}
          onChange={(e) => update("district", e.target.value)}
          required
        />
        <Input
          label="City"
          value={address.city}
          onChange={(e) => update("city", e.target.value)}
          required
        />
        <Input
          label="Province"
          value={address.province}
          onChange={(e) => update("province", e.target.value)}
          required
        />
      </div>
    </div>
  );
}
