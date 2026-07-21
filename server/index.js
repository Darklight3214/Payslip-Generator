require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer config — store in memory for BYTEA insertion
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, SVG, and WebP images are allowed.'));
    }
  },
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// ─── API: Save company details ───────────────────────────────
app.post('/api/company', upload.single('company_logo'), async (req, res) => {
  try {
    const { company_name, company_address, city, pincode, country } = req.body;

    // Validate required fields
    if (!company_name || company_name.trim() === '') {
      return res.status(400).json({ error: 'Company Name is required.' });
    }

    let logoBuffer = null;
    let logoMimetype = null;

    // Validate logo if uploaded
    if (req.file) {
      logoMimetype = req.file.mimetype;

      // For SVG, skip dimension check
      if (logoMimetype === 'image/svg+xml') {
        logoBuffer = req.file.buffer;
      } else {
        // Validate dimensions with sharp
        const metadata = await sharp(req.file.buffer).metadata();

        if (metadata.width !== 240 || metadata.height !== 240) {
          return res.status(400).json({
            error: `Logo must be exactly 240×240 pixels. Your image is ${metadata.width}×${metadata.height}.`,
          });
        }

        logoBuffer = req.file.buffer;
      }
    }

    // Insert into PostgreSQL
    const result = await pool.query(
      `INSERT INTO companies (company_logo, logo_mimetype, company_name, company_address, city, pincode, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, company_name, company_address, city, pincode, country, created_at`,
      [logoBuffer, logoMimetype, company_name.trim(), company_address?.trim() || null, city?.trim() || null, pincode?.trim() || null, country?.trim() || 'India']
    );

    console.log(` Company saved: ${company_name} (ID: ${result.rows[0].id})`);

    res.status(201).json({
      message: 'Company details saved successfully!',
      company: result.rows[0],
    });
  } catch (err) {
    console.error(' Error saving company:', err.message);
    if (err.message.includes('Only PNG')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to save company details. Please try again.' });
  }
});

// ─── API: List saved companies ───────────────────────────────
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, company_name, company_address, city, pincode, country,
              logo_mimetype IS NOT NULL AS has_logo, created_at
       FROM companies ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching companies:', err.message);
    res.status(500).json({ error: 'Failed to fetch companies.' });
  }
});

// ─── API: Get single company details ─────────────────────────
app.get('/api/company/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, company_name, company_address, city, pincode, country,
              logo_mimetype IS NOT NULL AS has_logo, created_at
       FROM companies WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching company:', err.message);
    res.status(500).json({ error: 'Failed to fetch company.' });
  }
});

// ─── API: Serve company logo image ───────────────────────────
app.get('/api/company/:id/logo', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT company_logo, logo_mimetype FROM companies WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0 || !result.rows[0].company_logo) {
      return res.status(404).json({ error: 'Logo not found.' });
    }
    const { company_logo, logo_mimetype } = result.rows[0];
    res.set('Content-Type', logo_mimetype);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(company_logo);
  } catch (err) {
    console.error('Error fetching logo:', err.message);
    res.status(500).json({ error: 'Failed to fetch logo.' });
  }
});

