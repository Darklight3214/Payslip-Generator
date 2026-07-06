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
// $env:PGPASSWORD="postgres123"; & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d payslip_generator -c "SELECT id, company_name, city, pincode, country, created_at FROM companies;"
