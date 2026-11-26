import nodemailer, { type Transporter } from "nodemailer";

type Mail = { to: string; subject: string; text: string; html: string };

let transport: Transporter | null = null;

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export async function sendMail(mail: Mail) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[mail:dev] Ke ${mail.to} — ${mail.subject}\n${mail.text}\n`);
      return;
    }
    throw new Error("SMTP belum dikonfigurasi.");
  }
  await getTransport().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function resetOtpMail(opts: { name: string; site: string; otp: string; minutes: number }) {
  const { name, site, otp, minutes } = opts;
  const text = [
    `Halo ${name},`,
    "",
    `Kode untuk mengatur ulang kata sandi akun ${site} kamu:`,
    "",
    `    ${otp}`,
    "",
    `Kode berlaku ${minutes} menit dan hanya bisa dipakai sekali.`,
    "Kalau kamu tidak meminta reset kata sandi, abaikan email ini. Kata sandimu tetap aman.",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1c1a17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #e6e0d6;border-radius:14px">
<tr><td style="padding:28px 28px 8px;font-size:15px;font-weight:700">${esc(site)}</td></tr>
<tr><td style="padding:8px 28px 0;font-size:15px;line-height:1.6">Halo ${esc(name)},<br>pakai kode ini untuk mengatur ulang kata sandi kamu:</td></tr>
<tr><td style="padding:20px 28px"><div style="font-size:32px;font-weight:700;letter-spacing:10px;text-align:center;background:#fff4ea;border:1px dashed #ff7a1a;border-radius:10px;padding:14px 0;color:#c2540a">${esc(otp)}</div></td></tr>
<tr><td style="padding:0 28px 28px;font-size:13px;line-height:1.6;color:#6b645a">Berlaku ${minutes} menit dan hanya bisa dipakai sekali. Kalau kamu tidak meminta ini, abaikan saja email ini — kata sandimu tetap aman dan jangan berikan kode ini ke siapa pun.</td></tr>
</table></td></tr></table></body></html>`;

  return { subject: `${otp} adalah kode reset kata sandi ${site}`, text, html };
}
