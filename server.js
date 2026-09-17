require('dotenv').config();

const path = require('node:path');
const express = require('express');
const mysql = require('mysql2/promise');

const {
    validateSchedule,
    calculateLoan,
    sumBy,
    scheduleAmount,
    buildMissedWeeklyDueDates,
    buildMissedMonthlyDueDates,
    nextWeeklyDueDate,
    nextMonthlyDueDate,
    formatLocalDate
} = require('./calculations');

const app = express();
const port = Number(process.env.PORT || 3000);

// Check required database settings
const requiredConfig = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
];

const missing = requiredConfig.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
);

if (missing.length > 0) {
    console.error('Missing MySQL configuration:', missing.join(', '));
    console.error('Please check your .env file.');
    process.exit(1);
}

// Show configuration status WITHOUT displaying the password
console.log('MySQL configuration:');
console.log('  Host:', process.env.DB_HOST);
console.log('  Port:', process.env.DB_PORT || 3306);
console.log('  User:', process.env.DB_USER);
console.log('  Password loaded:', !!process.env.DB_PASSWORD);
console.log('  Database:', process.env.DB_NAME);

// Create MySQL connection pool
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
const schema = [
  `CREATE TABLE IF NOT EXISTS loans (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, type ENUM('weekly','monthly') NOT NULL, total_due INT NOT NULL, paid INT NOT NULL DEFAULT 0, due_day VARCHAR(16), due_date TINYINT UNSIGNED, last_processed_due_date DATE, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS schedules (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, loan_id BIGINT UNSIGNED NOT NULL, from_installment INT NOT NULL, to_installment INT NOT NULL, due_amount DECIMAL(12,2) NOT NULL, CONSTRAINT fk_schedules_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS payments (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, loan_id BIGINT UNSIGNED NOT NULL, installment_number INT NOT NULL, payment_date DATE NOT NULL, amount_paid DECIMAL(12,2) NOT NULL, note TEXT NOT NULL, CONSTRAINT fk_payments_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE, UNIQUE KEY payments_due_installment (loan_id, payment_date, installment_number)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS interest (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, amount DECIMAL(12,2) NOT NULL, due_date DATE NOT NULL, due_amount DECIMAL(12,2) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS hand_borrow (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, borrowed_date DATE NOT NULL, due_date DATE NOT NULL, amount DECIMAL(12,2) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL) ENGINE=InnoDB`,
];
async function initializeDatabase() { for (const statement of schema) await pool.query(statement); }
async function transaction(work) { const connection = await pool.getConnection(); try { await connection.beginTransaction(); const result = await work(connection); await connection.commit(); return result; } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } }
const query = async (sql, params = [], connection = pool) => (await connection.execute(sql, params))[0];
const one = async (sql, params = [], connection = pool) => (await query(sql, params, connection))[0];
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const getSchedules = (id, connection) => query('SELECT id, from_installment AS `from`, to_installment AS `to`, due_amount AS amount FROM schedules WHERE loan_id=? ORDER BY from_installment', [id], connection);
async function getLoan(id, connection) { const loan = await one('SELECT * FROM loans WHERE id=?', [id], connection); return loan ? addNextDue(calculateLoan(loan, await getSchedules(id, connection))) : null; }
function inputLoan(body) { return { name: String(body.name || '').trim(), type: body.type, totalDue: Number(body.totalDue), paid: Number(body.paid || 0), dueDay: body.dueDay || null, dueDate: body.dueDate ? Number(body.dueDate) : null, schedule: body.schedule || [] }; }
function validateLoan(input) { if (!input.name) return 'Loan name is required.'; if (!['weekly', 'monthly'].includes(input.type)) return 'Loan type is invalid.'; if (!Number.isInteger(input.totalDue) || input.totalDue < 1) return 'Total Due must be a positive integer.'; if (!Number.isInteger(input.paid) || input.paid < 0 || input.paid > input.totalDue) return 'Paid must be between zero and Total Due.'; if (input.type === 'weekly' && !input.dueDay) return 'Due Day is required for weekly loans.'; if (input.type === 'monthly' && (!Number.isInteger(input.dueDate) || input.dueDate < 1 || input.dueDate > 31)) return 'Due Date must be between 1 and 31.'; return validateSchedule(input.schedule, input.totalDue); }
function addNextDue(loan) { if (Number(loan.paid) >= Number(loan.total_due)) return { ...loan, next_due: null }; const start = loan.created_at ? String(loan.created_at).slice(0, 10) : null; const today = formatLocalDate(new Date()); return { ...loan, next_due: loan.type === 'weekly' ? nextWeeklyDueDate(loan.last_processed_due_date, loan.due_day, start, today) : nextMonthlyDueDate(loan.last_processed_due_date, Number(loan.due_date), start, today) }; }
async function processAutomaticDueDatesForLoan(loan, connection = pool) { if (Number(loan.paid) >= Number(loan.total_due)) return 0; const today = formatLocalDate(new Date()); const start = loan.created_at ? String(loan.created_at).slice(0, 10) : null; const dates = loan.type === 'weekly' ? buildMissedWeeklyDueDates(loan.last_processed_due_date, today, loan.due_day, start) : buildMissedMonthlyDueDates(loan.last_processed_due_date, today, Number(loan.due_date), start); if (!dates.length) return 0; const schedule = await getSchedules(loan.id, connection); let paid = Number(loan.paid); let lastProcessed = loan.last_processed_due_date || null; for (const dueDate of dates) { if (paid >= Number(loan.total_due)) break; const installment = paid + 1; if (await one('SELECT id FROM payments WHERE loan_id=? AND payment_date=? AND installment_number=?', [loan.id, dueDate, installment], connection)) continue; const amount = scheduleAmount(schedule, installment); if (!amount) continue; await query('INSERT INTO payments (loan_id,installment_number,payment_date,amount_paid,note) VALUES (?,?,?,?,?)', [loan.id, installment, dueDate, amount, 'Automatic scheduled due'], connection); paid += 1; lastProcessed = dueDate; } if (paid > Number(loan.paid)) await query('UPDATE loans SET paid=?,last_processed_due_date=?,updated_at=? WHERE id=?', [paid, lastProcessed, now(), loan.id], connection); return paid - Number(loan.paid); }
async function processAutomaticDues() { return transaction(async (connection) => { const loans = await query('SELECT * FROM loans ORDER BY created_at DESC', [], connection); let count = 0; for (const loan of loans) count += await processAutomaticDueDatesForLoan(loan, connection); return count; }); }

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/loans', async (req, res, next) => { try { await processAutomaticDues(); const loans = await query('SELECT * FROM loans ORDER BY created_at DESC'); res.json(await Promise.all(loans.map(async (loan) => ({ ...addNextDue(calculateLoan(loan, await getSchedules(loan.id))), schedule: await getSchedules(loan.id) })))); } catch (error) { next(error); } });
app.get('/api/loans/:id', async (req, res, next) => { try { const stored = await one('SELECT * FROM loans WHERE id=?', [req.params.id]); if (!stored) return res.status(404).json({ error: 'Loan not found.' }); await transaction((connection) => processAutomaticDueDatesForLoan(stored, connection)); const loan = await getLoan(req.params.id); res.json({ ...loan, schedule: await getSchedules(loan.id), payments: await query('SELECT * FROM payments WHERE loan_id=? ORDER BY installment_number DESC', [loan.id]) }); } catch (error) { next(error); } });
app.post('/api/loans', async (req, res, next) => { try { const input = inputLoan(req.body); const error = validateLoan(input); if (error) return res.status(400).json({ error }); const id = await transaction(async (connection) => { const timestamp = now(); const result = await query('INSERT INTO loans (name,type,total_due,paid,due_day,due_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', [input.name, input.type, input.totalDue, input.paid, input.dueDay, input.dueDate, timestamp, timestamp], connection); for (const row of input.schedule) await query('INSERT INTO schedules (loan_id,from_installment,to_installment,due_amount) VALUES (?,?,?,?)', [result.insertId, row.from, row.to, row.amount], connection); return result.insertId; }); res.status(201).json(await getLoan(id)); } catch (error) { next(error); } });
app.put('/api/loans/:id', async (req, res, next) => { try { const input = inputLoan(req.body); const error = validateLoan(input); if (error) return res.status(400).json({ error }); if (!await getLoan(req.params.id)) return res.status(404).json({ error: 'Loan not found.' }); await transaction(async (connection) => { await query('UPDATE loans SET name=?,type=?,total_due=?,paid=?,due_day=?,due_date=?,updated_at=? WHERE id=?', [input.name, input.type, input.totalDue, input.paid, input.dueDay, input.dueDate, now(), req.params.id], connection); await query('DELETE FROM schedules WHERE loan_id=?', [req.params.id], connection); for (const row of input.schedule) await query('INSERT INTO schedules (loan_id,from_installment,to_installment,due_amount) VALUES (?,?,?,?)', [req.params.id, row.from, row.to, row.amount], connection); }); res.json(await getLoan(req.params.id)); } catch (error) { next(error); } });
app.delete('/api/loans/:id', async (req, res, next) => { try { const result = await query('DELETE FROM loans WHERE id=?', [req.params.id]); res.status(result.affectedRows ? 204 : 404).end(); } catch (error) { next(error); } });
app.post('/api/loans/:id/payments', async (req, res, next) => { try { const amount = Number(req.body.amountPaid); if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Amount paid must be positive.' }); const loan = await getLoan(req.params.id); if (!loan) return res.status(404).json({ error: 'Loan not found.' }); if (!loan.next_installment) return res.status(400).json({ error: 'This loan is already fully paid.' }); await transaction(async (connection) => { await query('INSERT INTO payments (loan_id,installment_number,payment_date,amount_paid,note) VALUES (?,?,?,?,?)', [req.params.id, loan.next_installment, req.body.paymentDate || new Date().toISOString().slice(0, 10), amount, String(req.body.note || '')], connection); await query('UPDATE loans SET paid=paid+1,updated_at=? WHERE id=?', [now(), req.params.id], connection); }); res.status(201).json(await getLoan(req.params.id)); } catch (error) { next(error); } });
function crudCollection(route, table, fields, required) { app.get(`/api/${route}`, async (req, res, next) => { try { res.json(await query(`SELECT * FROM ${table} ORDER BY created_at DESC`)); } catch (error) { next(error); } }); app.get(`/api/${route}/:id`, async (req, res, next) => { try { const row = await one(`SELECT * FROM ${table} WHERE id=?`, [req.params.id]); row ? res.json(row) : res.status(404).json({ error: 'Record not found.' }); } catch (error) { next(error); } }); app.post(`/api/${route}`, async (req, res, next) => { try { const values = fields.map((field) => req.body[field]); if (required.some((field) => !String(req.body[field] ?? '').trim())) return res.status(400).json({ error: 'Please provide valid values.' }); const result = await query(`INSERT INTO ${table} (${fields.join(',')},created_at,updated_at) VALUES (${fields.map(() => '?').join(',')},?,?)`, [...values, now(), now()]); res.status(201).json(await one(`SELECT * FROM ${table} WHERE id=?`, [result.insertId])); } catch (error) { next(error); } }); app.put(`/api/${route}/:id`, async (req, res, next) => { try { const values = fields.map((field) => req.body[field]); if (required.some((field) => !String(req.body[field] ?? '').trim())) return res.status(400).json({ error: 'Please provide valid values.' }); const result = await query(`UPDATE ${table} SET ${fields.map((field) => `${field}=?`).join(',')},updated_at=? WHERE id=?`, [...values, now(), req.params.id]); result.affectedRows ? res.json(await one(`SELECT * FROM ${table} WHERE id=?`, [req.params.id])) : res.status(404).json({ error: 'Record not found.' }); } catch (error) { next(error); } }); app.delete(`/api/${route}/:id`, async (req, res, next) => { try { const result = await query(`DELETE FROM ${table} WHERE id=?`, [req.params.id]); res.status(result.affectedRows ? 204 : 404).end(); } catch (error) { next(error); } }); }
crudCollection('interest', 'interest', ['name', 'amount', 'due_date', 'due_amount'], ['name', 'amount', 'due_date', 'due_amount']);
crudCollection('hand-borrow', 'hand_borrow', ['name', 'borrowed_date', 'due_date', 'amount'], ['name', 'borrowed_date', 'due_date', 'amount']);
app.get('/api/dashboard', async (req, res, next) => { try { const loans = await query('SELECT * FROM loans'); const interests = await query('SELECT amount,due_amount FROM interest'); const borrows = await query('SELECT amount FROM hand_borrow'); res.json({ loans: await Promise.all(loans.map(async (loan) => calculateLoan(loan, await getSchedules(loan.id)))), interest: { amount: sumBy(interests, 'amount'), dueAmount: sumBy(interests, 'due_amount') }, handBorrow: sumBy(borrows, 'amount') }); } catch (error) { next(error); } });
app.get('/api/health', async (req, res, next) => { try { await one('SELECT 1 AS connected'); res.json({ status: 'ok', database: 'connected', engine: 'mysql' }); } catch (error) { next(error); } });
app.use((error, req, res, next) => { console.error(error); res.status(500).json({ error: 'Database operation failed.' }); });
initializeDatabase().then(() => app.listen(port, () => console.log(`Personal money tracker running at http://localhost:${port}`))).catch((error) => { console.error('Could not connect to MySQL:', error.message); process.exit(1); });
