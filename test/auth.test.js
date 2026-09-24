const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhoneNumber, validateRegistrationInput, normalizeReductionMode, validateReductionMode } = require('../auth');

test('normalizes a phone number consistently for login and registration', () => {
  assert.equal(normalizePhoneNumber('+91 98765 43210'), '919876543210');
  assert.equal(normalizePhoneNumber('9876543210'), '9876543210');
  assert.equal(normalizePhoneNumber('  91234-56789  '), '9123456789');
});

test('rejects invalid or duplicate registration input before creating an account', () => {
  const emptyNumber = validateRegistrationInput({ phoneNumber: '   ', password: 'test123', confirmPassword: 'test123' });
  assert.equal(emptyNumber, 'Phone number cannot be empty.');

  const mismatch = validateRegistrationInput({ phoneNumber: '9876543210', password: 'test123', confirmPassword: 'test124' });
  assert.equal(mismatch, 'Passwords do not match.');

  const invalid = validateRegistrationInput({ phoneNumber: '12345', password: 'test123', confirmPassword: 'test123' });
  assert.equal(invalid, 'Please enter a valid phone number.');
});

test('normalizes and validates the per-loan reduction mode', () => {
  assert.equal(normalizeReductionMode('AUTO'), 'auto');
  assert.equal(normalizeReductionMode('manual'), 'manual');
  assert.equal(normalizeReductionMode('random'), null);
  assert.equal(validateReductionMode('auto'), null);
  assert.equal(validateReductionMode('manual'), null);
  assert.equal(validateReductionMode('random'), 'Reduction mode must be either auto or manual.');
  assert.equal(validateReductionMode(null), 'Reduction mode must be either auto or manual.');
});
