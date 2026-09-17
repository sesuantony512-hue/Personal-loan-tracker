const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateLoan, validateSchedule, buildMissedWeeklyDueDates, buildMissedMonthlyDueDates } = require('../calculations');

test('calculates the supplied changing-schedule example', () => {
  const result = calculateLoan({ total_due: 104, paid: 55, name: 'Loan A' }, [
    { from: 1, to: 35, amount: 1264 }, { from: 36, to: 47, amount: 1186 },
    { from: 48, to: 70, amount: 1100 }, { from: 71, to: 104, amount: 950 }
  ]);
  assert.equal(result.pending, 49);
  assert.equal(result.next_installment, 56);
  assert.equal(result.current_due_amount, 1100);
  assert.equal(result.remaining_total, 48800);
});

test('rejects overlapping or incomplete schedules', () => {
  assert.equal(validateSchedule([{ from: 1, to: 5, amount: 10 }, { from: 5, to: 10, amount: 9 }], 10), 'Schedule ranges must not overlap.');
  assert.equal(validateSchedule([{ from: 2, to: 10, amount: 9 }], 10), 'Schedule must cover every installment from 1 through Total Due.');
});

test('reduces pending installments after a recorded payment', () => {
  const schedule = [{ from: 1, to: 2, amount: 100 }, { from: 3, to: 3, amount: 80 }];
  const beforePayment = calculateLoan({ total_due: 3, paid: 1, name: 'Loan A' }, schedule);
  const afterPayment = calculateLoan({ total_due: 3, paid: beforePayment.paid + 1, name: 'Loan A' }, schedule);
  assert.equal(beforePayment.pending, 2);
  assert.equal(afterPayment.pending, 1);
  assert.equal(afterPayment.next_installment, 3);
  assert.equal(afterPayment.current_due_amount, 80);
  assert.equal(afterPayment.remaining_total, 80);
});

test('builds missed weekly due dates from the last processed day through today', () => {
  assert.deepEqual(buildMissedWeeklyDueDates('2026-09-07', '2026-09-28', 'Monday'), ['2026-09-14', '2026-09-21', '2026-09-28']);
});

test('builds missed monthly due dates using the loan due date and local date boundaries', () => {
  assert.deepEqual(buildMissedMonthlyDueDates('2026-08-10', '2026-09-10', 10), ['2026-09-10']);
});
