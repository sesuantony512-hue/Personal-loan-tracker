const state = {
  page: location.hash.slice(1) || 'home',
  lang: localStorage.getItem('ledgerly-lang') || 'en',
  loans: [],
  interest: [],
  borrows: [],
  tab: 'weekly',
  authUser: null
};

const T = {
  en: {
    home: 'Home', loans: 'Loans', interest: 'Interest', borrow: 'Hand Borrow', settings: 'Language', welcome: 'Good morning', overview: 'Your money overview', loan: 'Loan', interestCard: 'Interest', borrowCard: 'Hand Borrow', loanCount: 'active loans', remaining: 'remaining to pay', total: 'Total', totalAmount: 'Total amount', totalDue: 'Total due amount', borrowed: 'borrowed', addLoan: '+ Add Loan', addInterest: '+ Add Interest', addBorrow: '+ Add Hand Borrow', weekly: 'Weekly', monthly: 'Monthly', name: 'Name', loanName: 'Loan name', type: 'Type', dueTotal: 'Total due', paid: 'Paid', pending: 'Pending', dueDay: 'Due day', dueDate: 'Due date', nextDue: 'Next due', dueAmount: 'Due amount', remainingTotal: 'Remaining total', amount: 'Amount', borrowedDate: 'Borrowed date', actions: 'Actions', emptyLoans: 'No loans added yet.', emptyInterest: 'No interest records yet.', emptyBorrow: 'No hand borrows yet.', addFirst: 'Add your first record to get started.', save: 'Save record', cancel: 'Cancel', schedule: 'Due amount schedule', from: 'From', to: 'To', addSchedule: '+ Add schedule', view: 'View details', edit: 'Edit', payment: 'Record payment', payNow: 'Pay now', delete: 'Delete', settings: 'Settings', reductionMode: 'Reduction Mode', autoReduction: 'Auto Reduction', manualReduction: 'Manual', reductionModeHint: 'Select how this loan is reduced.', autoReductionDesc: 'Due is processed automatically on the scheduled date.', manualReductionDesc: 'Due is processed only when you record a payment.', paymentBlockedAuto: 'This loan is set to Auto Reduction. Payments are processed automatically when the due date is reached. Change Reduction Mode to Manual in Settings to record payments manually.', confirm: 'Are you sure you want to delete this record?', note: 'Optional note', paymentDate: 'Payment date', amountPaid: 'Amount paid', history: 'Payment history', automatic: 'Automatic', manual: 'Manual', noPayments: 'No payments recorded.', next: 'Next installment', close: 'Close', saved: 'Record saved.', deleted: 'Record deleted.', error: 'Something went wrong.', required: 'Please complete the required fields.', login: 'Login', phoneNumber: 'Phone Number', password: 'Password', createAccount: 'Create Account', confirmPassword: 'Confirm Password', createPassword: 'Create Password', logout: 'Logout', invalidLogin: 'Invalid phone number or password.', welcomeBack: 'Welcome back', accountCreated: 'Account created successfully.', passwordMismatch: 'Passwords do not match.', duplicatePhone: 'An account with this phone number already exists.', phoneEmpty: 'Phone number cannot be empty.', passwordEmpty: 'Password cannot be empty.', invalidPhone: 'Please enter a valid phone number.', alreadyHaveAccount: 'Already have an account?', newUserPrompt: 'New user?', loginLink: 'Login', createNewAccount: 'Create Account', loginButton: 'Login', registerButton: 'Create Account', registerTitle: 'Create Account', noAccountQuestion: 'New user?', hasAccountQuestion: 'Already have an account?', mainTitle: 'Loan Tracker', verifyPassword: 'Verify Your Password', verifyPasswordEdit: 'Enter your account password to edit this loan.', verifyPasswordDelete: 'Enter your account password to delete this loan.', incorrectPassword: 'Incorrect password. You cannot edit this loan.', incorrectPasswordDelete: 'Incorrect password. You cannot delete this loan.', showPassword: 'Show', hidePassword: 'Hide'
  },
  ta: {
    home: 'முகப்பு', loans: 'கடன்கள்', interest: 'வட்டி', borrow: 'கை கடன்', settings: 'மொழி', welcome: 'வணக்கம்', overview: 'உங்கள் பண நிலவரம்', loan: 'கடன்', interestCard: 'வட்டி', borrowCard: 'கை கடன்', loanCount: 'செயலில் உள்ள கடன்கள்', remaining: 'செலுத்த வேண்டியது', total: 'மொத்தம்', totalAmount: 'மொத்த தொகை', totalDue: 'மொத்த நிலுவை', borrowed: 'கடன் பெற்றது', addLoan: '+ கடன் சேர்', addInterest: '+ வட்டி சேர்', addBorrow: '+ கை கடன் சேர்', weekly: 'வாராந்திரம்', monthly: 'மாதாந்திரம்', name: 'பெயர்', loanName: 'கடன் பெயர்', type: 'வகை', dueTotal: 'மொத்தத் தொகை', paid: 'செலுத்தப்பட்டது', pending: 'மீதமுள்ள', dueDay: 'கடன் நாள்', dueDate: 'கடன் தேதி', nextDue: 'அடுத்த தேதி', dueAmount: 'நிலுவை தொகை', remainingTotal: 'மீதமுள்ள தொகை', amount: 'தொகை', borrowedDate: 'கடன் எடுத்த தேதி', actions: 'செயல்கள்', emptyLoans: 'எந்த கடனும் சேர்க்கப்படவில்லை.', emptyInterest: 'எந்த வட்டி பதிவும் இல்லை.', emptyBorrow: 'எந்த கை கடன் பதிவும் இல்லை.', addFirst: 'உங்கள் முதல் பதிவை சேர்க்கவும்.', save: 'பதிவு செய்', cancel: 'ரத்து செய்', schedule: 'நிலுவை அட்டவணை', from: 'இருந்து', to: 'வரை', addSchedule: '+ அட்டவணை சேர்', view: 'விவரங்களைப் பார்க்க', edit: 'திருத்து', payment: 'கட்டணம் பதிவு', payNow: 'இப்போது செலுத்து', delete: 'நீக்கு', settings: 'அமைப்புகள்', reductionMode: 'குறைப்பு முறை', autoReduction: 'தானியங்கி குறைப்பு', manualReduction: 'கையேடு', reductionModeHint: 'இந்த கடனின் குறைப்பு முறையை தேர்ந்தெடுக்கவும்.', autoReductionDesc: 'நிர்ணயிக்கப்பட்ட தேதியில் கடன் தானாகவே குறைக்கப்படும்.', manualReductionDesc: 'கட்டணம் பதிவு செய்யப்படும் வரை கடன் குறைக்கப்படாது.', paymentBlockedAuto: 'இந்த கடன் தானியங்கி குறைப்பு முறையில் உள்ளது. தேதியை அடைந்ததும் கட்டணம் தானாகவே செயலாக்கப்படும். கைமுறை பதிவு செய்ய அமைப்புகளை மாற்றவும்.', confirm: 'இந்த பதிவை நீக்க விரும்புகிறீர்களா?', note: 'விருப்ப குறிப்பு', paymentDate: 'கட்டண தேதி', amountPaid: 'செலுத்திய தொகை', history: 'கட்டண வரலாறு', automatic: 'தானியங்கி', manual: 'கையேடு', noPayments: 'பணம் பதிவு செய்யப்படவில்லை.', next: 'அடுத்த தவணை', close: 'மூடு', saved: 'பதிவு செய்யப்பட்டு விட்டது.', deleted: 'பதிவு நீக்கப்பட்டது.', error: 'ஏதோ தவறு ஏற்பட்டது.', required: 'தேவையான தகவல்களை நிரப்பவும்.', login: 'உள்நுழை', phoneNumber: 'தொலைபேசி எண்', password: 'கடவுச்சொல்', createAccount: 'கணக்கு உருவாக்கு', confirmPassword: 'கடவுச்சொல் உறுதிப்படுத்துக', createPassword: 'கடவுச்சொல்லை உருவாக்குக', logout: 'வெளியேறு', invalidLogin: 'தவறான தொலைபேசி எண் அல்லது கடவுச்சொல்.', welcomeBack: 'மீண்டும் வருக', accountCreated: 'கணக்கு உருவாக்கப்பட்டது.', passwordMismatch: 'கடவுச்சொற்கள் பொருந்தவில்லை.', duplicatePhone: 'இந்த தொலைபேசி எண்ணுடன் ஏற்கனவே கணக்கு உள்ளது.', phoneEmpty: 'தொலைபேசி எண் காலியாக இருக்க முடியாது.', passwordEmpty: 'கடவுச்சொல் காலியாக இருக்க முடியாது.', invalidPhone: 'சரியான தொலைபேசி எண்ணை உள்ளிடவும்.', alreadyHaveAccount: 'ஏற்கனவே கணக்கு உள்ளதா?', newUserPrompt: 'புதிய பயனர்?', loginLink: 'உள்நுழை', createNewAccount: 'கணக்கு உருவாக்கு', loginButton: 'உள்நுழை', registerButton: 'கணக்கு உருவாக்கு', registerTitle: 'கணக்கு உருவாக்கு', noAccountQuestion: 'புதிய பயனர்?', hasAccountQuestion: 'ஏற்கனவே கணக்கு உள்ளதா?', mainTitle: 'Loan Tracker'
  }
};

