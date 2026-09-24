const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateLoan, validateSchedule, buildMissedWeeklyDueDates, buildMissedMonthlyDueDates, applyRecordedPayment, nextWeeklyDueDate, nextMonthlyDueDate } = require('../calculations');

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

test('marks a loan as completed once all installments are paid', () => {
  const active = calculateLoan({ total_due: 4, paid: 2, name: 'Loan B' }, [
    { from: 1, to: 2, amount: 200 },
    { from: 3, to: 4, amount: 150 }
  ]);
  const completed = calculateLoan({ total_due: 4, paid: 4, name: 'Loan C' }, [
    { from: 1, to: 2, amount: 200 },
    { from: 3, to: 4, amount: 150 }
  ]);

  assert.equal(active.status, 'Active');
  assert.equal(completed.status, 'Completed');
  assert.equal(completed.pending, 0);
});

test('only includes due dates that have actually arrived and not dates in the future', () => {
  assert.deepEqual(buildMissedWeeklyDueDates('2026-09-21', '2026-09-24', 'Thursday'), ['2026-09-24']);
  assert.deepEqual(buildMissedWeeklyDueDates('2026-09-21', '2026-09-24', 'Friday'), []);
});

test('manual payment advances the scheduled due exactly once', () => {
  const loan = {
    total_due: 5,
    paid: 0,
    due_day: 'Tuesday',
    due_date: null,
    last_processed_due_date: null,
    last_processed_installment: 0,
    type: 'weekly',
    reduction_mode: 'manual',
    created_at: '2026-09-15 00:00:00'
  };

  const updated = applyRecordedPayment(loan, '2026-09-22', 1);
  assert.equal(updated.paid, 1);
  assert.equal(updated.last_processed_due_date, '2026-09-22');
  assert.equal(updated.last_processed_installment, 1);
  assert.equal(nextWeeklyDueDate(updated.last_processed_due_date, updated.due_day, loan.created_at.slice(0, 10), '2026-09-22'), '2026-09-29');
  assert.equal(nextMonthlyDueDate('2026-09-22', 22, '2026-09-15', '2026-09-22'), '2026-10-22');
});
