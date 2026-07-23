// Disposable / throwaway email domains we REFUSE at signup and at sign-in.
// A user signed up with test@yopmail.fr — those addresses are free, unlimited,
// anonymous inboxes used to farm free credits and abuse trials, so we block the
// whole family of providers (yopmail alone spans a dozen domains).
//
// This is a CURATED, hand-maintainable allowlist-of-shame — add a domain here
// and it's refused everywhere (isDisposableEmail is used by both the credentials
// register() action and the NextAuth signIn callback, so it also LOCKS OUT any
// existing account that used one). It's intentionally not exhaustive (there are
// thousands); it covers the big providers. For full coverage later, swap the Set
// for the `disposable-email-domains` npm list — the helper below stays the same.
//
// Keep lowercase, one registrable domain per line, alphabetical-ish by provider.
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  // yopmail (the one we saw) — all its known domains
  "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf", "jetable.fr.nf",
  "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf",
  "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf", "hide.biz.st", "mymail.infos.st",
  // mailinator
  "mailinator.com", "mailinator.net", "mailinator2.com", "mailinater.com",
  "notmailinator.com", "sogetthis.com", "reallymymail.com", "binkmail.com",
  "bobmail.info", "safetymail.info", "spamherelots.com", "suremail.info", "veryrealemail.com",
  // guerrillamail
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamailblock.com", "sharklasers.com", "grr.la",
  "spam4.me", "pokemail.net",
  // 10-minute / temp-mail families
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "20minutemail.com",
  "temp-mail.org", "temp-mail.io", "tempmail.com", "tempmailo.com", "tempmail.plus",
  "tempr.email", "tmpmail.org", "tmpmail.net", "tmpeml.com", "tempail.com",
  "tempinbox.com", "minuteinbox.com", "mohmal.com", "emailondeck.com", "throwawaymail.com",
  "dispostable.com", "fakeinbox.com", "mailnesia.com", "mailcatch.com", "maildrop.cc",
  "mintemail.com", "mytemp.email", "luxusmail.org", "getnada.com", "nada.email",
  "inboxbear.com", "harakirimail.com", "spambox.us", "moakt.com", "mvrht.net",
  // trashmail / wegwerf
  "trashmail.com", "trashmail.net", "trashmail.de", "trashmail.io", "wegwerfmail.de",
  "wegwerfmail.net", "wegwerfmail.org", "mailde.de", "byom.de",
  // misc well-known throwaway providers
  "spamgourmet.com", "mailnull.com", "incognitomail.org", "mailexpire.com", "jetable.org",
  "meltmail.com", "spambog.com", "mytrashmail.com", "e4ward.com", "gishpuppy.com",
  "deadaddress.com", "emailias.com", "spamex.com", "anonymbox.com", "discardmail.com",
  "tempemail.net", "cocab.com", "getairmail.com", "fakemail.net", "33mail.com",
  "burnermail.io", "mailsac.com", "inboxkitten.com", "einrot.com", "yepmail.co",
])

/**
 * True when an email's domain belongs to a known disposable/temporary provider.
 * Matches the exact domain OR any sub-domain of a listed domain (e.g.
 * "x@sub.yopmail.fr"). Pure + edge-safe (no I/O) so it can run in the NextAuth
 * signIn callback (used by middleware) as well as server actions.
 */
export function isDisposableEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const at = email.lastIndexOf("@")
  if (at < 0) return false
  const domain = email.slice(at + 1).trim().toLowerCase().replace(/\.$/, "")
  if (!domain) return false
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true
  // sub-domain of a blocked registrable domain (e.g. "mail.yopmail.fr")
  for (const bad of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith("." + bad)) return true
  }
  return false
}
