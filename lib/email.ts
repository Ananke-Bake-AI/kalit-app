import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.EMAIL_FROM || "Kalit AI <noreply@kalit.ai>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (resend) {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html })
  } else {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`)
    console.log(`[EMAIL] Body: ${html.substring(0, 200)}...`)
  }
}

function emailLayout(content: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kalit AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${APP_URL}" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
                <svg width="32" height="32" viewBox="0 0 82 82" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M71.8779 81.977C71.8779 64.9236 58.0534 51.0991 41 51.0991C23.9466 51.0991 10.1221 64.9236 10.1221 81.977V0.0436401M71.8779 0.0646362C71.8779 17.118 58.0534 30.9426 41 30.9426" stroke="#1a1a2e" stroke-width="6"/>
                </svg>
                <span style="font-size: 20px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.02em;">kalit</span>
              </a>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04);">
              <!-- Gradient accent bar -->
              <div style="height: 4px; background: linear-gradient(to right, #91E500, #12BCFF, #8200DF, #2F44FF);"></div>
              <div style="padding: 40px 36px;">
                ${content}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #9ca3af;">
                Kalit AI — Build, Launch, Grow, Secure
              </p>
              <p style="margin: 0 0 16px; font-size: 12px; color: #9ca3af;">
                Merkle Tech Labs LTD. · Northlink Business Centre, Level 2, Triq Burmarrad, Naxxar NXR 6345, Malta
              </p>
              <div style="margin-bottom: 16px;">
                <a href="https://kalit.ai" style="color: #6b7280; font-size: 12px; text-decoration: none; margin: 0 8px;">Website</a>
                <span style="color: #d1d5db;">·</span>
                <a href="https://x.com/kalit_ai" style="color: #6b7280; font-size: 12px; text-decoration: none; margin: 0 8px;">X</a>
                <span style="color: #d1d5db;">·</span>
                <a href="https://discord.gg/kalit-ai" style="color: #6b7280; font-size: 12px; text-decoration: none; margin: 0 8px;">Discord</a>
                <span style="color: #d1d5db;">·</span>
                <a href="https://www.linkedin.com/company/kalit-ai" style="color: #6b7280; font-size: 12px; text-decoration: none; margin: 0 8px;">LinkedIn</a>
              </div>
              <p style="margin: 0; font-size: 11px; color: #d1d5db;">
                © ${new Date().getFullYear()} Kalit AI. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  await sendEmail({
    to: email,
    subject: "Reset your Kalit password",
    html: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px;">Reset your password</h1>
      <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        We received a request to reset the password for your Kalit account. Click the button below to choose a new password.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-radius: 10px; background: linear-gradient(135deg, #8200DF, #2F44FF);">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
              Reset password
            </a>
          </td>
        </tr>
      </table>
      <p style="color: #9ca3af; font-size: 13px; margin-top: 28px; line-height: 1.5;">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
      <p style="color: #d1d5db; font-size: 12px; margin-top: 16px; word-break: break-all;">
        <a href="${resetUrl}" style="color: #8200DF;">${resetUrl}</a>
      </p>
    `),
  })
}

export function buildCampaignEmailHtml(subject: string, body: string) {
  return emailLayout(`
    <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0 0 16px;">${subject}</h1>
    <div style="color: #374151; font-size: 15px; line-height: 1.7;">
      ${body}
    </div>
  `)
}

export async function sendBulkEmails(
  emails: { to: string; subject: string; html: string }[]
): Promise<{ sent: number; errors: string[] }> {
  if (!resend) {
    console.log(`[EMAIL] Bulk send (dev): ${emails.length} emails`)
    return { sent: emails.length, errors: [] }
  }

  const BATCH_SIZE = 50
  let totalSent = 0
  const errors: string[] = []

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE)

    try {
      await resend.batch.send(
        batch.map((e) => ({
          from: FROM_EMAIL,
          to: e.to,
          subject: e.subject,
          html: e.html,
        }))
      )
      totalSent += batch.length
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${msg}`)
    }

    // Rate-limit: wait 1s between batches
    if (i + BATCH_SIZE < emails.length) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  return { sent: totalSent, errors }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`

  await sendEmail({
    to: email,
    subject: "Verify your Kalit email",
    html: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px;">Verify your email</h1>
      <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
        Welcome to Kalit! You're one step away from building, launching, and growing with AI.
      </p>
      <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Please verify your email address to activate your account and start using all Kalit suites.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-radius: 10px; background: linear-gradient(135deg, #8200DF, #2F44FF);">
            <a href="${verifyUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
              Verify email address
            </a>
          </td>
        </tr>
      </table>
      <div style="margin-top: 28px; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #374151;">What's next?</p>
        <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
          After verifying, you'll get a 14-day free trial with access to all suites — Project, Flow, Marketing, Pentest, and Search — plus 50 credits to get started.
        </p>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
        This link expires in 24 hours. If you didn't create this account, please ignore this email.
      </p>
    `),
  })
}
