export function bufferToBase64Url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

export function base64UrlToBuffer(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

export function utf8ToBase64Url(value: string): string {
  return bufferToBase64Url(Buffer.from(value, 'utf8'));
}

export function base64UrlToUtf8(value: string): string {
  return base64UrlToBuffer(value).toString('utf8');
}
