import express from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { encryptPassword, decryptPassword } from '../utils/crypto.js';
import { testConnection } from '../services/emailService.js';

const router = express.Router();
router.use(authenticate);

const accountSchema = z.object({
  email: z.string().email(),
  provider: z.enum(['gmail', 'outlook', 'custom']),
  displayName: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  imapHost: z.string().optional(),
  imapPort: z.number().optional(),
  username: z.string(),
  password: z.string()
});

// Get all accounts
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, provider, display_name, status, reputation_score, created_at,
        smtp_host, smtp_port, imap_host, imap_port, username
       FROM email_accounts WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Add account
router.post('/', async (req, res, next) => {
  try {
    const data = accountSchema.parse(req.body);

    // Set defaults based on provider
    let smtpHost = data.smtpHost;
    let smtpPort = data.smtpPort || 587;
    let imapHost = data.imapHost;
    let imapPort = data.imapPort || 993;

    if (data.provider === 'gmail') {
      smtpHost = smtpHost || 'smtp.gmail.com';
      imapHost = imapHost || 'imap.gmail.com';
    } else if (data.provider === 'outlook') {
      smtpHost = smtpHost || 'smtp.office365.com';
      imapHost = imapHost || 'outlook.office365.com';
    }

    const encryptedPassword = encryptPassword(data.password);

    // Test connection before saving
    const connectionTest = await testConnection({
      smtpHost, smtpPort, imapHost, imapPort,
      username: data.username, password: data.password,
      email: data.email
    });

    if (!connectionTest.success) {
      return res.status(400).json({ error: `Connection failed: ${connectionTest.error}` });
    }

    const result = await query(
      `INSERT INTO email_accounts 
        (user_id, email, provider, display_name, smtp_host, smtp_port, imap_host, imap_port, username, password_encrypted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, email, provider, display_name, status, reputation_score, created_at`,
      [req.userId, data.email, data.provider, data.displayName || data.email,
       smtpHost, smtpPort, imapHost, imapPort, data.username, encryptedPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete account
router.delete('/:id', async (req, res, next) => {
  try {
    await query(
      'DELETE FROM email_accounts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Test account connection
router.post('/:id/test', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM email_accounts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = result.rows[0];
    const password = decryptPassword(account.password_encrypted);

    const test = await testConnection({
      smtpHost: account.smtp_host,
      smtpPort: account.smtp_port,
      imapHost: account.imap_host,
      imapPort: account.imap_port,
      username: account.username,
      password,
      email: account.email
    });

    res.json(test);
  } catch (error) {
    next(error);
  }
});

export default router;
