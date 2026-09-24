const test = require('node:test');
const assert = require('node:assert/strict');
const { reminderForLoanOnDate, reminderTemplateVariables } = require('../reminder-utils');

test('finds weekly day-before and due-day reminders', () => {
  const loan = { type: 'weekly', due_day: 'Monday', paid: 0, total_due: 2 };
  assert.deepEqual(reminderForLoanOnDate(loan, '2026-09-20'), { type: 'day_before', dueDate: '2026-09-21' });
  assert.deepEqual(reminderForLoanOnDate(loan, '2026-09-21'), { type: 'due_day', dueDate: '2026-09-21' });
});

test('finds monthly reminders including month-end due dates', () => {
  const loan = { type: 'monthly', due_date: 31, paid: 0, total_due: 2 };
  assert.deepEqual(reminderForLoanOnDate(loan, '2026-02-27'), { type: 'day_before', dueDate: '2026-02-28' });
  assert.deepEqual(reminderForLoanOnDate(loan, '2026-02-28'), { type: 'due_day', dueDate: '2026-02-28' });
});

test('does not create reminders for completed loans and uses the current due amount', () => {
  assert.equal(reminderForLoanOnDate({ type: 'weekly', due_day: 'Monday', paid: 2, total_due: 2 }, '2026-09-21'), null);
  assert.deepEqual(reminderTemplateVariables({ type: 'weekly', name: 'ABC Loan', due_day: 'Monday', current_due_amount: 1200 }, { type: 'day_before' }), {
    loanName: 'ABC Loan', dueLabel: 'Due Day: Monday', dueAmount: '₹1,200', when: 'tomorrow'
  });
});