Object.assign(T.en, {
  on: 'ON', off: 'OFF'
});
Object.assign(T.ta, {
  on: 'ஆன்', off: 'ஆஃப்'
});

const t = (key) => T[state.lang]?.[key] || key;
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value) => value ? new Intl.DateTimeFormat('en-IN').format(new Date(value + 'T00:00:00')) : '-';
const ordinal = (value) => {
  const number = Number(value);
  const suffix = number % 100 >= 11 && number % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[number % 10] || 'th');
  return `${number}${suffix}`;
};
const scheduleValue = (loan) => loan.type === 'weekly' ? loan.due_day : ordinal(loan.due_date);

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const body = response.status === 204 ? null : (contentType.includes('application/json') ? await response.json() : await response.text());

  if (!response.ok) {
    const message = (body && typeof body === 'object' && body.error) ? body.error : t('error');
    throw new Error(message);
  }

  return body;
}

async function load() {
  if (!state.authUser) return;
  [state.loans, state.interest, state.borrows] = await Promise.all([
    api('/api/loans'),
    api('/api/interest'),
    api('/api/hand-borrow')
  ]);
  render();
}

function registerNavigation() {
  const navContainer = document.querySelector('#nav');
  if (!navContainer) return;

  navContainer.innerHTML = [['home', '⌂', t('home')], ['loans', '▣', t('loans')], ['interest', '◌', t('interest')], ['borrow', '↗', t('borrow')]].map(([id, icon, label]) => `
    <a class="nav-item ${state.page === id ? 'active' : ''}" href="#${id}">
      <span>${icon}</span>${label}
    </a>
  `).join('');

  const footer = document.querySelector('#sidebar-footer');
  if (footer) {
    footer.innerHTML = `
      <button class="settings-button" id="language-button">◉ <span id="language-label">${state.lang === 'en' ? 'English' : 'தமிழ்'}</span></button>
      <button class="settings-button logout-button" id="logout-button">${t('logout')}</button>
      <small>Private money, clearly tracked.</small>
    `;
  }

  const languageButton = document.querySelector('#language-button');
  if (languageButton) {
    languageButton.onclick = () => {
      state.lang = state.lang === 'en' ? 'ta' : 'en';
      localStorage.setItem('ledgerly-lang', state.lang);
      registerNavigation();
      render();
    };
  }

  const logoutButton = document.querySelector('#logout-button');
  if (logoutButton) {
    logoutButton.onclick = handleLogout;
  }
}

