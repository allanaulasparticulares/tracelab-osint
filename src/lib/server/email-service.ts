type SendEmailResult = {
  delivered: boolean;
  simulated: boolean;
};

export async function sendOtpEmail(email: string, otp: string, minutes: number): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'TraceLab <no-reply@tracelab.local>';

  const subject = 'Seu código de verificação - TraceLab';
  const text = `🔐 Seu código de verificação é: ${otp}. Válido por ${minutes} minutos.`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2>TraceLab - Verificação</h2>
      <p>Seu código de verificação é:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 3px;">${otp}</p>
      <p>Válido por ${minutes} minutos.</p>
      <p style="color:#666; font-size:12px;">Se você não solicitou este código, ignore este email.</p>
    </div>
  `;

  if (!host || !user || !pass) {
    console.log(`[OTP-DEV] ${email} -> ${otp} (validade: ${minutes} min)`);
    return { delivered: true, simulated: true };
  }

  const nodemailer = loadNodemailer();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from,
    to: email,
    subject,
    text,
    html
  });

  return { delivered: true, simulated: false };
}

function loadNodemailer(): {
  createTransport: (options: unknown) => {
    sendMail: (mail: unknown) => Promise<unknown>;
  };
} {
  try {
    // Optional runtime dependency to avoid build break when package is not installed.
    const req = (0, eval)('require') as (name: string) => unknown;
    const mod = req('nodemailer') as { createTransport?: unknown; default?: { createTransport?: unknown } };
    const maybe = (mod?.createTransport || mod?.default?.createTransport) as
      | ((options: unknown) => { sendMail: (mail: unknown) => Promise<unknown> })
      | undefined;

    if (!maybe) {
      throw new Error('API createTransport não encontrada.');
    }

    return { createTransport: maybe };
  } catch {
    throw new Error(
      'SMTP configurado, mas nodemailer não está instalado. Execute: npm install nodemailer'
    );
  }
}
