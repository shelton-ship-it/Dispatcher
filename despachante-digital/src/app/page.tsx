import ListaVagas from '@/components/ListaVagas';

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="pt-2">
        <span className="carimbo">Pronto a entregar</span>
        <h1 className="mt-3 text-[30px] leading-[1.1] font-extrabold tracking-tight">A tua candidatura, feita por ti em minutos.</h1>
        <p className="mt-3 text-[17px] text-mute max-w-xl">Escolhe a vaga, responde a algumas perguntas e recebe requerimento, declaração, carta, CV e BI digitalizado — tudo em PDF, com o nome certo em cada ficheiro.</p>
        <ol className="mt-4 grid grid-cols-3 gap-2 text-center text-[13px] font-semibold">
          {['Escolhe a vaga', 'Preenches passo a passo', 'Descarregas ou envias'].map((t, i) => (
            <li key={t} className="card !p-3"><span className="block text-verde text-lg font-extrabold">{i + 1}</span>{t}</li>
          ))}
        </ol>
      </section>
      <ListaVagas />
    </div>
  );
}
