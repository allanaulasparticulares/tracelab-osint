import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import crypto from 'crypto';

let waClient = null;
let readyPromise = null;

/**
 * Inicializa o cliente do WhatsApp e aguarda o evento `ready`.
 * Usa autenticação local persistente.
 *
 * @returns {Promise<Client>}
 */
async function initWhatsAppClient() {
  if (readyPromise) return readyPromise;

  waClient = new Client({
    authStrategy: new LocalAuth({ clientId: 'tracelab-otp' }),
    puppeteer: { headless: true },
  });

  readyPromise = new Promise((resolve, reject) => {
    waClient.on('qr', (qr) => {
      qrcode.generate(qr, { small: true });
    });

    waClient.once('ready', () => {
      resolve(waClient);
    });

    waClient.once('auth_failure', (message) => {
      reject(new Error(`Falha de autenticação: ${message}`));
    });

    waClient.once('disconnected', () => {
      readyPromise = null;
      waClient = null;
    });
  });

  try {
    await waClient.initialize();
    return await readyPromise;
  } catch (error) {
    readyPromise = null;
    waClient = null;
    throw new Error(`Não foi possível inicializar o cliente WhatsApp: ${error.message}`);
  }
}

/**
 * Envia OTP por WhatsApp e retorna o OTP gerado.
 *
 * @param {string} phoneIntl Número em formato internacional E.164 (ex.: +5511999999999)
 * @param {Object} [options]
 * @param {number} [options.digits=6] Quantidade de dígitos do OTP
 * @param {number} [options.validMinutes=5] Validade em minutos para exibir na mensagem
 * @returns {Promise<string>} OTP gerado
 */
async function sendWhatsAppOtp(phoneIntl, options = {}) {
  const digits = Number.isInteger(options.digits) ? options.digits : 6;
  const validMinutes = Number.isInteger(options.validMinutes) ? options.validMinutes : 5;

  const normalized = String(phoneIntl || '').trim().replace(/\s+/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('Número inválido. Use formato internacional (E.164), ex.: +5511999999999.');
  }

  if (!Number.isInteger(digits) || digits < 4 || digits > 10) {
    throw new Error('Parâmetro `digits` inválido. Use um inteiro entre 4 e 10.');
  }

  if (!Number.isInteger(validMinutes) || validMinutes < 1 || validMinutes > 120) {
    throw new Error('Parâmetro `validMinutes` inválido. Use um inteiro entre 1 e 120.');
  }

  try {
    const client = await initWhatsAppClient();

    const min = 10 ** (digits - 1);
    const max = 10 ** digits;
    const otp = String(crypto.randomInt(min, max));

    const phoneDigits = normalized.replace(/\D/g, '');
    const chatId = `${phoneDigits}@c.us`;

    const exists = await client.isRegisteredUser(chatId);
    if (!exists) {
      throw new Error('O número informado não possui conta WhatsApp ativa.');
    }

    const texto = `🔐 Seu código de verificação é: ${otp}. Válido por ${validMinutes} minutos.`;
    await client.sendMessage(chatId, texto);

    return otp;
  } catch (error) {
    throw new Error(`Falha ao enviar OTP por WhatsApp: ${error.message}`);
  }
}

export {
  initWhatsAppClient,
  sendWhatsAppOtp,
};
