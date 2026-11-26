'use client';
import Link from 'next/link';
import Wizard from '@/components/Wizard';
import { useVaga } from '@/components/useVaga';

export default function Candidatura({ params }: { params: { id: string } }) {
  const { vaga, done } = useVaga(params.id);
  if (!done) return null;
  if (!vaga) return <div className="card">Vaga não encontrada. <Link className="text-verde font-semibold" href="/">Voltar ao início</Link></div>;
  return <Wizard vaga={vaga} />;
}
