// src/lib/env.ts

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Getters so env vars are validated at request time, not at module load time.
// This avoids Next.js static analysis evaluating requireEnv before .env.local is loaded.
export const env = {
  get momo() {
    return {
      partnerCode: requireEnv("MOMO_PARTNER_CODE"),
      accessKey: requireEnv("MOMO_ACCESS_KEY"),
      secretKey: requireEnv("MOMO_SECRET_KEY"),
      endpoint: requireEnv("MOMO_ENDPOINT"),
    };
  },
  get vietqr() {
    return {
      bankId: requireEnv("VIETQR_BANK_ID"),
      accountNumber: requireEnv("VIETQR_ACCOUNT_NUMBER"),
      accountName: requireEnv("VIETQR_ACCOUNT_NAME"),
    };
  },
  get baseUrl() {
    return requireEnv("NEXT_PUBLIC_BASE_URL");
  },
};
