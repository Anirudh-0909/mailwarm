import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Get analytics for an account
router.get('/account/:accountId', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    // Verify account belongs to user
    const accountCheck = await query(
      'SELECT id FROM email_accounts WHERE id = $1 AND user_id = $2',
      [req.params.accountId, req.userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const result = await query(
      `SELECT date, emails_sent, emails_received, emails_replied, 
        spam_count, inbox_rate, reputation_score
       FROM analytics_daily
       WHERE account_id = $1 AND date >= NOW() - INTERVAL '${parseInt(days)} days'
       ORDER BY date ASC`,
      [req.params.accountId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get dashboard overview analytics
router.get('/overview', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    // Get all accounts for user
    const accounts = await query(
      'SELECT id FROM email_accounts WHERE user_id = $1',
      [req.userId]
    );

    if (accounts.rows.length === 0) {
      return res.json({ daily: [], totals: {} });
    }

    const accountIds = accounts.rows.map(a => a.id);

    const daily = await query(
      `SELECT date,
        SUM(emails_sent) as emails_sent,
        SUM(emails_received) as emails_received,
        SUM(emails_replied) as emails_replied,
        SUM(spam_count) as spam_count,
        AVG(inbox_rate) as inbox_rate,
        AVG(reputation_score) as reputation_score
       FROM analytics_daily
       WHERE account_id = ANY($1) AND date >= NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY date
       ORDER BY date ASC`,
      [accountIds]
    );

    const totals = await query(
      `SELECT
        COALESCE(SUM(emails_sent), 0) as total_sent,
        COALESCE(SUM(emails_received), 0) as total_received,
        COALESCE(SUM(emails_replied), 0) as total_replied,
        COALESCE(SUM(spam_count), 0) as total_spam,
        COALESCE(AVG(inbox_rate), 0) as avg_inbox_rate,
        COALESCE(AVG(reputation_score), 0) as avg_reputation
       FROM analytics_daily
       WHERE account_id = ANY($1) AND date >= NOW() - INTERVAL '${parseInt(days)} days'`,
      [accountIds]
    );

    res.json({
      daily: daily.rows,
      totals: totals.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get reputation timeline for account
router.get('/reputation/:accountId', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT date, reputation_score, inbox_rate, spam_count
       FROM analytics_daily
       WHERE account_id = $1
       ORDER BY date ASC
       LIMIT 90`,
      [req.params.accountId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
