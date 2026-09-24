require('dotenv').config();

const path = require('node:path');
const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { normalizePhoneNumber, normalizeReductionMode, validateRegistrationInput, validateReductionMode } = require('./auth');

const {
  validateSchedule,
  calculateLoan,
  sumBy,
  scheduleAmount,
  buildMissedWeeklyDueDates,
  buildMissedMonthlyDueDates,
  nextWeeklyDueDate,
  nextMonthlyDueDate,
  applyRecordedPayment,
  formatLocalDate
} = require('./calculations');

const app = express();
const port = Number(process.env.PORT || 3000);

const requiredConfig = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = requiredConfig.filter((key) => !process.env[key] || process.env[key].trim() === '');

if (missing.length > 0) {
  console.error('Missing MySQL configuration:', missing.join(', '));
  console.error('Please check your .env file.');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  dateStrings: true
});

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'ledgerly-local-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 12
  },
  name: 'ledgerly.sid'
}));

const query = async (sql, params = [], connection = pool) => (await connection.execute(sql, params))[0];
const one = async (sql, params = [], connection = pool) => (await query(sql, params, connection))[0];
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

async function ensureSchema() {
  await query(`CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(32) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS loans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('weekly','monthly') NOT NULL,
    total_due INT NOT NULL,
    paid INT NOT NULL DEFAULT 0,
    due_day VARCHAR(16),
    due_date TINYINT UNSIGNED,
    last_processed_due_date DATE,
    last_processed_installment INT NOT NULL DEFAULT 0,
    reduction_mode ENUM('auto','manual') NOT NULL DEFAULT 'auto',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY idx_loans_user_id (user_id),
    CONSTRAINT fk_loans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS schedules (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    from_installment INT NOT NULL,
    to_installment INT NOT NULL,
    due_amount DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_schedules_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    installment_number INT NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(12,2) NOT NULL,
    payment_type ENUM('manual','automatic') NOT NULL DEFAULT 'manual',
    note TEXT NOT NULL,
    CONSTRAINT fk_payments_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS interest (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    due_date DATE NOT NULL,
    due_amount DECIMAL(12,2) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY idx_interest_user_id (user_id),
    CONSTRAINT fk_interest_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS hand_borrow (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    borrowed_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY idx_hand_borrow_user_id (user_id),
    CONSTRAINT fk_hand_borrow_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`);

  const columns = await query('SHOW COLUMNS FROM loans');
  const loanColumnNames = new Set(columns.map((column) => column.Field));
  if (!loanColumnNames.has('last_processed_installment')) {
    await query('ALTER TABLE loans ADD COLUMN last_processed_installment INT NOT NULL DEFAULT 0 AFTER last_processed_due_date');
  }
  if (!loanColumnNames.has('reduction_mode')) {
    await query("ALTER TABLE loans ADD COLUMN reduction_mode ENUM('auto','manual') NOT NULL DEFAULT 'auto' AFTER last_processed_installment");
  }
  if (!loanColumnNames.has('user_id')) {
    await query('ALTER TABLE loans ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id');
  }
  await query("UPDATE loans SET reduction_mode='auto' WHERE reduction_mode IS NULL OR reduction_mode='' ");

  const paymentColumns = await query('SHOW COLUMNS FROM payments');
  const paymentColumnNames = new Set(paymentColumns.map((column) => column.Field));
  if (!paymentColumnNames.has('payment_type')) {
    await query('ALTER TABLE payments ADD COLUMN payment_type ENUM(\'manual\',\'automatic\') NOT NULL DEFAULT \'manual\' AFTER amount_paid');
  }

  const interestColumns = await query('SHOW COLUMNS FROM interest');
  const interestColumnNames = new Set(interestColumns.map((column) => column.Field));
  if (!interestColumnNames.has('user_id')) {
    await query('ALTER TABLE interest ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id');
  }

  const borrowColumns = await query('SHOW COLUMNS FROM hand_borrow');
  const borrowColumnNames = new Set(borrowColumns.map((column) => column.Field));
  if (!borrowColumnNames.has('user_id')) {
    await query('ALTER TABLE hand_borrow ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id');
  }

  const indexCheck = await one(
    "SELECT COUNT(*) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'payments' AND index_name = 'payments_loan_installment'"
  );

  if (Number(indexCheck.cnt) === 0) {
    await query('CREATE UNIQUE INDEX payments_loan_installment ON payments (loan_id, installment_number)');
  }

  const firstUser = await one('SELECT id FROM users ORDER BY id ASC LIMIT 1');
  if (firstUser) {
    await query('UPDATE loans SET user_id=? WHERE user_id IS NULL', [firstUser.id]);
    await query('UPDATE interest SET user_id=? WHERE user_id IS NULL', [firstUser.id]);
    await query('UPDATE hand_borrow SET user_id=? WHERE user_id IS NULL', [firstUser.id]);
  }
}