function heading(eyebrow, title, desc, action = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${desc}</p></div>${action}</div>`;
}

function home() {
  const remaining = state.loans.reduce((n, l) => n + l.remaining_total, 0);
  return heading(t('welcome'), t('overview'), 'A quiet view of what is moving through your life.') + `
    <div class="metrics">
      <a class="metric-link metric" href="#loans"><div class="metric-label">${t('loan')}</div><div class="metric-value">${state.loans.length}</div><div class="muted">${t('loanCount')} · ${money(remaining)} ${t('remaining')}</div></a>
      <a class="metric-link metric" href="#interest"><div class="metric-label">${t('interestCard')}</div><div class="metric-value">${money(state.interest.reduce((n, x) => n + Number(x.amount), 0))}</div><div class="muted">${money(state.interest.reduce((n, x) => n + Number(x.due_amount), 0))} ${t('totalDue')}</div></a>
      <a class="metric-link metric" href="#borrow"><div class="metric-label">${t('borrowCard')}</div><div class="metric-value">${money(state.borrows.reduce((n, x) => n + Number(x.amount), 0))}</div><div class="muted">${t('borrowed')}</div></a>
    </div>
    <h2 class="section-title">${t('loans')}</h2>
    <div class="panel">${state.loans.length ? `<div class="table-wrap"><table class="data-table"><tbody>${state.loans.slice(0, 4).map(loanRow).join('')}</tbody></table></div>` : `<div class="empty"><strong>${t('emptyLoans')}</strong>${t('addFirst')}</div>`}</div>
  `;
}

function loanRow(l) {
  const reductionMode = (l.reduction_mode || l.reductionMode || 'auto');
  return `<tr><td><strong>${esc(l.name)}</strong><div class="muted">${l.type === 'weekly' ? t('weekly') : t('monthly')}</div><div class="muted">${t('reductionMode')}: ${reductionMode === 'auto' ? t('autoReduction') : t('manualReduction')}</div></td><td>${l.total_due}</td><td>${l.paid}</td><td>${l.pending}</td><td>${esc(scheduleValue(l))}</td><td>${date(l.next_due)}</td><td class="money">${money(l.current_due_amount)}</td><td class="money">${money(l.remaining_total)}</td><td class="actions"><button class="ghost" data-action="payment" data-id="${l.id}" ${l.pending === 0 ? 'disabled' : ''}>${t('payNow')}</button><span class="action-menu-wrap"><button class="more" data-menu="loan-${l.id}" aria-label="${t('actions')}">⋮</button>${menu('loan', l.id)}</span></td></tr>`;
}

function menu(kind, id) {
  return `<div class="menu" id="menu-${kind}-${id}"><button data-action="view" data-id="${id}" data-kind="${kind}">${t('view')}</button><button data-action="edit" data-id="${id}" data-kind="${kind}">${t('edit')}</button>${kind === 'loan' ? `<button data-action="settings" data-id="${id}" data-kind="${kind}">${t('settings')}</button>` : ''}${kind === 'loan' ? `<button data-action="payment" data-id="${id}" data-kind="${kind}">${t('payment')}</button>` : ''}<button class="danger" data-action="delete" data-kind="${kind}" data-id="${id}">${t('delete')}</button></div>`;
}

function loans() {
  const filtered = state.loans.filter((l) => l.type === state.tab);
  return heading(t('loans'), t('loans'), 'Weekly and monthly loans, with the real remaining balance.', `<button class="primary" data-action="add-loan">${t('addLoan')}</button>`) + `
    <div class="tabs"><button class="tab ${state.tab === 'weekly' ? 'active' : ''}" data-tab="weekly">${t('weekly')} (${state.loans.filter((l) => l.type === 'weekly').length})</button><button class="tab ${state.tab === 'monthly' ? 'active' : ''}" data-tab="monthly">${t('monthly')} (${state.loans.filter((l) => l.type === 'monthly').length})</button></div>
    <div class="panel">${filtered.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('name')}</th><th>${t('dueTotal')}</th><th>${t('paid')}</th><th>${t('pending')}</th><th>${state.tab === 'weekly' ? t('dueDay') : t('dueDate')}</th><th>${t('nextDue')}</th><th>${t('dueAmount')}</th><th>${t('remainingTotal')}</th><th></th></tr></thead><tbody>${filtered.map(loanRow).join('')}</tbody></table></div><div class="subtle-total"><span>${t('total')}</span><span>${money(filtered.reduce((n, l) => n + l.remaining_total, 0))}</span></div>` : `<div class="empty"><strong>${t('emptyLoans')}</strong>${t('addFirst')}</div>`}</div>
  `;
}

