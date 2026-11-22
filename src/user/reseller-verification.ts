/**
 * Reseller profile verification.
 *
 * A reseller is "verified" as soon as every required profile field is filled.
 * Nothing is stored: the status is derived from the user row each time, so it
 * can never go stale. Only verified resellers may place orders.
 */

export interface VerificationField {
  key: string;
  label: string;
}

export interface VerificationStatus {
  isVerified: boolean;
  completed: number;
  total: number;
  missing: VerificationField[];
}

/** Required fields, in the order the profile form shows them. */
export const REQUIRED_PROFILE_FIELDS: VerificationField[] = [
  { key: 'imageUrl', label: 'প্রোফাইল ছবি' },
  { key: 'name', label: 'নাম' },
  { key: 'phone', label: 'মোবাইল নম্বর' },
  { key: 'nidNumber', label: 'NID নম্বর' },
  { key: 'pageName', label: 'পেজ / শপের নাম' },
  { key: 'presentDistrict', label: 'জেলা' },
  { key: 'presentThana', label: 'থানা / উপজেলা' },
  { key: 'presentAddress', label: 'পূর্ণ ঠিকানা' },
];

/** Bangladeshi NID: 10 (smart card), 13 or 17 digits. */
export const NID_PATTERN = /^(\d{10}|\d{13}|\d{17})$/;

type ProfileLike = Partial<Record<string, unknown>>;

function filled(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

export function getVerification(user: ProfileLike | null | undefined): VerificationStatus {
  const missing = REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = user?.[field.key];
    if (field.key === 'nidNumber') return !(typeof value === 'string' && NID_PATTERN.test(value));
    return !filled(value);
  });

  return {
    isVerified: missing.length === 0,
    completed: REQUIRED_PROFILE_FIELDS.length - missing.length,
    total: REQUIRED_PROFILE_FIELDS.length,
    missing,
  };
}