async function initializeDatabase() {
  await pool.query('SELECT 1');
  await ensureSchema();
}

async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

const getSchedules = (id, connection) => query('SELECT id, from_installment AS `from`, to_installment AS `to`, due_amount AS amount FROM schedules WHERE loan_id=? ORDER BY from_installment', [id], connection);

async function getLoan(id, userId = null, connection = pool) {
  const row = userId == null
    ? await one('SELECT * FROM loans WHERE id=?', [id], connection)
    : await one('SELECT * FROM loans WHERE id=? AND user_id=?', [id, userId], connection);
  if (!row) return null;
  return addNextDue(calculateLoan(row, await getSchedules(id, connection)));
}

function inputLoan(body) {
  // Default only genuinely legacy/missing values.  Do not turn an invalid
  // submitted value into "auto", because that would hide a client mismatch
  // and could change a Manual loan's behaviour.
  const suppliedReductionMode = body.reductionMode ?? body.reduction_mode ?? body.reduction;
  const reductionMode = suppliedReductionMode === undefined
    ? 'auto'
    : normalizeReductionMode(suppliedReductionMode);
  return {
    name: String(body.name || '').trim(),
    type: body.type,
    totalDue: Number(body.totalDue),
    paid: Number(body.paid || 0),
    dueDay: body.dueDay || null,
    dueDate: body.dueDate ? Number(body.dueDate) : null,
    schedule: body.schedule || [],
    reductionMode,
    reduction_mode: reductionMode
  };
}

function validateLoan(input) {
  if (!input.name) return 'Loan name is required.';
  if (!['weekly', 'monthly'].includes(input.type)) return 'Loan type is invalid.';
  if (!Number.isInteger(input.totalDue) || input.totalDue < 1) return 'Total Due must be a positive integer.';
  if (!Number.isInteger(input.paid) || input.paid < 0 || input.paid > input.totalDue) return 'Paid must be between zero and Total Due.';
  if (input.type === 'weekly' && !input.dueDay) return 'Due Day is required for weekly loans.';
  if (input.type === 'monthly' && (!Number.isInteger(input.dueDate) || input.dueDate < 1 || input.dueDate > 31)) return 'Due Date must be between 1 and 31.';
  const reductionModeError = validateReductionMode(input.reductionMode);
  if (reductionModeError) return reductionModeError;
  return validateSchedule(input.schedule, input.totalDue);
}

function addNextDue(loan) {
  if (Number(loan.paid) >= Number(loan.total_due)) return { ...loan, next_due: null };
  const start = loan.created_at ? String(loan.created_at).slice(0, 10) : null;
  const today = formatLocalDate(new Date());
  return {
    ...loan,
    next_due: loan.type === 'weekly'
      ? nextWeeklyDueDate(loan.last_processed_due_date, loan.due_day, start, today)
      : nextMonthlyDueDate(loan.last_processed_due_date, Number(loan.due_date), start, today)
  };
}