function collection(kind, items) {
  const isInterest = kind === 'interest';
  const title = isInterest ? t('interest') : t('borrow');
  return heading(title, title, 'Keep the details separate, simple, and useful.', `<button class="primary" data-action="add-${kind}">${isInterest ? t('addInterest') : t('addBorrow')}</button>`) + `
    <div class="panel">${items.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('name')}</th>${isInterest ? `<th>${t('amount')}</th><th>${t('dueDate')}</th><th>${t('dueAmount')}</th>` : `<th>${t('borrowedDate')}</th><th>${t('dueDate')}</th><th>${t('amount')}</th>`}<th></th></tr></thead><tbody>${items.map((x) => `<tr><td><strong>${esc(x.name)}</strong></td>${isInterest ? `<td class="money">${money(x.amount)}</td><td>${date(x.due_date)}</td><td class="money">${money(x.due_amount)}</td>` : `<td>${date(x.borrowed_date)}</td><td>${date(x.due_date)}</td><td class="money">${money(x.amount)}</td>`}<td class="actions"><button class="more" data-menu="${kind}-${x.id}">⋮</button>${menu(kind, x.id)}</td></tr>`).join('')}</tbody></table></div><div class="subtle-total"><span>${isInterest ? t('totalAmount') : t('total')}</span><span>${money(items.reduce((n, x) => n + Number(x.amount), 0))}</span></div>${isInterest ? `<div class="subtle-total"><span>${t('totalDue')}</span><span>${money(items.reduce((n, x) => n + Number(x.due_amount), 0))}</span></div>` : ''}` : `<div class="empty"><strong>${isInterest ? t('emptyInterest') : t('emptyBorrow')}</strong>${t('addFirst')}</div>`}</div>
  `;
}

function esc(value) {
  return String(value).replace(/[&<>\"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}

function bindMenus() {
  document.querySelectorAll('[data-menu]').forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      const key = button.dataset.menu;
      const menuElement = document.querySelector(`#menu-${key}`);
      if (!menuElement) return;
      const wasOpen = menuElement.classList.contains('open');
      document.querySelectorAll('.menu').forEach((item) => item.classList.remove('open'));
      if (!wasOpen) menuElement.classList.add('open');
    };
  });

  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.onclick = () => {
      state.tab = button.dataset.tab;
      render();
    };
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.onclick = () => action(button.dataset.action, button.dataset.id, button.dataset.kind);
  });
}

