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

const _provincesCache: VnProvince[] = provinces.map(({ code, name }) => ({ code, name }));

export function getProvinces(): VnProvince[] {
  return _provincesCache;
}

export function getWards(provinceCode: string): VnWard[] {
  const province = provinces.find((p) => p.code === provinceCode);
  return province ? province.wards : [];
}