async function processAutomaticDueDatesForLoan(loan, connection = pool) {
  const reductionMode = String(loan.reduction_mode ?? loan.reductionMode ?? 'auto').toLowerCase();
  if (reductionMode !== 'auto') return 0;
  if (Number(loan.paid) >= Number(loan.total_due)) return 0;
  const today = formatLocalDate(new Date());
  const start = loan.created_at ? String(loan.created_at).slice(0, 10) : null;
  const dates = loan.type === 'weekly'
    ? buildMissedWeeklyDueDates(loan.last_processed_due_date, today, loan.due_day, start)
    : buildMissedMonthlyDueDates(loan.last_processed_due_date, today, Number(loan.due_date), start);
  if (!dates.length) return 0;

  const schedule = await getSchedules(loan.id, connection);
  let paid = Number(loan.paid);
  let lastProcessed = loan.last_processed_due_date || null;
  let lastProcessedInstallment = Number(loan.last_processed_installment || 0);

  for (const dueDate of dates) {
    if (paid >= Number(loan.total_due)) break;

    const installment = paid + 1;
    const existingPayment = await one(
      'SELECT id, payment_type FROM payments WHERE loan_id=? AND installment_number=? ORDER BY payment_date DESC, id DESC LIMIT 1',
      [loan.id, installment],
      connection
    );
    if (existingPayment) {
      paid = Math.max(paid, installment);
      if (existingPayment.payment_type === 'manual') continue;
      lastProcessed = dueDate;
      lastProcessedInstallment = installment;
      continue;
    }

    const amount = scheduleAmount(schedule, installment);
    if (!amount) continue;

    await query(
      'INSERT INTO payments (loan_id,installment_number,payment_date,amount_paid,payment_type,note) VALUES (?,?,?,?,?,?)',
      [loan.id, installment, dueDate, amount, 'automatic', 'Automatic scheduled due'],
      connection
    );

    paid += 1;
    lastProcessed = dueDate;
    lastProcessedInstallment = installment;
  }

  if (paid > Number(loan.paid) || (lastProcessed && lastProcessed !== loan.last_processed_due_date)) {
    await query(
      'UPDATE loans SET paid=?,last_processed_due_date=?,last_processed_installment=?,updated_at=? WHERE id=?',
      [paid, lastProcessed, lastProcessedInstallment, now(), loan.id],
      connection
    );
  }

  return paid - Number(loan.paid);
}

async function processAutomaticDues(userId) {
  return transaction(async (connection) => {
    const loans = await query('SELECT * FROM loans WHERE user_id=? ORDER BY created_at DESC', [userId], connection);
    let count = 0;
    for (const loan of loans) count += await processAutomaticDueDatesForLoan(loan, connection);
    return count;
  });
}

function indiaDateISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function sanitizeUserRow(row) {
  return row ? { id: row.id, phoneNumber: row.phone_number } : null;
}

app.get('/api/auth/me', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await one('SELECT id, phone_number FROM users WHERE id=?', [req.session.userId]);
  if (!user) {
    req.session.destroy(() => undefined);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.json({ user: sanitizeUserRow(user) });
});

app.post('/api/auth/register', async (req, res) => {
  const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  const validationError = validateRegistrationInput({ phoneNumber, password, confirmPassword });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const existing = await one('SELECT id FROM users WHERE phone_number=?', [phoneNumber]);
  if (existing) {
    return res.status(409).json({ error: 'An account with this phone number already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query('INSERT INTO users (phone_number,password_hash,created_at,updated_at) VALUES (?,?,?,?)', [phoneNumber, passwordHash, now(), now()]);
  req.session.userId = result.insertId;

  return res.status(201).json({
    message: 'Account created successfully.',
    user: { id: result.insertId, phoneNumber }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);
  const password = String(req.body.password || '');

  if (!phoneNumber || !password) {
    return res.status(400).json({ error: 'Invalid phone number or password.' });
  }

  const user = await one('SELECT * FROM users WHERE phone_number=?', [phoneNumber]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid phone number or password.' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid phone number or password.' });
  }

  req.session.userId = user.id;
  return res.json({
    message: 'Login successful.',
    user: { id: user.id, phoneNumber: user.phone_number }
  });
});

app.post('/api/auth/verify-password', requireAuth, async (req, res) => {
  const password = String(req.body.password ?? '');
  if (!password.trim()) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  const user = await one('SELECT password_hash FROM users WHERE id=?', [req.session.userId]);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ success: false, message: 'Incorrect password' });
  }

  return res.json({ success: true });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ error: 'Could not log out.' });
    res.clearCookie('ledgerly.sid');
    return res.json({ ok: true });
  });
});

app.use('/api/loans', requireAuth);
app.use('/api/interest', requireAuth);
app.use('/api/hand-borrow', requireAuth);
app.use('/api/dashboard', requireAuth);