function action(kind, id, collectionKind) {
  if (kind === 'add-loan') return loanModal();
  if (kind === 'add-interest') return simpleModal('interest');
  if (kind === 'add-borrow') return simpleModal('borrow');
  if (kind === 'view') return detailModal(id);
  if (kind === 'edit') {
    if (collectionKind === 'loan') {
      return requireLoanPasswordVerification('edit', id, () => loanModal(id));
    }
    return simpleModal(collectionKind, id);
  }
  if (kind === 'settings') return loanSettingsModal(id);
  if (kind === 'payment') return paymentModal(id);
  if (kind === 'delete') {
    if (collectionKind === 'loan') {
      return requireLoanPasswordVerification('delete', id, () => {
        if (!confirm(t('confirm'))) return;
        return remove(collectionKind, id, true);
      });
    }
    return remove(collectionKind, id);
  }
}

function requireLoanPasswordVerification(action, id, onSuccess) {
  openModal(t('verifyPassword'), `<form id="verify-password-form"><p class="muted">${action === 'edit' ? t('verifyPasswordEdit') : t('verifyPasswordDelete')}</p><div class="field"><label>${t('password')}</label><div class="password-input-wrap"><input id="verify-password-input" name="password" type="password" required><button type="button" class="ghost small" id="toggle-password-visibility">${t('showPassword')}</button></div></div><div id="verify-password-error" class="error"></div><div class="form-actions"><button type="button" class="ghost" data-close>${t('cancel')}</button><button class="primary" id="verify-password-submit">${t('verifyPassword')}</button></div></form>`);

  document.querySelectorAll('[data-close]').forEach((button) => { button.onclick = closeModal; });

  const passwordInput = document.querySelector('#verify-password-input');
  const toggleButton = document.querySelector('#toggle-password-visibility');
  const submitButton = document.querySelector('#verify-password-submit');
  const errorBox = document.querySelector('#verify-password-error');

  toggleButton.onclick = () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleButton.textContent = isPassword ? t('hidePassword') : t('showPassword');
  };

  document.querySelector('#verify-password-form').onsubmit = async (event) => {
    event.preventDefault();
    const password = passwordInput.value;
    if (!password.trim()) {
      errorBox.textContent = 'Password is required.';
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = t('verifyPassword');
    errorBox.textContent = '';

    try {
      const response = await api('/api/auth/verify-password', {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      if (!response.success) {
        throw new Error(action === 'edit' ? t('incorrectPassword') : t('incorrectPasswordDelete'));
      }

      closeModal();
      onSuccess();
    } catch (error) {
      passwordInput.value = '';
      passwordInput.focus();
      errorBox.textContent = error.message || (action === 'edit' ? t('incorrectPassword') : t('incorrectPasswordDelete'));
    } finally {
      submitButton.disabled = false;
    }
  };
}

function openModal(title, body) {
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${title}</h2><button class="close" data-close>×</button></div>${body}</div></div>`;
  document.querySelector('[data-close]').onclick = closeModal;
  document.querySelector('.modal-backdrop').onclick = (event) => {
    if (event.target.classList.contains('modal-backdrop')) closeModal();
  };
}

function closeModal() {
  document.querySelector('#modal-root').innerHTML = '';
}

function loanSettingsModal(id) {
  const loan = state.loans.find((x) => x.id == id);
  const currentMode = (loan.reduction_mode || loan.reductionMode || 'auto');

  openModal(t('reductionMode'), `<form id="loan-settings-form"><div class="field full"><label>${t('reductionMode')}</label><div class="switcher"><label><input type="radio" name="reductionMode" value="auto" ${currentMode === 'auto' ? 'checked' : ''} required>${t('autoReduction')}</label><label><input type="radio" name="reductionMode" value="manual" ${currentMode === 'manual' ? 'checked' : ''}>${t('manualReduction')}</label></div><small class="muted">${t('reductionModeHint')}</small></div><div id="form-error" class="error"></div><div class="form-actions"><button type="button" class="ghost" data-close>${t('cancel')}</button><button class="primary">${t('save')}</button></div></form>`);

  document.querySelector('#loan-settings-form').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.target;
    const selectedMode = form.querySelector('input[name="reductionMode"]:checked')?.value;
    if (!selectedMode) return;
    const payload = {
      ...loan,
      name: loan.name,
      type: loan.type,
      totalDue: loan.total_due,
      paid: loan.paid,
      dueDay: loan.due_day,
      dueDate: loan.due_date,
      schedule: loan.schedule,
      reductionMode: selectedMode
    };

    try {
      await api(`/api/loans/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      closeModal();
      toast(t('saved'));
      await load();
    } catch (error) {
      document.querySelector('#form-error').textContent = error.message;
    }
  };
}

