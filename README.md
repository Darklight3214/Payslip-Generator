# Payslip Generator

A full-stack application to generate payslips and manage company data. 
This repository contains the Node.js (Express) backend, vanilla HTML/JS frontend, and PostgreSQL database integration.

## 🚀 Deployment Guide (Linux)

This guide provides step-by-step instructions to deploy the Payslip Generator on a Linux environment (e.g., Ubuntu/Debian).

### 1. Prerequisites Installation

You will need Node.js and PostgreSQL installed on your Linux server.

**Install Node.js (v18+ recommended):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Install PostgreSQL:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Database Setup

Log in to the PostgreSQL prompt as the `postgres` user:
```bash
sudo -i -u postgres psql
```

Inside the `psql` prompt, run the following commands to create the user and database:
```sql
-- Create a new user (you can change the password)
CREATE USER postgres WITH PASSWORD 'postgres123';

-- Create the database
CREATE DATABASE payslip_generator;

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE payslip_generator TO postgres;
ALTER DATABASE payslip_generator OWNER TO postgres;

-- Exit psql
\q
```

### 3. Application Setup

Clone this repository and navigate into it:
```bash
git clone <your-github-repo-url>
cd payslip_generator
```

Install the Node.js dependencies:
```bash
npm install
```

Create your `.env` file in the root directory:
```bash
nano .env
```
Add the following configuration (adjust if your DB credentials differ):
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=payslip_generator
```

Initialize the Database Tables:
We have provided an initialization script to create the necessary tables. Run:
```bash
node server/init-db.js
```
*Note: Make sure this succeeds and says "Tables created successfully".*

### 4. Running the Application in Production

For production deployment, it is highly recommended to use **PM2** to keep your Node.js app running in the background and restart it if it crashes.

Install PM2 globally:
```bash
sudo npm install -g pm2
```

Start the application:
```bash
pm2 start server/index.js --name "payslip-app"
```

Your app should now be running on `http://<your-server-ip>:3000`!

---

## 🐘 Managing the Database using DBeaver

If you want to view the data visually, you can connect to your Linux PostgreSQL database using DBeaver from your local machine.

### Option A: Direct Connection (If port 5432 is open)
1. Download and install [DBeaver](https://dbeaver.io/download/) on your local machine.
2. Open DBeaver and click **New Database Connection** -> **PostgreSQL**.
3. In the connection settings:
   - **Host:** `<Your-Linux-Server-IP>`
   - **Port:** `5432`
   - **Database:** `payslip_generator`
   - **Username:** `postgres`
   - **Password:** `postgres123`
4. Click **Test Connection** and then **Finish**.

*Note: For this to work, you must configure `postgresql.conf` on your Linux server to `listen_addresses = '*'` and allow your IP in `pg_hba.conf`, then restart PostgreSQL.*

### Option B: SSH Tunnel (More Secure, Recommended)
If you don't want to expose port 5432 to the internet:
1. In DBeaver, create a new PostgreSQL connection as usual, but set **Host** to `localhost`.
2. Go to the **SSH** tab in the connection settings.
3. Check **Use SSH Tunnel**.
4. Enter your Linux server's IP in **Host/IP**.
5. Enter your SSH **User Name** (e.g., `root` or `ubuntu`) and your SSH Authentication method (Password or Private Key).
6. Click **Test Connection** and **Finish**. DBeaver will securely tunnel into your server!

---

## 📸 Screenshots

Please check the `screenshots/` directory for visual previews of the application and DBeaver configuration.
