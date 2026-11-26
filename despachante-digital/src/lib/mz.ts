// Números de Moçambique: 9 dígitos, prefixos 84/85 (M-Pesa), 86/87 (e-Mola) e 82/83 (mKesh)
export function localMsisdn(raw: string) {
  let d = String(raw || '').replace(/\D/g, '');
  while (d.length > 9 && d.startsWith('258')) d = d.slice(3);
  return d;
}
export const isMzLocal = (n: string) => /^8[2-7]\d{7}$/.test(n);
export const isMobileMoney = (n: string) => /^8[2-7]\d{7}$/.test(n);
export function operador(n: string): 'mpesa' | 'emola' | 'mkesh' | null {
  if (/^8[45]\d{7}$/.test(n)) return 'mpesa';
  if (/^8[67]\d{7}$/.test(n)) return 'emola';
  if (/^8[23]\d{7}$/.test(n)) return 'mkesh';
  return null;
}
export function formatTel(raw: string) {
  const n = localMsisdn(raw);
  if (n.length !== 9) return raw;
  return `${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}
