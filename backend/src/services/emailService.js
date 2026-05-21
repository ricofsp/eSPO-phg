const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const DEFAULT_CC = ['dir.phg@primayahospital.com', 'qua.phg@primayahospital.com'];

async function send({ to, subject, html, cc = [] }) {
  if (!process.env.SMTP_USER) return; // skip jika SMTP belum dikonfigurasi
  try {
    await transporter.sendMail({
      from: `"SPO Digital" <${process.env.SMTP_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc.length ? cc.join(', ') : undefined,
      subject,
      html,
    });
  } catch (err) {
    console.error('[Email] Gagal kirim:', err.message);
  }
}

const tpl = (body) => `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#F97316;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:white;margin:0;font-size:18px">SPO Digital — Primaya Hospital Group</h2>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    ${body}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="color:#6b7280;font-size:12px;margin:0">Email otomatis dari sistem SPO Digital. Jangan balas email ini.</p>
  </div>
</div>`;

module.exports = {
  async notifMutuRS({ emails, formulirNama, departemen, rsPengaju }) {
    await send({
      to: emails,
      subject: `[SPO Digital] Pengajuan Formulir Baru: ${formulirNama}`,
      html: tpl(`
        <p>Halo Tim Mutu RS,</p>
        <p>Ada pengajuan formulir baru yang memerlukan review Anda:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Nama Formulir</td><td style="padding:8px;font-weight:600">${formulirNama}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Departemen</td><td style="padding:8px">${departemen}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">RS Pengaju</td><td style="padding:8px">${rsPengaju}</td></tr>
        </table>
        <p>Silakan login ke sistem untuk melakukan review.</p>
      `),
    });
  },
  async notifMutuCorp({ emails, formulirNama, departemen, action }) {
    const isApprove = action === 'approve';
    await send({
      to: emails,
      subject: `[SPO Digital] Formulir ${isApprove ? 'Diteruskan ke Mutu Corp' : 'Siap Design'}: ${formulirNama}`,
      html: tpl(`
        <p>Halo Tim Mutu Corp,</p>
        <p>Formulir berikut ${isApprove ? 'telah disetujui Mutu RS dan menunggu review Anda' : 'telah selesai di-design dan siap di-finalize'}:</p>
        <p><strong>${formulirNama}</strong> — ${departemen}</p>
        <p>Silakan login ke sistem untuk melakukan tindakan.</p>
      `),
    });
  },
  async notifDesignCorp({ emails, formulirNama, departemen }) {
    await send({
      to: emails,
      subject: `[SPO Digital] Formulir Siap Didesain: ${formulirNama}`,
      html: tpl(`
        <p>Halo Tim Design Corp,</p>
        <p>Formulir berikut telah disetujui Mutu Corp dan siap didesain:</p>
        <p><strong>${formulirNama}</strong> — ${departemen}</p>
        <p>Silakan login ke sistem untuk mengupload file final (7 file: PDF + DOCX).</p>
      `),
    });
  },
  async notifReject({ emails, formulirNama, rejectedBy, comment }) {
    await send({
      to: emails,
      subject: `[SPO Digital] Pengajuan Formulir Ditolak: ${formulirNama}`,
      html: tpl(`
        <p>Halo,</p>
        <p>Pengajuan formulir Anda telah <strong style="color:#dc2626">ditolak</strong> oleh <strong>${rejectedBy}</strong>.</p>
        <p><strong>${formulirNama}</strong></p>
        ${comment ? `<p><strong>Komentar:</strong></p><blockquote style="border-left:3px solid #e5e7eb;padding-left:12px;color:#374151">${comment}</blockquote>` : ''}
        <p>Silakan login ke sistem untuk melihat detail dan mengajukan ulang jika diperlukan.</p>
      `),
    });
  },
  async notifReleased({ toKadiv, toRS, formulirNama, departemen }) {
    const all = [...new Set([...toKadiv, ...toRS, ...DEFAULT_CC])];
    await send({
      to: all,
      subject: `[SPO Digital] Formulir Released: ${formulirNama}`,
      html: tpl(`
        <p>Halo,</p>
        <p>Formulir berikut telah <strong style="color:#16a34a">dirilis</strong> dan siap digunakan:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Nama Formulir</td><td style="padding:8px;font-weight:600">${formulirNama}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Departemen</td><td style="padding:8px">${departemen}</td></tr>
        </table>
        <p>Silakan login ke sistem untuk mengakses file formulir.</p>
      `),
    });
  },
};
