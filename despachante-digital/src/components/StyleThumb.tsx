import type { CvStyle } from '@/lib/cvstyles';

/** Miniatura leve (SVG) do modelo — mostra a estrutura e as cores sem gerar nenhum PDF. */
export default function StyleThumb({ s }: { s: CvStyle }) {
  const { palette: p, recipe: r } = s; const c = r.composition;
  const L = (x: number, y: number, w: number, o = 1) => <rect x={x} y={y} width={w} height={2} rx={1} fill={p.muted} opacity={0.5 * o} />;
  const lines = (x: number, y: number, w: number, n: number) => Array.from({ length: n }, (_, i) => <g key={i}>{L(x, y + i * 6, i % 3 === 2 ? w * 0.6 : w)}</g>);
  const head = (x: number, y: number, w: number, dark = false) => <><rect x={x} y={y} width={w * 0.7} height={5} rx={1} fill={dark ? '#fff' : p.ink} /><rect x={x} y={y + 8} width={w * 0.4} height={3} rx={1} fill={p.accent} /></>;
  return (
    <svg viewBox="0 0 100 141" className="w-full h-auto rounded border border-line" aria-hidden="true" style={{ background: p.paper }}>
      {(c === 'sidebar-left') && <><rect width={32} height={141} fill={p.ink} />{lines(5, 50, 22, 8).map((e, i) => <g key={i} opacity={0.6}>{e}</g>)}<circle cx={16} cy={20} r={9} fill={p.accent} opacity={0.8} />{head(38, 12, 58)}{lines(38, 36, 58, 9)}{lines(38, 96, 58, 6)}</>}
      {(c === 'sidebar-right') && <><rect x={68} width={32} height={141} fill={p.ink} /><circle cx={84} cy={20} r={9} fill={p.accent} opacity={0.8} />{head(8, 12, 54)}{lines(8, 36, 54, 9)}{lines(8, 96, 54, 6)}</>}
      {(c === 'split' || c === 'modular') && <><rect width={100} height={36} fill={p.ink} />{head(8, 10, 84, true)}{lines(8, 46, c === 'split' ? 32 : 40, 12)}{lines(c === 'split' ? 46 : 54, 46, c === 'split' ? 46 : 38, 14)}</>}
      {c === 'editorial' && <>{head(8, 10, 84)}<rect x={8} y={26} width={84} height={1.5} fill={p.ink} />{lines(8, 36, 52, 14)}{lines(66, 36, 26, 10)}</>}
      {(c === 'single' || c === 'timeline' || c === 'framed' || c === 'offset' || c === 'rail') && <>
        {c === 'rail' && <rect width={8} height={141} fill={p.ink} />}{c === 'offset' && <rect width={100} height={30} fill={p.rule} />}{c === 'framed' && <rect x={3} y={3} width={94} height={135} fill="none" stroke={p.accent} />}
        {head(c === 'rail' ? 16 : 10, 10, 80)}<rect x={c === 'rail' ? 16 : 10} y={26} width={76} height={1.2} fill={p.accent} />{lines(c === 'rail' ? 16 : 10, 34, 78, 15)}</>}
    </svg>
  );
}
