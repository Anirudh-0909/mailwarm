import express from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const campaignSchema = z.object({
  name: z.string().min(1),
  accountId: z.string().uuid(),
  dailyTarget: z.number().min(1).max(200).default(10),
  rampUpDays: z.number().min(7).max(90).default(30),
  schedule: z.object({
    startHour: z.number().min(0).max(23).default(8),
    endHour: z.number().min(0).max(23).default(18),
    days: z.array(z.number()).default([1,2,3,4,5])
  }).optional()
});

// Get all campaigns for user
router.get('/campaigns', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT wc.*, ea.email as account_email, ea.provider
       FROM warmup_campaigns wc
       JOIN email_accounts ea ON wc.account_id = ea.id
       WHERE wc.user_id = $1
       ORDER BY wc.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create campaign
router.post('/campaigns', async (req, res, next) => {
  try {
    const data = campaignSchema.parse(req.body);

    // Verify account belongs to user
    const accountCheck = await query(
      'SELECT id FROM email_accounts WHERE id = $1 AND user_id = $2',
      [data.accountId, req.userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const schedule = data.schedule || { startHour: 8, endHour: 18, days: [1,2,3,4,5] };

    const result = await query(
      `INSERT INTO warmup_campaigns 
        (user_id, account_id, name, daily_target, ramp_up_days, schedule)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.userId, data.accountId, data.name, data.dailyTarget, data.rampUpDays, JSON.stringify(schedule)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update campaign status
router.patch('/campaigns/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'paused', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      `UPDATE warmup_campaigns SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [status, req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete campaign
router.delete('/campaigns/:id', async (req, res, next) => {
  try {
    await query(
      'DELETE FROM warmup_campaigns WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get campaign emails
router.get('/campaigns/:id/emails', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT we.*, 
        fa.email as from_email, 
        ta.email as to_email
       FROM warmup_emails we
       JOIN warmup_campaigns wc ON we.campaign_id = wc.id
       LEFT JOIN email_accounts fa ON we.from_account_id = fa.id
       LEFT JOIN email_accounts ta ON we.to_account_id = ta.id
       WHERE we.campaign_id = $1 AND wc.user_id = $2
       ORDER BY we.created_at DESC
       LIMIT $3 OFFSET $4`,
      [req.params.id, req.userId, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get warmup stats overview
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await query(
      `SELECT 
        COUNT(DISTINCT wc.id) as total_campaigns,
        COUNT(DISTINCT wc.id) FILTER (WHERE wc.status = 'active') as active_campaigns,
        COALESCE(SUM(wc.total_sent), 0) as total_emails_sent,
        COALESCE(SUM(wc.total_replied), 0) as total_replies,
        COALESCE(AVG(ea.reputation_score), 0) as avg_reputation
       FROM warmup_campaigns wc
       JOIN email_accounts ea ON wc.account_id = ea.id
       WHERE wc.user_id = $1`,
      [req.userId]
    );

    res.json(stats.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