function loanModal(id) {
  const loan = id ? state.loans.find((x) => x.id == id) : { name: '', type: 'weekly', total_due: '', paid: 0, due_day: 'Monday', due_date: 16, reduction_mode: 'auto', schedule: [{ from: 1, to: '', amount: '' }] };
  const schedule = loan.schedule || [];
  const reductionMode = (loan.reduction_mode || loan.reductionMode || 'auto');

  openModal(id ? t('edit') : t('addLoan'), `<form id="loan-form"><div class="switcher"><label><input type="radio" name="type" value="weekly" ${loan.type === 'weekly' ? 'checked' : ''}>${t('weekly')}</label><label><input type="radio" name="type" value="monthly" ${loan.type === 'monthly' ? 'checked' : ''}>${t('monthly')}</label></div><div class="form-grid"><div class="field"><label>${t('loanName')}</label><input name="name" required value="${esc(loan.name)}"></div><div class="field"><label>${t('dueTotal')}</label><input name="totalDue" type="number" min="1" required value="${loan.total_due}"></div><div class="field"><label>${t('paid')}</label><input name="paid" type="number" min="0" required value="${loan.paid}"></div><div class="field" id="frequency-field"></div></div><div class="field full"><label>${t('reductionMode')}</label><div class="switcher"><label><input type="radio" name="reductionMode" value="auto" ${reductionMode === 'auto' ? 'checked' : ''} required>${t('autoReduction')}</label><label><input type="radio" name="reductionMode" value="manual" ${reductionMode === 'manual' ? 'checked' : ''}>${t('manualReduction')}</label></div></div><div class="schedule-head"><strong>${t('schedule')}</strong><button type="button" class="ghost" id="add-schedule">${t('addSchedule')}</button></div><div id="schedule-rows">${schedule.map(scheduleRow).join('')}</div><div id="form-error" class="error"></div><div class="form-actions"><button type="button" class="ghost" data-close>${t('cancel')}</button><button class="primary">${t('save')}</button></div></form>`);

  const form = document.querySelector('#loan-form');
  const updateFrequency = () => {
    const type = form.querySelector('input[name="type"]:checked').value;
    document.querySelector('#frequency-field').innerHTML = type === 'weekly' ? `<label>${t('dueDay')}</label><select name="dueDay">${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => `<option ${loan.due_day === day ? 'selected' : ''}>${day}</option>`).join('')}</select>` : `<label>${t('dueDate')}</label><input name="dueDate" type="number" min="1" max="31" required value="${loan.due_date || 16}">`;
  };

  form.querySelectorAll('[name="type"]').forEach((input) => { input.onchange = updateFrequency; });
  updateFrequency();

  document.querySelector('#add-schedule').onclick = () => {
    const rows = document.querySelector('#schedule-rows');
    rows.insertAdjacentHTML('beforeend', scheduleRow({ from: '', to: '', amount: '' }));
  };

  form.onsubmit = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form));
    const selectedMode = form.querySelector('input[name="reductionMode"]:checked')?.value;
    if (!selectedMode) return;
    payload.type = form.querySelector('input[name="type"]:checked').value;
    payload.reductionMode = selectedMode;
    payload.schedule = Array.from(document.querySelectorAll('#schedule-rows .schedule-row')).map((row) => {
      const cells = row.querySelectorAll('input');
      return { from: Number(cells[0].value), to: Number(cells[1].value), amount: Number(cells[2].value) };
    }).filter((item) => item.from && item.to && item.amount);
    payload.totalDue = Number(payload.totalDue);
    payload.paid = Number(payload.paid || 0);
    payload.dueDay = payload.dueDay || null;
    payload.dueDate = payload.dueDate ? Number(payload.dueDate) : null;

    try {
      await api(id ? `/api/loans/${id}` : '/api/loans', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      closeModal();
      toast(t('saved'));
      await load();
    } catch (error) {
      document.querySelector('#form-error').textContent = error.message;
    }
  };
}

function scheduleRow(row) {
  return `<div class="schedule-row"><input name="from" type="number" min="1" placeholder="${t('from')}" value="${row.from}"><input name="to" type="number" min="1" placeholder="${t('to')}" value="${row.to}"><input name="amount" type="number" min="0.01" step="0.01" placeholder="${t('dueAmount')}" value="${row.amount}"><button type="button" onclick="this.parentElement.remove()">×</button></div>`;
}

