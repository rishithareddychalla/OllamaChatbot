import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';

export default function Home() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <ChatArea />
    </main>
  );
}
