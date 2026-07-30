import QRCode from 'qrcode';

/** Renders a QR code for the given URL as a data URL, entirely offline. */
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 240 });
}