function simpleModal(kind, id) {
  const item = id ? (kind === 'interest' ? state.interest : state.borrows).find((x) => x.id == id) : {};
  const isInterest = kind === 'interest';

  openModal(id ? t('edit') : isInterest ? t('addInterest') : t('addBorrow'), `<form id="simple-form"><div class="form-grid"><div class="field"><label>${t('name')}</label><input name="name" required value="${esc(item.name || '')}"></div>${isInterest ? `<div class="field"><label>${t('amount')}</label><input name="amount" type="number" min="0.01" step="0.01" required value="${item.amount || ''}"></div><div class="field"><label>${t('dueDate')}</label><input name="due_date" type="date" required value="${item.due_date || ''}"></div><div class="field"><label>${t('dueAmount')}</label><input name="due_amount" type="number" min="0.01" step="0.01" required value="${item.due_amount || ''}"></div>` : `<div class="field"><label>${t('borrowedDate')}</label><input name="borrowed_date" type="date" required value="${item.borrowed_date || ''}"></div><div class="field"><label>${t('dueDate')}</label><input name="due_date" type="date" required value="${item.due_date || ''}"></div><div class="field"><label>${t('amount')}</label><input name="amount" type="number" min="0.01" step="0.01" required value="${item.amount || ''}"></div>`}</div><div id="form-error" class="error"></div><div class="form-actions"><button type="button" class="ghost" data-close>${t('cancel')}</button><button class="primary">${t('save')}</button></div></form>`);

  document.querySelectorAll('[data-close]').forEach((button) => { button.onclick = closeModal; });
  document.querySelector('#simple-form').onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    ['amount', 'due_amount'].forEach((key) => {
      if (data[key]) data[key] = Number(data[key]);
    });

    try {
      await api(`/api/${kind === 'interest' ? 'interest' : 'hand-borrow'}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
      closeModal();
      toast(t('saved'));
      await load();
    } catch (error) {
      document.querySelector('#form-error').textContent = error.message;
    }
  };
}

function detailModal(id) {
  const loan = state.loans.find((x) => x.id == id);
  const reductionMode = (loan.reduction_mode || loan.reductionMode || 'auto');
  openModal(t('view'), `<div class="detail-grid">${[['name', loan.name], ['type', loan.type], ['dueTotal', loan.total_due], ['paid', loan.paid], ['pending', loan.pending], [loan.type === 'weekly' ? 'dueDay' : 'dueDate', scheduleValue(loan)], ['nextDue', date(loan.next_due)], ['next', loan.next_installment || '-'], ['dueAmount', money(loan.current_due_amount)], ['remainingTotal', money(loan.remaining_total)], ['reductionMode', reductionMode === 'auto' ? t('autoReduction') : t('manualReduction')]].map(([key, value]) => `<div class="detail"><span>${t(key)}</span><strong>${esc(value)}</strong></div>`).join('')}</div><h3 class="section-title">${t('schedule')}</h3><div class="table-wrap"><table class="data-table"><tbody>${loan.schedule.map((x) => `<tr><td>${x.from}</td><td>${x.to}</td><td class="money">${money(x.amount)}</td></tr>`).join('')}</tbody></table></div><h3 class="section-title">${t('history')}</h3><div class="table-wrap"><table class="data-table"><tbody>${loan.payments?.length ? loan.payments.map((x) => `<tr><td>${date(x.payment_date)}</td><td>#${x.installment_number}</td><td>${money(x.amount_paid)}</td><td>${x.payment_type === 'automatic' ? t('automatic') : t('manual')}</td><td>${esc(x.note || '')}</td></tr>`).join('') : `<tr><td class="empty">${t('noPayments')}</td></tr>`}</tbody></table></div>`);
}

function paymentModal(id) {
  const loan = state.loans.find((x) => x.id == id);
  const currentMode = (loan.reduction_mode || loan.reductionMode || 'auto');

  if (currentMode === 'auto') {
    openModal(t('payment'), `<div class="detail"><p>${t('paymentBlockedAuto')}</p></div><div class="form-actions"><button type="button" class="primary" data-close>${t('close')}</button></div>`);
    return;
  }

  openModal(t('payment'), `<form id="payment-form"><p class="muted">${t('next')}: <strong>${loan.next_installment || '-'}</strong> · ${money(loan.current_due_amount)}</p><div class="form-grid"><div class="field"><label>${t('amountPaid')}</label><input name="amountPaid" type="number" min="0.01" step="0.01" required value="${loan.current_due_amount}"></div><div class="field"><label>${t('paymentDate')}</label><input name="paymentDate" type="date" required value="${new Date().toISOString().slice(0, 10)}"></div><div class="field full"><label>${t('note')}</label><textarea name="note"></textarea></div></div><div id="form-error" class="error"></div><div class="form-actions"><button type="button" class="ghost" data-close>${t('cancel')}</button><button class="primary">${t('save')}</button></div></form>`);

  document.querySelectorAll('[data-close]').forEach((button) => { button.onclick = closeModal; });
  document.querySelector('#payment-form').onsubmit = async (event) => {
    event.preventDefault();
    try {
      await api(`/api/loans/${id}/payments`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
      closeModal();
      toast(t('saved'));
      await load();
    } catch (error) {
      document.querySelector('#form-error').textContent = error.message;
    }
  };
}

async function remove(kind, id, skipConfirm = false) {
  if (!skipConfirm && !confirm(t('confirm'))) return;
  try {
    await api(`/${kind === 'loan' ? 'api/loans' : kind === 'interest' ? 'api/interest' : 'api/hand-borrow'}/${id}`, { method: 'DELETE' });
    toast(t('deleted'));
    await load();
  } catch (error) {
    toast(error.message);
  }
}

function toast(message) {
  const toastBox = document.querySelector('#toast');
  if (!toastBox) return;
  toastBox.textContent = message;
  toastBox.classList.add('show');
  setTimeout(() => toastBox.classList.remove('show'), 2200);
}

function renderAuthScreen() {
  document.querySelector('.sidebar')?.setAttribute('style', 'display:none');

  const mode = state.page === 'register' ? 'register' : 'login';
  document.querySelector('#app').innerHTML = mode === 'register' ? `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="brand"><span class="brand-mark">L</span><span>Ledgerly</span></div>
        <h1>${t('registerTitle')}</h1>
        <form id="register-form" novalidate>
          <div class="field"><label>${t('phoneNumber')}</label><input name="phoneNumber" type="tel" placeholder="9876543210" required /></div>
          <div class="field"><label>${t('createPassword')}</label><input name="password" type="password" required /></div>
          <div class="field"><label>${t('confirmPassword')}</label><input name="confirmPassword" type="password" required /></div>
          <div class="auth-message" id="auth-message"></div>
          <button type="submit" class="primary auth-button">${t('registerButton')}</button>
        </form>
        <p class="auth-toggle-text">${t('alreadyHaveAccount')} <button type="button" class="link-button" data-auth-mode="login">${t('loginLink')}</button></p>
      </div>
    </div>
  ` : `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="brand"><span class="brand-mark">L</span><span>Ledgerly</span></div>
        <h1>${t('login')}</h1>
        <form id="login-form" novalidate>
          <div class="field"><label>${t('phoneNumber')}</label><input name="phoneNumber" type="tel" placeholder="9876543210" required /></div>
          <div class="field"><label>${t('password')}</label><input name="password" type="password" required /></div>
          <div class="auth-message" id="auth-message"></div>
          <button type="submit" class="primary auth-button">${t('loginButton')}</button>
        </form>
        <p class="auth-toggle-text">${t('newUserPrompt')} <button type="button" class="link-button" data-auth-mode="register">${t('createNewAccount')}</button></p>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.onclick = () => {
      state.page = button.dataset.authMode;
      renderAuthScreen();
    };
  });

  const loginForm = document.querySelector('#login-form');
  if (loginForm) {
    loginForm.onsubmit = async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(loginForm));
      try {
        const response = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
        state.authUser = response.user;
        state.page = 'home';
        location.hash = 'home';
        render();
        await load();
      } catch (error) {
        showAuthMessage(error.message);
      }
    };
  }

  const registerForm = document.querySelector('#register-form');
  if (registerForm) {
    registerForm.onsubmit = async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(registerForm));
      try {
        await api('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
        showAuthMessage('Account created successfully.', false);
        setTimeout(() => {
          state.page = 'login';
          renderAuthScreen();
        }, 800);
      } catch (error) {
        showAuthMessage(error.message);
      }
    };
  }
}

