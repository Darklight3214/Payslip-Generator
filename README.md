# Payslip Generator

A full-stack web application for generating professional employee payslips. Built with **Node.js (Express)** on the backend, **Vanilla HTML/CSS/JS** on the frontend, and **PostgreSQL** as the database. The application supports company management, dynamic earnings/deduction rows, percentage-based calculations, payslip history, PDF printing, dark mode, keyboard shortcuts, and more.

---

## 📸 Screenshots

### Application UI — Company Details Form
![App UI - Company Details](screenshots/Screenshot%202026-07-06%20222611.png)

### DBeaver — Companies Table
![DBeaver - Companies Table](screenshots/Screenshot%202026-07-21%20131917.png)

### DBeaver — Payslips Table
![DBeaver - Payslips Table](screenshots/Screenshot%202026-07-21%20132122.png)

### DBeaver — Payslip Earnings Table
![DBeaver - Payslip Earnings](screenshots/Screenshot%202026-07-21%20132108.png)

### DBeaver — Payslip Deductions Table
![DBeaver - Payslip Deductions](screenshots/Screenshot%202026-07-21%20132018.png)

### Sample Generated Payslip PDF
A sample PDF output is available at: [`screenshots/test1.pdf`](screenshots/test1.pdf)

---

## ✨ Features

- **Company Management** — Save and reuse multiple company profiles (name, address, logo). Logos are stored directly in the database as binary data (BYTEA).
- **Dynamic Earnings & Deductions** — Add or remove any number of earning and deduction rows on the fly.
- **Percentage-Based Calculations** — Toggle any earning or deduction row to auto-calculate as a percentage of Basic salary (e.g., HRA at 40% of Basic, PF at 12% of Basic).
- **Custom Employee Fields** — Add any extra key-value fields to a payslip (e.g., Bank Account No, UAN, PAN, Designation).
- **Live Totals & Amount in Words** — Gross Earnings, Total Deductions, and Net Payable update in real-time. The net payable amount is automatically converted to words (Indian numbering system).
- **Payslip Preview Modal** — Preview the final payslip layout before saving or printing.
- **Print / PDF Download** — Generate a clean, print-ready payslip using the browser's native print dialog (Save as PDF).
- **Payslip History Sidebar** — Browse and reload previously saved payslips from a searchable sidebar.
- **Next Month Template** — After saving a payslip, quickly generate the next month's payslip for the same employee with one click.
- **Authorized Signature Upload** — Upload and embed a signature image on the payslip.
- **Auto-Save Drafts** — Form data is automatically saved to `localStorage` so nothing is lost on accidental page refresh.
- **Dark Mode** — Toggle between light and dark themes. Preference is remembered across sessions.
- **Keyboard Shortcuts** — `Ctrl+S` to Save, `Ctrl+P` to Print, `Ctrl+H` to toggle History.
- **Server Connection Indicator** — Real-time green/red status dot showing whether the backend server is reachable.
- **Responsive Design** — Works on desktop and tablet screen sizes.

---

## 🏗️ Project Structure

```
payslip_generator/
├── .env                    # Environment variables (DB credentials, port)
├── .gitignore              # Ignores node_modules, .env, uploads
├── package.json            # Node.js project config & scripts
├── README.md               # This file
├── server/
│   ├── db.js               # PostgreSQL connection pool setup
│   ├── index.js            # Express server with all API routes
│   └── init-db.js          # Database & table initialization script
├── public/
│   ├── index.html          # Main HTML page (single-page app)
│   ├── index.css           # All styles (light mode, dark mode, print)
│   └── index.js            # Frontend logic (1000+ lines)
└── screenshots/            # Application screenshots & sample PDF
```

---

## 🛠️ Technology Stack

| Layer      | Technology                |
|------------|---------------------------|
| Frontend   | HTML5, CSS3, Vanilla JS   |
| Backend    | Node.js, Express.js       |
| Database   | PostgreSQL 17             |
| Image Processing | Sharp (logo validation) |
| File Upload | Multer (in-memory)       |
| Fonts      | Google Fonts (Inter)      |

