import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { logger } from '../utils/logger.js';

// Test SMTP + IMAP connection
export async function testConnection({ smtpHost, smtpPort, imapHost, imapPort, username, password, email }) {
  const results = { smtp: false, imap: false, success: false, error: null };

  // Test SMTP
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: username, pass: password },
      tls: { rejectUnauthorized: false }
    });

    await transporter.verify();
    results.smtp = true;
  } catch (err) {
    results.error = `SMTP: ${err.message}`;
    return results;
  }

  // Test IMAP
  try {
    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: true,
      auth: { user: username, pass: password },
      tls: { rejectUnauthorized: false },
      logger: false
    });

    await client.connect();
    await client.logout();
    results.imap = true;
  } catch (err) {
    results.error = `IMAP: ${err.message}`;
    return results;
  }

  results.success = results.smtp && results.imap;
  return results;
}

// Send a warmup email
export async function sendWarmupEmail({ fromAccount, toEmail, subject, body, password }) {
  const transporter = nodemailer.createTransport({
    host: fromAccount.smtp_host,
    port: fromAccount.smtp_port,
    secure: fromAccount.smtp_port === 465,
    auth: {
      user: fromAccount.username,
      pass: password
    },
    tls: { rejectUnauthorized: false }
  });

  const info = await transporter.sendMail({
    from: `"${fromAccount.display_name}" <${fromAccount.email}>`,
    to: toEmail,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
    headers: {
      'X-Warmup': 'true',
      'X-Priority': '3'
    }
  });

  return info;
}

// Check inbox and reply to warmup emails
export async function processInbox({ account, password, campaignId }) {
  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: true,
    auth: { user: account.username, pass: password },
    tls: { rejectUnauthorized: false },
    logger: false
  });

  const results = { replied: 0, spamRescued: 0, errors: [] };

  try {
    await client.connect();

    // Check spam folder first
    try {
      const spamFolders = ['[Gmail]/Spam', 'Junk', 'Spam', 'Junk Email'];
      for (const folder of spamFolders) {
        try {
          await client.mailboxOpen(folder);
          const messages = await client.search({ header: { 'X-Warmup': 'true' } });
          
          if (messages.length > 0) {
            // Move from spam to inbox
            await client.messageMove(messages, 'INBOX');
            results.spamRescued += messages.length;
            logger.info(`Rescued ${messages.length} emails from spam for ${account.email}`);
          }
        } catch (e) {
          // Folder might not exist, skip
        }
      }
    } catch (e) {
      // Spam check failed, continue
    }

    // Process inbox for warmup emails to reply to
    await client.mailboxOpen('INBOX');
    const warmupMessages = await client.search({
      header: { 'X-Warmup': 'true' },
      seen: false
    });

    for (const uid of warmupMessages.slice(0, 10)) {
      try {
        const message = await client.fetchOne(uid, { 
          envelope: true, 
          bodyStructure: true,
          source: true 
        });

        if (message?.envelope?.from?.[0]) {
          const fromEmail = message.envelope.from[0].address;
          const subject = message.envelope.subject || 'Re: Warmup';
          
          // Generate a reply
          const replyBody = generateReply();
          
          const transporter = nodemailer.createTransport({
            host: account.smtp_host,
            port: account.smtp_port,
            secure: account.smtp_port === 465,
            auth: { user: account.username, pass: password },
            tls: { rejectUnauthorized: false }
          });

          await transporter.sendMail({
            from: `"${account.display_name}" <${account.email}>`,
            to: fromEmail,
            subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
            text: replyBody,
            html: `<p>${replyBody}</p>`,
            headers: { 'X-Warmup': 'true' }
          });

          // Mark as read
          await client.messageFlagsAdd(uid, ['\\Seen']);
          results.replied++;
        }
      } catch (err) {
        results.errors.push(err.message);
      }
    }

    await client.logout();
  } catch (err) {
    logger.error('IMAP processing error:', err);
    results.errors.push(err.message);
  }

  return results;
}

// Generate realistic warmup email content
export function generateWarmupEmail() {
  const subjects = [
    'Following up on our conversation',
    'Quick question for you',
    'Checking in',
    'Wanted to share this with you',
    'Thoughts on this?',
    'Any updates?',
    'Circling back',
    'Just wanted to reach out',
    'Ideas for improvement',
    'Collaboration opportunity'
  ];

  const bodies = [
    `Hi there,\n\nHope you're having a great week! I wanted to reach out and see how things are going on your end.\n\nWe've been working on some exciting projects lately and thought you might find them interesting. Let me know if you'd like to connect sometime.\n\nBest regards`,
    `Hello,\n\nI hope this message finds you well. I've been meaning to get in touch for a while now.\n\nWould love to catch up and hear about what you've been working on. Looking forward to your response.\n\nBest`,
    `Hi,\n\nJust wanted to touch base with you regarding our recent discussions. I think there's a lot of potential for collaboration here.\n\nLet me know your thoughts when you get a chance.\n\nThanks so much`,
    `Good day,\n\nI hope everything is going smoothly on your end. I've been thinking about some ideas that might be beneficial for both of us.\n\nWould you be available for a quick call this week?\n\nKind regards`,
    `Hello there,\n\nThank you for your continued support. I wanted to share some updates and get your feedback.\n\nI think you'll find this quite interesting. Let me know what you think!\n\nWarm regards`
  ];

  return {
    subject: subjects[Math.floor(Math.random() * subjects.length)],
    body: bodies[Math.floor(Math.random() * bodies.length)]
  };
}

function generateReply() {
  const replies = [
    'Thanks for reaching out! Things are going well on my end. Looking forward to connecting more soon.',
    'Great to hear from you! I appreciate you taking the time to write. Will get back to you with more details shortly.',
    'Thanks for the message! This sounds very interesting. I\'ll review and get back to you.',
    'Appreciate you reaching out. Sounds great, let\'s definitely connect soon!',
    'Thank you! This is helpful. I\'ll look into it and follow up.',
    'Thanks for touching base. Things are busy but good! Let\'s catch up soon.',
    'Received, thanks! This is exactly what I was looking for. Will respond in full soon.'
  ];

  return replies[Math.floor(Math.random() * replies.length)];
}
