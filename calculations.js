const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_LOOKUP = Object.fromEntries(WEEKDAYS.map((name, index) => [name, index]));

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function nextWeeklyDueDate(lastProcessedDueDate, dueDay, fallbackStartISO, referenceISO) {
  if (!dueDay || WEEKDAY_LOOKUP[dueDay] === undefined) return null;
  const anchor = parseLocalDate(lastProcessedDueDate) || parseLocalDate(fallbackStartISO) || parseLocalDate(referenceISO) || new Date();
  let candidate = addDays(anchor, 1);
  while (WEEKDAYS[candidate.getDay()] !== dueDay) candidate = addDays(candidate, 1);
  return formatLocalDate(candidate);
}

function nextMonthlyDueDate(lastProcessedDueDate, dueDate, fallbackStartISO, referenceISO) {
  if (!Number.isInteger(dueDate) || dueDate < 1 || dueDate > 31) return null;
  const anchor = parseLocalDate(lastProcessedDueDate) || parseLocalDate(fallbackStartISO) || parseLocalDate(referenceISO) || new Date();
  let cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  while (true) {
    const monthDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(dueDate, monthDays));
    if (candidate > anchor) return formatLocalDate(candidate);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
}

function buildMissedWeeklyDueDates(lastProcessedDueDate, todayISO, dueDay, fallbackStartISO) {
  if (!dueDay || WEEKDAY_LOOKUP[dueDay] === undefined) return [];
  const end = parseLocalDate(todayISO) || new Date();
  const start = lastProcessedDueDate ? parseLocalDate(lastProcessedDueDate) : (fallbackStartISO ? parseLocalDate(fallbackStartISO) : end);
  if (!start || !end) return [];

  const result = [];
  let cursor = addDays(start, 1);
  while (cursor <= end) {
    if (WEEKDAYS[cursor.getDay()] === dueDay) result.push(formatLocalDate(cursor));
    cursor = addDays(cursor, 1);
  }
  return result;
}

function buildMissedMonthlyDueDates(lastProcessedDueDate, todayISO, dueDate, fallbackStartISO) {
  const end = parseLocalDate(todayISO);
  if (!end || !Number.isInteger(dueDate) || dueDate < 1 || dueDate > 31) return [];

  const start = lastProcessedDueDate ? parseLocalDate(lastProcessedDueDate) : (fallbackStartISO ? parseLocalDate(fallbackStartISO) : end);
  if (!start) return [];

  const result = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= endMonth) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthDays = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(dueDate, monthDays);
    const candidate = formatLocalDate(new Date(year, month, safeDay));

    if (parseLocalDate(candidate) > start && parseLocalDate(candidate) <= end) {
      result.push(candidate);
    }

    cursor = new Date(year, month + 1, 1);
  }
  return result;
}

function validateSchedule(schedule, totalDue) {
  if (!Array.isArray(schedule) || schedule.length === 0) return 'At least one schedule row is required.';
  const normalized = schedule.map((row) => ({ from: Number(row.from), to: Number(row.to), amount: Number(row.amount) }));
  for (const row of normalized) {
    if (!Number.isInteger(row.from) || !Number.isInteger(row.to) || row.from < 1 || row.from > row.to) return 'Schedule ranges must use positive integers, with From less than or equal to To.';
    if (!Number.isFinite(row.amount) || row.amount <= 0) return 'Due Amount must be a positive number.';
  }
  normalized.sort((a, b) => a.from - b.from);
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index].from <= normalized[index - 1].to) return 'Schedule ranges must not overlap.';
  }
  if (totalDue && normalized[0].from !== 1 || totalDue && normalized[normalized.length - 1].to < totalDue) return 'Schedule must cover every installment from 1 through Total Due.';
  return null;
}

function scheduleAmount(schedule, installment) {
  const row = schedule.find((item) => installment >= item.from && installment <= item.to);
  return row ? Number(row.amount) : 0;
}

function calculateLoan(loan, schedule) {
  const totalDue = Number(loan.total_due);
  const paid = Number(loan.paid);
  const pending = Math.max(0, totalDue - paid);
  const nextInstallment = pending > 0 ? paid + 1 : null;
  let remainingTotal = 0;
  for (let installment = nextInstallment; installment && installment <= totalDue; installment += 1) remainingTotal += scheduleAmount(schedule, installment);
  return {
    ...loan,
    total_due: totalDue,
    paid,
    pending,
    next_installment: nextInstallment,
    current_due_amount: nextInstallment ? scheduleAmount(schedule, nextInstallment) : 0,
    remaining_total: remainingTotal,
    status: paid >= totalDue ? 'Completed' : 'Active'
  };
}

function resolveScheduledDueDate(loan, referenceISO = formatLocalDate(new Date())) {
  if (!loan || Number(loan.paid) >= Number(loan.total_due)) return null;
  const start = loan.created_at ? String(loan.created_at).slice(0, 10) : null;
  if (loan.type === 'weekly') {
    return nextWeeklyDueDate(loan.last_processed_due_date, loan.due_day, start, referenceISO);
  }
  return nextMonthlyDueDate(loan.last_processed_due_date, Number(loan.due_date), start, referenceISO);
}

function applyRecordedPayment(loan, paymentDateISO = formatLocalDate(new Date())) {
  if (!loan) return loan;
  const totalDue = Number(loan.total_due || 0);
  const paid = Number(loan.paid || 0);
  if (!totalDue || paid >= totalDue) return { ...loan, paid, last_processed_due_date: loan.last_processed_due_date || null, last_processed_installment: Number(loan.last_processed_installment || 0) };

  const currentDueDate = loan.next_due || resolveScheduledDueDate(loan, paymentDateISO);
  const installment = Number(loan.next_installment || paid + 1);
  return {
    ...loan,
    paid: paid + 1,
    last_processed_due_date: currentDueDate || loan.last_processed_due_date || null,
    last_processed_installment: Number.isInteger(installment) && installment > 0 ? installment : Number(loan.last_processed_installment || 0)
  };
}

function sumBy(items, key) { return items.reduce((total, item) => total + Number(item[key] || 0), 0); }

module.exports = {
  validateSchedule,
  scheduleAmount,
  calculateLoan,
  sumBy,
  buildMissedWeeklyDueDates,
  buildMissedMonthlyDueDates,
  nextWeeklyDueDate,
  nextMonthlyDueDate,
  resolveScheduledDueDate,
  applyRecordedPayment,
  formatLocalDate,
  parseLocalDate,
  addDays
};
