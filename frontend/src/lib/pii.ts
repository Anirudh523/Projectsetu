// PII detection regex patterns
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_PATTERN = /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
const SOCIAL_SECURITY_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_PATTERN = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
const ZIP_CODE_PATTERN = /\b\d{5}(-\d{4})?\b/g;

export function containsPii(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Check for email addresses
  if (EMAIL_PATTERN.test(text)) {
    return true;
  }

  // Check for phone numbers
  if (PHONE_PATTERN.test(text)) {
    return true;
  }

  // Check for SSN
  if (SOCIAL_SECURITY_PATTERN.test(text)) {
    return true;
  }

  // Check for credit card numbers
  if (CREDIT_CARD_PATTERN.test(text)) {
    return true;
  }

  return false;
}

export function maskPii(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let masked = text;

  // Mask email addresses
  masked = masked.replace(EMAIL_PATTERN, '[email redacted]');

  // Mask phone numbers
  masked = masked.replace(PHONE_PATTERN, '[phone redacted]');

  // Mask SSN
  masked = masked.replace(SOCIAL_SECURITY_PATTERN, '[SSN redacted]');

  // Mask credit card
  masked = masked.replace(CREDIT_CARD_PATTERN, '[card redacted]');

  return masked;
}
