import Landing from '@/components/Landing';
import AvisoModal from '@/components/AvisoModal';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Landing />
      <AvisoModal />
    </main>
  );
}
