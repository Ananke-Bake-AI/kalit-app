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

/** Outlook-compatible CTA button with gradient background */
function ctaButton(href: string, label: string) {
  return `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:40px;v-text-anchor:middle;width:200px;" arcsize="20%" strokecolor="#8200DF" fillcolor="#8200DF">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<div style="margin: 0; text-align: left;">
  <a href="${href}" style="display: inline-block; padding: 10px 22px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; background-color: #8200DF; background: linear-gradient(135deg, #8200DF, #2F44FF); white-space: nowrap;">
    ${label}
  </a>
</div>
<!--<![endif]-->`
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || APP_URL

function emailLayout(content: string, unsubscribeUrl?: string) {
  const unsubLink = unsubscribeUrl || `${BASE_URL}/unsubscribe`
  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <title>Kalit AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${BASE_URL}" style="text-decoration: none; color: #1a1a2e;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 10px;">
                      <img src="${BASE_URL}/img/email-icon.png" width="32" height="32" alt="" style="display: block; border: 0; border-radius: 6px;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <span style="font-size: 18px; font-weight: 700; color: #1a1a2e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.02em;">Kalit AI</span>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden;">
                <!-- Gradient accent bar -->
                <!--[if mso]>
                <tr><td style="height: 4px; background-color: #8200DF; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                <![endif]-->
                <!--[if !mso]><!-->
                <tr>
                  <td style="height: 4px; background: linear-gradient(to right, #91e500, #12bcff, #8200df, #2f44ff); font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
                <!--<![endif]-->
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 36px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #9ca3af;">
                Kalit AI — Build, Launch, Grow, Secure
              </p>
              <p style="margin: 0 0 16px; font-size: 12px; color: #9ca3af;">
                Merkle Tech Labs LTD. &middot; Northlink Business Centre, Level 2, Triq Burmarrad, Naxxar NXR 6345, Malta
              </p>
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td style="padding: 0 8px;"><a href="https://kalit.ai" style="color: #6b7280; font-size: 12px; text-decoration: none;">Website</a></td>
                  <td style="color: #d1d5db;">&middot;</td>
                  <td style="padding: 0 8px;"><a href="https://x.com/kalit_ai" style="color: #6b7280; font-size: 12px; text-decoration: none;">X</a></td>
                  <td style="color: #d1d5db;">&middot;</td>
                  <td style="padding: 0 8px;"><a href="https://discord.gg/b3cvdcQBAs" style="color: #6b7280; font-size: 12px; text-decoration: none;">Discord</a></td>
                  <td style="color: #d1d5db;">&middot;</td>
                  <td style="padding: 0 8px;"><a href="https://www.linkedin.com/company/kalit-ai" style="color: #6b7280; font-size: 12px; text-decoration: none;">LinkedIn</a></td>
                </tr>
              </table>
              <p style="margin: 0 0 12px; font-size: 11px; color: #d1d5db;">
                &copy; ${new Date().getFullYear()} Kalit AI. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px;">
                <a href="${unsubLink}" style="color: #d1d5db; text-decoration: underline;">Unsubscribe</a>
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
      ${ctaButton(resetUrl, "Reset password")}
      <p style="color: #9ca3af; font-size: 13px; margin-top: 28px; line-height: 1.5;">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
      <p style="color: #d1d5db; font-size: 12px; margin-top: 16px; word-break: break-all;">
        <a href="${resetUrl}" style="color: #8200DF;">${resetUrl}</a>
      </p>
    `),
  })
}

export function buildCampaignEmailHtml(subject: string, body: string, unsubscribeUrl?: string) {
  // Convert simple line breaks to paragraphs and support [button:Label|URL] syntax
  const formatted = body
    .replace(/\[button:(.+?)\|(.+?)\]/g, (_match, label: string, url: string) => ctaButton(url, label))
    .replace(/\[link:(.+?)\|(.+?)\]/g, (_match, label: string, url: string) =>
      `<a href="${url}" style="color: #8200DF; text-decoration: underline;">${label}</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 12px;">')
    .replace(/\n/g, '<br />')

  return emailLayout(`
    <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0 0 16px;">${subject}</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 12px;">${formatted}</p>
  `, unsubscribeUrl)
}

export async function sendBulkEmails(
  emails: { to: string; subject: string; html: string; unsubscribeUrl?: string }[]
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
          headers: {
            "List-Unsubscribe": `<${e.unsubscribeUrl || `${BASE_URL}/unsubscribe`}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
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
      ${ctaButton(verifyUrl, "Verify email address")}
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