function showAuthMessage(message, isError = true) {
  const element = document.querySelector('#auth-message');
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', isError);
  element.classList.toggle('success', !isError);
}

function render() {
  if (!state.authUser) {
    renderAuthScreen();
    return;
  }

  document.querySelector('.sidebar')?.removeAttribute('style');
  registerNavigation();

  const app = document.querySelector('#app');
  app.innerHTML = state.page === 'home' ? home() : state.page === 'loans' ? loans() : state.page === 'interest' ? collection('interest', state.interest) : collection('borrow', state.borrows);
  bindMenus();
}

async function handleLogout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    // Ignore stale session issues and move to login.
  }

  state.authUser = null;
  state.page = 'login';
  state.loans = [];
  state.interest = [];
  state.borrows = [];
  location.hash = '';
  render();
}

async function initializeApp() {
  try {
    const response = await api('/api/auth/me');
    state.authUser = response.user;
    state.page = location.hash.slice(1) || 'home';
    await load();
  } catch (error) {
    state.authUser = null;
    state.page = 'login';
  }
  render();
}

document.querySelector('#mobile-menu')?.addEventListener('click', () => {
  document.querySelector('.sidebar')?.classList.toggle('open');
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-menu]') && !event.target.closest('.menu')) {
    document.querySelectorAll('.menu').forEach((item) => item.classList.remove('open'));
  }
});

window.onhashchange = () => {
  if (!state.authUser) {
    state.page = 'login';
    render();
    return;
  }

  state.page = location.hash.slice(1) || 'home';
  render();
};

initializeApp();
