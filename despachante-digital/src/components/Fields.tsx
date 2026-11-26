'use client';
import { MESES, anos, diasNoMes } from '@/lib/dates';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}{hint && <p className="hint">{hint}</p>}</div>;
}
export function Txt({ value, onChange, ...r }: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return <input className="input" value={value} onChange={e => onChange(e.target.value)} {...r} />;
}
export function Area({ value, onChange, rows = 4, ...r }: { value: string; onChange: (v: string) => void; rows?: number } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'>) {
  return <textarea className="input py-3 leading-relaxed" rows={rows} value={value} onChange={e => onChange(e.target.value)} {...r} />;
}
/** Selectores de dia / mês / ano — sem teclado, ideal para telemóvel. */
export function DataSel({ d, m, a, onChange, desde = 1940, ate }: { d: string; m: string; a: string; onChange: (v: { d: string; m: string; a: string }) => void; desde?: number; ate?: number }) {
  const max = m && a ? diasNoMes(m, a) : 31;
  const set = (k: 'd' | 'm' | 'a', v: string) => {
    const n = { d, m, a, [k]: v };
    if (n.d && n.m && n.a && Number(n.d) > diasNoMes(n.m, n.a)) n.d = String(diasNoMes(n.m, n.a));
    onChange(n);
  };
  return (
    <div className="grid grid-cols-[1fr_1.7fr_1.2fr] gap-2">
      <select className="input px-2" aria-label="Dia" value={d} onChange={e => set('d', e.target.value)}><option value="">Dia</option>{Array.from({ length: max }, (_, i) => <option key={i} value={String(i + 1)}>{i + 1}</option>)}</select>
      <select className="input px-2" aria-label="Mês" value={m} onChange={e => set('m', e.target.value)}><option value="">Mês</option>{MESES.map((x, i) => <option key={x} value={String(i + 1)}>{x}</option>)}</select>
      <select className="input px-2" aria-label="Ano" value={a} onChange={e => set('a', e.target.value)}><option value="">Ano</option>{anos(desde, ate ?? new Date().getFullYear()).map(x => <option key={x}>{x}</option>)}</select>
    </div>
  );
}
export function AnoSel({ value, onChange, extra, placeholder = 'Ano' }: { value: string; onChange: (v: string) => void; extra?: string; placeholder?: string }) {
  return <select className="input px-2" value={value} onChange={e => onChange(e.target.value)}><option value="">{placeholder}</option>{extra && <option>{extra}</option>}{anos(1970, new Date().getFullYear() + 1).map(x => <option key={x}>{x}</option>)}</select>;
}
export function Passo({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return <section className="space-y-4"><div><h2 className="text-[22px] font-extrabold leading-tight">{titulo}</h2>{sub && <p className="text-mute mt-1">{sub}</p>}</div>{children}</section>;
}