---

## 🚀 Installation & Setup Guide

### Prerequisites

You need the following installed on your system:
- **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) — [Download](https://www.postgresql.org/download/)
- **Git** — [Download](https://git-scm.com/)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Darklight3214/Payslip-Generator.git
cd Payslip-Generator
```

---

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required Node.js packages:
- `express` — Web server framework
- `pg` — PostgreSQL client for Node.js
- `multer` — File upload middleware
- `sharp` — Image processing (logo dimension validation)
- `dotenv` — Environment variable management

---

### Step 3: Configure Environment Variables

Create a `.env` file in the project root directory:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=payslip_generator
```

> **Note:** Replace `DB_USER` and `DB_PASSWORD` with your actual PostgreSQL credentials.

---

### Step 4: Set Up PostgreSQL

#### On Windows

1. Make sure the PostgreSQL service is running. Open the **Services** app (press Windows key, type `Services`, hit Enter).
2. Find the service named **`postgresql-x64-17`** (or similar) and ensure its status is **Running**. If it's stopped, right-click and select **Start**.
3. Open **pgAdmin** (installed with PostgreSQL) or any SQL client (DBeaver, etc.) and create the database:

```sql
CREATE DATABASE payslip_generator;
```

#### On Linux (Ubuntu/Debian)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create the database
sudo -i -u postgres psql
```

Inside the `psql` prompt:

```sql
CREATE DATABASE payslip_generator;
-- If you need to set a password for the postgres user:
ALTER USER postgres WITH PASSWORD 'postgres123';
\q
```

---

### Step 5: Initialize the Database Tables

Run the provided initialization script. This creates the database (if it doesn't exist) and all 5 required tables:

```bash
npm run init-db
```

You should see output like:

```
✅ Connected to PostgreSQL server
ℹ️  Database "payslip_generator" already exists
✅ Connected to "payslip_generator" database
✅ Table "companies" is ready
✅ Table "payslips" is ready
✅ Table "payslip_earnings" is ready
✅ Table "payslip_deductions" is ready
✅ Table "payslip_custom_fields" is ready
🎉 Database initialization complete!
```

---

### Step 6: Start the Application

**Development mode** (auto-restarts on code changes):

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The application will be available at: **http://localhost:3000**

---

### Step 7 (Optional): Production Deployment with PM2

For production deployment on a Linux server, use **PM2** to keep the app running in the background:

```bash
sudo npm install -g pm2
pm2 start server/index.js --name "payslip-app"
pm2 save
pm2 startup
```

Your app will now be running at `http://<your-server-ip>:3000`.

---

## 📜 Available Scripts

| Command           | Description                                             |
|-------------------|---------------------------------------------------------|
| `npm start`       | Start the server in production mode                     |
| `npm run dev`     | Start the server in development mode (auto-restart)     |
| `npm run init-db` | Create the database and all tables                      |

---

## 🔌 API Endpoints

| Method | Endpoint                  | Description                                |
|--------|---------------------------|--------------------------------------------|
| POST   | `/api/company`            | Save a new company (with optional logo)    |
| GET    | `/api/companies`          | List all saved companies                   |
| GET    | `/api/company/:id`        | Get a single company's details             |
| GET    | `/api/company/:id/logo`   | Serve a company's logo image               |
| POST   | `/api/payslip`            | Save a complete payslip with all line items |
| GET    | `/api/payslips`           | List saved payslips (last 50)              |
| GET    | `/api/payslip/:id`        | Get a single payslip with full details     |
| POST   | `/api/signature`          | Upload an authorized signature image       |

---

## 🗄️ Database Schema

The application uses **5 tables** in the `payslip_generator` PostgreSQL database. Here is a detailed explanation of every table and every column.

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌───────────────────┐
│  companies  │       │    payslips       │       │ payslip_earnings  │
│─────────────│  1──N │──────────────────│  1──N │───────────────────│
│ id (PK)     │◄──────│ company_id (FK)  │◄──────│ payslip_id (FK)   │
│ company_logo│       │ id (PK)          │       │ id (PK)           │
│ logo_mime...|       │ employee_name    │       │ label             │
│ company_name│       │ employee_id      │       │ amount            │
│ company_addr│       │ pay_period       │       └───────────────────┘
│ city        │       │ paid_days        │
│ pincode     │       │ lop_days         │       ┌───────────────────┐
│ country     │       │ pay_date         │  1──N │ payslip_deductions│
│ created_at  │       │ gross_earnings   │◄──────│───────────────────│
└─────────────┘       │ total_deductions │       │ payslip_id (FK)   │
                      │ net_payable      │       │ id (PK)           │
                      │ created_at       │       │ label             │
                      └──────────────────┘       │ amount            │
                             │                   └───────────────────┘
                             │
                             │  1──N  ┌─────────────────────┐
                             └───────►│ payslip_custom_fields│
                                      │─────────────────────│
                                      │ payslip_id (FK)     │
                                      │ id (PK)             │
                                      │ label               │
                                      │ value               │
                                      └─────────────────────┘
```

---

### Table 1: `companies`

Stores the details of each employer/organization. When you fill out the "Company Details" section in the app and click "Save Company Details", a row is created here.

| Column            | Data Type      | Description                                                                 |
|-------------------|----------------|-----------------------------------------------------------------------------|
| `id`              | `SERIAL (PK)`  | Auto-incrementing unique identifier for the company.                        |
| `company_logo`    | `BYTEA`        | The actual logo image file stored as raw binary data.                       |
| `logo_mimetype`   | `VARCHAR(50)`  | The MIME type of the logo (e.g., `image/png`, `image/webp`) so the browser knows how to render it. |
| `company_name`    | `VARCHAR(255)` | The name of the company. **Required.**                                      |
| `company_address` | `TEXT`          | The street address of the company.                                          |
| `city`            | `VARCHAR(100)` | The city where the company is located.                                      |
| `pincode`         | `VARCHAR(10)`  | The postal/ZIP code.                                                        |
| `country`         | `VARCHAR(100)` | The country. Defaults to `'India'`.                                         |
| `created_at`      | `TIMESTAMP`    | The exact date and time the company record was created.                     |

---

### Table 2: `payslips`

The central table that stores the high-level summary of each generated payslip. Every time you click "Save Payslip" in the app, one row is created here.

| Column             | Data Type       | Description                                                                |
|--------------------|-----------------|----------------------------------------------------------------------------|
| `id`               | `SERIAL (PK)`   | Auto-incrementing unique payslip number.                                   |
| `company_id`       | `INTEGER (FK)`  | References `companies.id`. Links this payslip to the issuing company.      |
| `employee_name`    | `VARCHAR(255)`  | The name of the employee receiving the salary. **Required.**               |
| `employee_id`      | `VARCHAR(50)`   | The employee's ID, roll number, or employee code.                          |
| `pay_period`       | `VARCHAR(50)`   | The month and year of the salary (e.g., `"July 2026"`).                    |
| `paid_days`        | `INTEGER`       | The number of days the employee is being paid for.                         |
| `lop_days`         | `INTEGER`       | Loss of Pay days (unpaid leave).                                           |
| `pay_date`         | `DATE`          | The date the salary was actually disbursed.                                |
| `gross_earnings`   | `DECIMAL(12,2)` | The total sum of all earning line items.                                   |
| `total_deductions` | `DECIMAL(12,2)` | The total sum of all deduction line items.                                 |
| `net_payable`      | `DECIMAL(12,2)` | The final take-home pay (`gross_earnings - total_deductions`).             |
| `created_at`       | `TIMESTAMP`     | The exact date and time the payslip was generated.                         |

> **Note:** If a company is deleted, `company_id` is set to `NULL` (ON DELETE SET NULL) rather than deleting the payslip.

---

### Table 3: `payslip_earnings`

Stores the individual earning line items that make up an employee's total salary. Each payslip can have multiple earning rows (e.g., Basic, HRA, Bonus, Special Allowance).

| Column       | Data Type       | Description                                                       |
|--------------|-----------------|-------------------------------------------------------------------|
| `id`         | `SERIAL (PK)`   | Auto-incrementing unique identifier for this earning entry.       |
| `payslip_id` | `INTEGER (FK)`  | References `payslips.id`. Links this earning to its parent payslip. |
| `label`      | `VARCHAR(255)`  | The name of the earning (e.g., `"Basic"`, `"House Rent Allowance"`). |
| `amount`     | `DECIMAL(12,2)` | The monetary value of this earning component.                     |

> **Cascade Rule:** If the parent payslip is deleted, all its earning rows are automatically deleted (`ON DELETE CASCADE`).

---

### Table 4: `payslip_deductions`

Stores the individual deduction line items subtracted from the employee's salary. Each payslip can have multiple deduction rows (e.g., Income Tax, Provident Fund, Professional Tax).

| Column       | Data Type       | Description                                                          |
|--------------|-----------------|----------------------------------------------------------------------|
| `id`         | `SERIAL (PK)`   | Auto-incrementing unique identifier for this deduction entry.        |
| `payslip_id` | `INTEGER (FK)`  | References `payslips.id`. Links this deduction to its parent payslip. |
| `label`      | `VARCHAR(255)`  | The name of the deduction (e.g., `"Income Tax"`, `"Provident Fund"`). |
| `amount`     | `DECIMAL(12,2)` | The monetary value of this deduction.                                |

> **Cascade Rule:** If the parent payslip is deleted, all its deduction rows are automatically deleted (`ON DELETE CASCADE`).

---

### Table 5: `payslip_custom_fields`

Stores extra, custom key-value information about an employee that isn't part of the standard payslip form. The app lets you click "Add another field" to create these.

| Column       | Data Type       | Description                                                                |
|--------------|-----------------|----------------------------------------------------------------------------|
| `id`         | `SERIAL (PK)`   | Auto-incrementing unique identifier for this custom field.                 |
| `payslip_id` | `INTEGER (FK)`  | References `payslips.id`. Links this field to its parent payslip.          |
| `label`      | `VARCHAR(255)`  | The title of the custom field (e.g., `"Bank Account No"`, `"PAN"`, `"Designation"`). |
| `value`      | `TEXT`           | The actual data for that field (e.g., `"1234567890"`, `"ABCDE1234F"`).     |

> **Cascade Rule:** If the parent payslip is deleted, all its custom fields are automatically deleted (`ON DELETE CASCADE`).

---

## 🐘 Viewing the Database with DBeaver

You can connect to the PostgreSQL database using [DBeaver](https://dbeaver.io/download/) to view and manage the data visually.

### Direct Connection (Local Development)

1. Open DBeaver and click **New Database Connection** → **PostgreSQL**.
2. Enter the connection settings:
   - **Host:** `localhost`
   - **Port:** `5432`
   - **Database:** `payslip_generator`
   - **Username:** `postgres`
   - **Password:** `postgres123`
3. Click **Test Connection** and then **Finish**.

### SSH Tunnel (Remote Server)

If connecting to a remote Linux server:
1. Create a new PostgreSQL connection with **Host** set to `localhost`.
2. Go to the **SSH** tab and check **Use SSH Tunnel**.
3. Enter your server's IP, SSH username, and authentication method.
4. Click **Test Connection** and **Finish**.

> **Tip:** After adding data through the app, press **F5** in DBeaver to refresh the table view.

---

## ⌨️ Keyboard Shortcuts

| Shortcut       | Action              |
|----------------|----------------------|
| `Ctrl + S`     | Save Payslip         |
| `Ctrl + P`     | Print / Download PDF |
| `Ctrl + H`     | Toggle History Panel |

---

## 📄 License

This project is open source and available for personal and educational use.
