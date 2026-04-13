// src/lib/env.ts

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  momo: {
    partnerCode: requireEnv("MOMO_PARTNER_CODE"),
    accessKey: requireEnv("MOMO_ACCESS_KEY"),
    secretKey: requireEnv("MOMO_SECRET_KEY"),
    endpoint: requireEnv("MOMO_ENDPOINT"),
  },
  vietqr: {
    bankId: requireEnv("VIETQR_BANK_ID"),
    accountNumber: requireEnv("VIETQR_ACCOUNT_NUMBER"),
    accountName: requireEnv("VIETQR_ACCOUNT_NAME"),
  },
  baseUrl: requireEnv("NEXT_PUBLIC_BASE_URL"),
};
