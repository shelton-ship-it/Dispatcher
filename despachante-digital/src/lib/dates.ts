export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const mesNome = (m: string) => MESES[Number(m) - 1] || '';
export function hoje() {
  const d = new Date();
  return { d: String(d.getDate()), m: String(d.getMonth() + 1), a: String(d.getFullYear()) };
}
export function anos(desde = 1950, ate = new Date().getFullYear() + 1, desc = true) {
  const out: string[] = [];
  for (let a = ate; a >= desde; a--) out.push(String(a));
  return desc ? out : out.reverse();
}
export function diasNoMes(m: string, a: string) {
  const mm = Number(m) || 1; const aa = Number(a) || 2000;
  return new Date(aa, mm, 0).getDate();
}
export const dataExtenso = (d: string, m: string, a: string) => (d && m && a ? `${d} de ${mesNome(m)} de ${a}` : '');
