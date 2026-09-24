function normalizePhoneNumber(value) {
  const digits = String(value ?? '').replace(/\D+/g, '');
  if (!digits) return '';
  return digits.replace(/^0+/, '');
}

function normalizeReductionMode(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'auto' || normalized === 'manual') return normalized;
  return null;
}

function validateRegistrationInput({ phoneNumber, password, confirmPassword }) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhone) return 'Phone number cannot be empty.';
  if (!String(password ?? '').trim()) return 'Password cannot be empty.';
  if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
    return 'Please enter a valid phone number.';
  }
  if (confirmPassword !== undefined && String(confirmPassword) !== String(password)) {
    return 'Passwords do not match.';
  }
  return null;
}

function validateReductionMode(value) {
  const normalized = normalizeReductionMode(value);
  if (normalized === null) {
    return 'Reduction mode must be either auto or manual.';
  }
  return null;
}

module.exports = { normalizePhoneNumber, validateRegistrationInput, normalizeReductionMode, validateReductionMode };
