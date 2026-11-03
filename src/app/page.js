import { connection } from 'next/server';
import Landing from '@/components/Landing';
import AvisoModal from '@/components/AvisoModal';
import PausaScreen from '@/components/PausaScreen';
import { getPausaState } from '@/lib/pausa';

export default async function Home() {
  // Se decide en cada visita: Mili puede pausar la web desde el admin
  await connection();
  const pausa = await getPausaState();

  if (pausa.enabled) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PausaScreen returnText={pausa.returnText} />
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Landing />
      <AvisoModal />
    </main>
  );
}