app.get('/api/loans', async (req, res, next) => {
  try {
    await processAutomaticDues(req.session.userId);
    const loans = await query('SELECT * FROM loans WHERE user_id=? ORDER BY created_at DESC', [req.session.userId]);
    const rows = await Promise.all(loans.map(async (loan) => ({
      ...addNextDue(calculateLoan(loan, await getSchedules(loan.id))),
      schedule: await getSchedules(loan.id)
    })));
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/loans/:id', async (req, res, next) => {
  try {
    const stored = await one('SELECT * FROM loans WHERE id=? AND user_id=?', [req.params.id, req.session.userId]);
    if (!stored) return res.status(404).json({ error: 'Loan not found.' });
    await transaction((connection) => processAutomaticDueDatesForLoan(stored, connection));
    const loan = await getLoan(req.params.id, req.session.userId);
    res.json({
      ...loan,
      schedule: await getSchedules(loan.id),
      payments: await query('SELECT * FROM payments WHERE loan_id=? ORDER BY installment_number DESC', [loan.id])
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/loans', async (req, res, next) => {
  try {
    const input = inputLoan(req.body);
    const error = validateLoan(input);
    if (error) return res.status(400).json({ error });
    const id = await transaction(async (connection) => {
      const timestamp = now();
      const result = await query('INSERT INTO loans (user_id,name,type,total_due,paid,due_day,due_date,reduction_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [req.session.userId, input.name, input.type, input.totalDue, input.paid, input.dueDay, input.dueDate, input.reductionMode, timestamp, timestamp], connection);
      for (const row of input.schedule) {
        await query('INSERT INTO schedules (loan_id,from_installment,to_installment,due_amount) VALUES (?,?,?,?)', [result.insertId, row.from, row.to, row.amount], connection);
      }
      return result.insertId;
    });
    res.status(201).json(await getLoan(id, req.session.userId));
  } catch (error) {
    next(error);
  }
});

app.put('/api/loans/:id', async (req, res, next) => {
  try {
    const input = inputLoan(req.body);
    const error = validateLoan(input);
    if (error) return res.status(400).json({ error });
    if (!await getLoan(req.params.id, req.session.userId)) return res.status(404).json({ error: 'Loan not found.' });
    await transaction(async (connection) => {
      await query('UPDATE loans SET name=?,type=?,total_due=?,paid=?,due_day=?,due_date=?,reduction_mode=?,updated_at=? WHERE id=? AND user_id=?', [input.name, input.type, input.totalDue, input.paid, input.dueDay, input.dueDate, input.reductionMode, now(), req.params.id, req.session.userId], connection);
      await query('DELETE FROM schedules WHERE loan_id=?', [req.params.id], connection);
      for (const row of input.schedule) {
        await query('INSERT INTO schedules (loan_id,from_installment,to_installment,due_amount) VALUES (?,?,?,?)', [req.params.id, row.from, row.to, row.amount], connection);
      }
    });
    res.json(await getLoan(req.params.id, req.session.userId));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/loans/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM loans WHERE id=? AND user_id=?', [req.params.id, req.session.userId]);
    res.status(result.affectedRows ? 204 : 404).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/loans/:id/payments', async (req, res, next) => {
  try {
    const amount = Number(req.body.amountPaid);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Amount paid must be positive.' });
    const loan = await getLoan(req.params.id, req.session.userId);
    if (!loan) return res.status(404).json({ error: 'Loan not found.' });
    if (String(loan.reduction_mode || 'auto').toLowerCase() === 'auto') {
      return res.status(400).json({ error: 'This loan is set to Auto Reduction. Payments are processed automatically when the due date is reached. Change Reduction Mode to Manual in Settings to record payments manually.' });
    }
    if (!loan.next_installment) return res.status(400).json({ error: 'This loan is already fully paid.' });
    const existing = await one('SELECT id FROM payments WHERE loan_id=? AND installment_number=? LIMIT 1', [req.params.id, loan.next_installment]);
    if (existing) return res.status(409).json({ error: 'This installment has already been recorded.' });
    const paymentDate = req.body.paymentDate || formatLocalDate(new Date());
    const updatedLoan = applyRecordedPayment(loan, paymentDate);
    await transaction(async (connection) => {
      await query('INSERT INTO payments (loan_id,installment_number,payment_date,amount_paid,payment_type,note) VALUES (?,?,?,?,?,?)', [req.params.id, loan.next_installment, paymentDate, amount, 'manual', String(req.body.note || 'Manual payment')], connection);
      await query(
        'UPDATE loans SET paid=?,last_processed_due_date=?,last_processed_installment=?,updated_at=? WHERE id=? AND user_id=?',
        [updatedLoan.paid, updatedLoan.last_processed_due_date, updatedLoan.last_processed_installment, now(), req.params.id, req.session.userId],
        connection
      );
    });
    res.status(201).json(await getLoan(req.params.id, req.session.userId));
  } catch (error) {
    next(error);
  }
});

function crudCollection(route, table, fields, required) {
  app.get(`/api/${route}`, async (req, res, next) => {
    try {
      const rows = await query(`SELECT * FROM ${table} WHERE user_id=? ORDER BY created_at DESC`, [req.session.userId]);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  app.get(`/api/${route}/:id`, async (req, res, next) => {
    try {
      const row = await one(`SELECT * FROM ${table} WHERE id=? AND user_id=?`, [req.params.id, req.session.userId]);
      row ? res.json(row) : res.status(404).json({ error: 'Record not found.' });
    } catch (error) {
      next(error);
    }
  });

  app.post(`/api/${route}`, async (req, res, next) => {
    try {
      const values = fields.map((field) => req.body[field]);
      if (required.some((field) => !String(req.body[field] ?? '').trim())) return res.status(400).json({ error: 'Please provide valid values.' });
      const placeholders = Array.from({ length: fields.length + 3 }, () => '?').join(',');
      const result = await query(`INSERT INTO ${table} (user_id,${fields.join(',')},created_at,updated_at) VALUES (${placeholders})`, [req.session.userId, ...values, now(), now()]);
      res.status(201).json(await one(`SELECT * FROM ${table} WHERE id=?`, [result.insertId]));
    } catch (error) {
      next(error);
    }
  });

  app.put(`/api/${route}/:id`, async (req, res, next) => {
    try {
      const values = fields.map((field) => req.body[field]);
      if (required.some((field) => !String(req.body[field] ?? '').trim())) return res.status(400).json({ error: 'Please provide valid values.' });
      const result = await query(`UPDATE ${table} SET ${fields.map((field) => `${field}=?`).join(',')},updated_at=? WHERE id=? AND user_id=?`, [...values, now(), req.params.id, req.session.userId]);
      result.affectedRows ? res.json(await one(`SELECT * FROM ${table} WHERE id=?`, [req.params.id])) : res.status(404).json({ error: 'Record not found.' });
    } catch (error) {
      next(error);
    }
  });

  app.delete(`/api/${route}/:id`, async (req, res, next) => {
    try {
      const result = await query(`DELETE FROM ${table} WHERE id=? AND user_id=?`, [req.params.id, req.session.userId]);
      res.status(result.affectedRows ? 204 : 404).end();
    } catch (error) {
      next(error);
    }
  });
}

crudCollection('interest', 'interest', ['name', 'amount', 'due_date', 'due_amount'], ['name', 'amount', 'due_date', 'due_amount']);
crudCollection('hand-borrow', 'hand_borrow', ['name', 'borrowed_date', 'due_date', 'amount'], ['name', 'borrowed_date', 'due_date', 'amount']);

app.get('/api/dashboard', async (req, res, next) => {
  try {
    const loans = await query('SELECT * FROM loans WHERE user_id=?', [req.session.userId]);
    const interests = await query('SELECT amount,due_amount FROM interest WHERE user_id=?', [req.session.userId]);
    const borrows = await query('SELECT amount FROM hand_borrow WHERE user_id=?', [req.session.userId]);
    res.json({
      loans: await Promise.all(loans.map(async (loan) => calculateLoan(loan, await getSchedules(loan.id)))),
      interest: { amount: sumBy(interests, 'amount'), dueAmount: sumBy(interests, 'due_amount') },
      handBorrow: sumBy(borrows, 'amount')
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', async (req, res, next) => {
  try {
    await one('SELECT 1 AS connected');
    res.json({ status: 'ok', database: 'connected', engine: 'mysql' });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get(/^(?!\/api\/).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Database operation failed.' });
});

initializeDatabase().then(() => {
  app.listen(port, () => console.log(`Personal money tracker running at http://localhost:${port}`));
}).catch((error) => {
  console.error('Could not connect to MySQL:', error.message);
  process.exit(1);
});
