/**
 * Database initialization script.
 * Creates the payslip_generator database and the companies table.
 * Run with: npm run init-db
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

const DB_NAME = process.env.DB_NAME || 'payslip_generator';

async function initDatabase() {
  // Step 1: Connect to default 'postgres' database to create our database
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
  });

  try {
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Check if database exists
    const dbCheck = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );

    if (dbCheck.rows.length === 0) {
      await adminClient.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`✅ Database "${DB_NAME}" created`);
    } else {
      console.log(`ℹ️  Database "${DB_NAME}" already exists`);
    }
  } catch (err) {
    console.error('❌ Error creating database:', err.message);
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // Step 2: Connect to our database and create the companies table
  const appClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: DB_NAME,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
  });

  try {
    await appClient.connect();
    console.log(`✅ Connected to "${DB_NAME}" database`);

    await appClient.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id              SERIAL PRIMARY KEY,
        company_logo    BYTEA,
        logo_mimetype   VARCHAR(50),
        company_name    VARCHAR(255) NOT NULL,
        company_address TEXT,
        city            VARCHAR(100),
        pincode         VARCHAR(10),
        country         VARCHAR(100) DEFAULT 'India',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "companies" is ready');

    // Payslips table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id                SERIAL PRIMARY KEY,
        company_id        INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        employee_name     VARCHAR(255) NOT NULL,
        employee_id       VARCHAR(50),
        pay_period        VARCHAR(50),
        paid_days         INTEGER DEFAULT 0,
        lop_days          INTEGER DEFAULT 0,
        pay_date          DATE,
        gross_earnings    DECIMAL(12,2) DEFAULT 0,
        total_deductions  DECIMAL(12,2) DEFAULT 0,
        net_payable       DECIMAL(12,2) DEFAULT 0,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "payslips" is ready');

    // Payslip earnings line items
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS payslip_earnings (
        id          SERIAL PRIMARY KEY,
        payslip_id  INTEGER REFERENCES payslips(id) ON DELETE CASCADE,
        label       VARCHAR(255) NOT NULL,
        amount      DECIMAL(12,2) DEFAULT 0
      );
    `);
    console.log('✅ Table "payslip_earnings" is ready');

    // Payslip deduction line items
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS payslip_deductions (
        id          SERIAL PRIMARY KEY,
        payslip_id  INTEGER REFERENCES payslips(id) ON DELETE CASCADE,
        label       VARCHAR(255) NOT NULL,
        amount      DECIMAL(12,2) DEFAULT 0
      );
    `);
    console.log('✅ Table "payslip_deductions" is ready');

    // Custom employee fields
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS payslip_custom_fields (
        id          SERIAL PRIMARY KEY,
        payslip_id  INTEGER REFERENCES payslips(id) ON DELETE CASCADE,
        label       VARCHAR(255) NOT NULL,
        value       TEXT
      );
    `);
    console.log('✅ Table "payslip_custom_fields" is ready');

    // Verify table structure
    const tableInfo = await appClient.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Table structure:');
    console.table(tableInfo.rows);

  } catch (err) {
    console.error('❌ Error creating table:', err.message);
    process.exit(1);
  } finally {
    await appClient.end();
  }

  console.log('\n🎉 Database initialization complete!');
}

initDatabase();
