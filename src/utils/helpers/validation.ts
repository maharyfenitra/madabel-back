/**
 * Common validation helpers
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (French format)
 */
export function isValidPhone(phone: string): boolean {
  // Accept various French phone formats
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate required fields in object
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(String(field));
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate ID parameter
 */
export function isValidId(id: any): boolean {
  const numId = Number(id);
  return !isNaN(numId) && numId > 0 && Number.isInteger(numId);
}

/**
 * Parse and validate ID from params
 */
export function parseId(id: any): number | null {
  if (!isValidId(id)) return null;
  return Number(id);
}

/**
 * Sanitize string input (remove extra whitespace, trim)
 */
export function sanitizeString(str: string | undefined | null): string {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Validate password strength
 */
export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