// ─── API: Save complete payslip ──────────────────────────────
app.post('/api/payslip', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      company_id, employee_name, employee_id, pay_period,
      paid_days, lop_days, pay_date,
      earnings, deductions, custom_fields,
      gross_earnings, total_deductions, net_payable,
    } = req.body;

    if (!employee_name || employee_name.trim() === '') {
      return res.status(400).json({ error: 'Employee Name is required.' });
    }

    await client.query('BEGIN');

    // Insert payslip
    const payslipResult = await client.query(
      `INSERT INTO payslips
         (company_id, employee_name, employee_id, pay_period, paid_days, lop_days, pay_date, gross_earnings, total_deductions, net_payable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        company_id || null,
        employee_name.trim(),
        employee_id?.trim() || null,
        pay_period || null,
        paid_days || 0,
        lop_days || 0,
        pay_date || null,
        gross_earnings || 0,
        total_deductions || 0,
        net_payable || 0,
      ]
    );
    const payslipId = payslipResult.rows[0].id;

    // Insert earnings
    if (earnings?.length) {
      for (const e of earnings) {
        if (e.label?.trim()) {
          await client.query(
            'INSERT INTO payslip_earnings (payslip_id, label, amount) VALUES ($1, $2, $3)',
            [payslipId, e.label.trim(), e.amount || 0]
          );
        }
      }
    }

    // Insert deductions
    if (deductions?.length) {
      for (const d of deductions) {
        if (d.label?.trim()) {
          await client.query(
            'INSERT INTO payslip_deductions (payslip_id, label, amount) VALUES ($1, $2, $3)',
            [payslipId, d.label.trim(), d.amount || 0]
          );
        }
      }
    }

    // Insert custom fields
    if (custom_fields?.length) {
      for (const cf of custom_fields) {
        if (cf.label?.trim()) {
          await client.query(
            'INSERT INTO payslip_custom_fields (payslip_id, label, value) VALUES ($1, $2, $3)',
            [payslipId, cf.label.trim(), cf.value || '']
          );
        }
      }
    }

    await client.query('COMMIT');

    console.log(`✅ Payslip saved: ${employee_name} (Payslip #${payslipId})`);
    res.status(201).json({
      message: 'Payslip saved successfully!',
      payslip_id: payslipId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving payslip:', err.message);
    res.status(500).json({ error: 'Failed to save payslip. Please try again.' });
  } finally {
    client.release();
  }
});

// ─── API: List saved payslips (history) ──────────────────────
app.get('/api/payslips', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.employee_name, p.employee_id, p.pay_period, p.paid_days,
              p.lop_days, p.pay_date, p.gross_earnings, p.total_deductions,
              p.net_payable, p.created_at,
              c.company_name, c.company_address, c.city, c.pincode, c.country,
              c.logo_mimetype IS NOT NULL AS has_logo, c.id AS company_id
       FROM payslips p
       LEFT JOIN companies c ON p.company_id = c.id
       ORDER BY p.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching payslips:', err.message);
    res.status(500).json({ error: 'Failed to fetch payslips.' });
  }
});

// ─── API: Get single payslip with full details ───────────────
app.get('/api/payslip/:id', async (req, res) => {
  try {
    const payslip = await pool.query(
      `SELECT p.*, c.company_name, c.company_address, c.city, c.pincode, c.country,
              c.logo_mimetype IS NOT NULL AS has_logo, c.id AS company_id
       FROM payslips p LEFT JOIN companies c ON p.company_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (payslip.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found.' });
    }

    const earnings = await pool.query(
      'SELECT label, amount FROM payslip_earnings WHERE payslip_id = $1 ORDER BY id',
      [req.params.id]
    );
    const deductions = await pool.query(
      'SELECT label, amount FROM payslip_deductions WHERE payslip_id = $1 ORDER BY id',
      [req.params.id]
    );
    const customFields = await pool.query(
      'SELECT label, value FROM payslip_custom_fields WHERE payslip_id = $1 ORDER BY id',
      [req.params.id]
    );

    res.json({
      ...payslip.rows[0],
      earnings: earnings.rows,
      deductions: deductions.rows,
      custom_fields: customFields.rows,
    });
  } catch (err) {
    console.error('Error fetching payslip:', err.message);
    res.status(500).json({ error: 'Failed to fetch payslip.' });
  }
});

// ─── API: Upload authorized signature ────────────────────────
app.post('/api/signature', upload.single('signature'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No signature file uploaded.' });
    }
    // Return the signature as base64 for client-side storage
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    res.json({ signature: dataUrl });
  } catch (err) {
    console.error('Error uploading signature:', err.message);
    res.status(500).json({ error: 'Failed to upload signature.' });
  }
});

// Multer error handling (file too large, etc.)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Logo file must be under 1MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// ─── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n Payslip Generator server running at http://localhost:${PORT}`);
  console.log(` PostgreSQL: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);
});

