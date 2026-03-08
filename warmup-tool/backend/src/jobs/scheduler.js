import cron from 'node-cron';
import { query, pool } from '../config/database.js';
import { sendWarmupEmail, processInbox, generateWarmupEmail } from '../services/emailService.js';
import { decryptPassword } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

// Calculate how many emails to send today based on ramp-up curve
function calculateDailyTarget(campaign) {
  const { current_day, ramp_up_days, daily_target } = campaign;
  const day = Math.min(current_day, ramp_up_days);
  const progress = day / ramp_up_days;

  // Exponential ramp-up curve
  const multiplier = Math.pow(progress, 1.5);
  return Math.max(2, Math.floor(daily_target * multiplier));
}

// Check if current time is within campaign schedule
function isWithinSchedule(schedule) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday

  const days = schedule.days || [1,2,3,4,5];
  const startHour = schedule.start_hour || schedule.startHour || 8;
  const endHour = schedule.end_hour || schedule.endHour || 18;

  return days.includes(day) && hour >= startHour && hour < endHour;
}

// Main warmup job - runs every 15 minutes
async function runWarmupJob() {
  logger.info('Running warmup job...');

  try {
    // Get all active campaigns with account details
    const campaigns = await query(
      `SELECT wc.*, 
        ea.email as account_email,
        ea.smtp_host, ea.smtp_port, ea.imap_host, ea.imap_port,
        ea.username, ea.password_encrypted, ea.display_name,
        ea.id as email_account_id
       FROM warmup_campaigns wc
       JOIN email_accounts ea ON wc.account_id = ea.id
       WHERE wc.status = 'active'`
    );

    for (const campaign of campaigns.rows) {
      try {
        await processCampaign(campaign);
      } catch (err) {
        logger.error(`Campaign ${campaign.id} error:`, err);
      }
    }
  } catch (err) {
    logger.error('Warmup job error:', err);
  }
}

async function processCampaign(campaign) {
  const schedule = typeof campaign.schedule === 'string'
    ? JSON.parse(campaign.schedule)
    : campaign.schedule;

  if (!isWithinSchedule(schedule)) {
    return; // Outside schedule window
  }

  const todayTarget = calculateDailyTarget(campaign);
  const remaining = todayTarget - campaign.current_daily_count;

  if (remaining <= 0) {
    return; // Already hit today's target
  }

  const password = decryptPassword(campaign.password_encrypted);

  // Get pool accounts to send to/from (excluding self)
  const poolAccounts = await query(
    `SELECT * FROM warmup_pool 
     WHERE is_active = true AND email != $1
     AND (emails_sent_today < 50 OR last_used < NOW() - INTERVAL '1 day')
     ORDER BY RANDOM()
     LIMIT $2`,
    [campaign.account_email, Math.min(remaining, 3)]
  );

  // Send emails to pool accounts
  for (const poolAccount of poolAccounts.rows) {
    try {
      const { subject, body } = generateWarmupEmail();

      const fromAccount = {
        email: campaign.account_email,
        smtp_host: campaign.smtp_host,
        smtp_port: campaign.smtp_port,
        username: campaign.username,
        display_name: campaign.display_name
      };

      const info = await sendWarmupEmail({
        fromAccount,
        toEmail: poolAccount.email,
        subject,
        body,
        password
      });

      // Record sent email
      await query(
        `INSERT INTO warmup_emails 
          (campaign_id, from_account_id, subject, status, sent_at, message_id)
         VALUES ($1, $2, $3, 'sent', NOW(), $4)`,
        [campaign.id, campaign.email_account_id, subject, info.messageId]
      );

      // Update campaign counts
      await query(
        `UPDATE warmup_campaigns 
         SET current_daily_count = current_daily_count + 1,
             total_sent = total_sent + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [campaign.id]
      );

      // Update pool account usage
      await query(
        `UPDATE warmup_pool SET emails_sent_today = emails_sent_today + 1, last_used = NOW()
         WHERE id = $1`,
        [poolAccount.id]
      );

      logger.info(`Sent warmup email from ${campaign.account_email} to ${poolAccount.email}`);

      // Small delay between sends
      await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000));
    } catch (err) {
      logger.error(`Failed to send warmup email:`, err);
    }
  }

  // Process inbox replies
  try {
    const account = {
      email: campaign.account_email,
      imap_host: campaign.imap_host,
      imap_port: campaign.imap_port,
      smtp_host: campaign.smtp_host,
      smtp_port: campaign.smtp_port,
      username: campaign.username,
      display_name: campaign.display_name
    };

    const inboxResults = await processInbox({ account, password, campaignId: campaign.id });

    if (inboxResults.replied > 0 || inboxResults.spamRescued > 0) {
      await query(
        `UPDATE warmup_campaigns 
         SET total_replied = total_replied + $1, updated_at = NOW()
         WHERE id = $2`,
        [inboxResults.replied, campaign.id]
      );
    }
  } catch (err) {
    logger.error('Inbox processing error:', err);
  }

  // Update reputation score based on activity
  await updateReputationScore(campaign);
}

async function updateReputationScore(campaign) {
  try {
    // Calculate new reputation based on sent/replied ratio
    const ratio = campaign.total_sent > 0
      ? (campaign.total_replied / campaign.total_sent) * 100
      : 0;

    const baseScore = Math.min(100, campaign.current_day * 2);
    const replyBonus = Math.min(20, ratio * 0.5);
    const newScore = Math.round(baseScore + replyBonus);

    await query(
      'UPDATE email_accounts SET reputation_score = $1, updated_at = NOW() WHERE id = $2',
      [newScore, campaign.email_account_id]
    );

    // Update analytics
    await query(
      `INSERT INTO analytics_daily (account_id, date, emails_sent, emails_replied, reputation_score)
       VALUES ($1, CURRENT_DATE, $2, $3, $4)
       ON CONFLICT (account_id, date) DO UPDATE SET
         emails_sent = analytics_daily.emails_sent + $2,
         emails_replied = analytics_daily.emails_replied + $3,
         reputation_score = $4`,
      [campaign.email_account_id, campaign.current_daily_count, campaign.total_replied, newScore]
    );
  } catch (err) {
    logger.error('Error updating reputation:', err);
  }
}

// Daily reset job - runs at midnight
async function dailyResetJob() {
  logger.info('Running daily reset...');
  try {
    // Reset daily counts and advance campaign days
    await query(
      `UPDATE warmup_campaigns 
       SET current_daily_count = 0,
           current_day = current_day + 1,
           updated_at = NOW()
       WHERE status = 'active'`
    );

    // Reset pool account daily counters
    await query('UPDATE warmup_pool SET emails_sent_today = 0');

    logger.info('Daily reset complete');
  } catch (err) {
    logger.error('Daily reset error:', err);
  }
}

export function startScheduler() {
  // Run warmup job every 15 minutes
  cron.schedule('*/15 * * * *', runWarmupJob);

  // Daily reset at midnight
  cron.schedule('0 0 * * *', dailyResetJob);

  logger.info('Scheduler started: warmup every 15min, reset at midnight');
}
