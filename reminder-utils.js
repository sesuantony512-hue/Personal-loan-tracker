const { addDays, formatLocalDate, parseLocalDate } = require('./calculations');

function reminderForLoanOnDate(loan, todayISO) {
  if (Number(loan.paid) >= Number(loan.total_due)) return null;
  const today = parseLocalDate(todayISO);
  if (!today) return null;
  const tomorrowISO = formatLocalDate(addDays(today, 1));

  if (loan.type === 'weekly') {
    const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
    const tomorrowWeekday = addDays(today, 1).toLocaleDateString('en-US', { weekday: 'long' });
    if (weekday === loan.due_day) return { type: 'due_day', dueDate: todayISO };
    if (tomorrowWeekday === loan.due_day) return { type: 'day_before', dueDate: tomorrowISO };
    return null;
  }

  const monthlyDue = (iso) => {
    const date = parseLocalDate(iso);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return date.getDate() === Math.min(Number(loan.due_date), lastDay);
  };
  if (monthlyDue(todayISO)) return { type: 'due_day', dueDate: todayISO };
  if (monthlyDue(tomorrowISO)) return { type: 'day_before', dueDate: tomorrowISO };
  return null;
}

function reminderTemplateVariables(loan, reminder) {
  const isWeekly = loan.type === 'weekly';
  return {
    loanName: loan.name,
    dueLabel: isWeekly ? `Due Day: ${loan.due_day}` : `Due Date: ${loan.due_date}`,
    dueAmount: `₹${Number(loan.current_due_amount).toLocaleString('en-IN')}`,
    when: reminder.type === 'due_day' ? 'today' : 'tomorrow'
  };
}

module.exports = { reminderForLoanOnDate, reminderTemplateVariables };
