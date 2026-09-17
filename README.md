# Ledgerly Personal Loan Tracker

A private personal money tracker with weekly/monthly loans, changing installment schedules, payment history, interest, hand borrow records, INR formatting, and English/Tamil UI.

## MySQL setup

The backend connects through `mysql2`. Create an empty MySQL database first, for example `CREATE DATABASE loan_tracker CHARACTER SET utf8mb4;`, then set its connection details in `.env`. The app creates its tables automatically on startup.

1. Start MySQL and create a database and user with access to it.
2. Update `.env` with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
3. Install dependencies with `npm install`.
4. Start the app with `npm start` and open `http://localhost:3000`.
5. Verify the connection at `http://localhost:3000/api/health`; it returns `{"status":"ok","database":"connected","engine":"mysql"}`.

## Environment

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=loan_tracker
DB_CONNECTION_LIMIT=10
```

Never commit `.env`; it is ignored by git. The backend owns all database access and the frontend only calls `/api/*`.

## Commands

```text
npm install
npm test
npm start
```

For development, use `npm run dev`. To change database configuration later, edit `.env`; the connection and schema setup live in `server.js`.

Troubleshooting: if the port is busy, change `PORT`; if MySQL cannot connect, confirm its service is running and that the credentials and database name in `.env` are correct.
