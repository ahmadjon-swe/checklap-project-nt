import { Sidebar } from '../../components/layout/sidebar';
import { Navbar } from '../../components/layout/navbar';
import { RouteGuard } from '../../components/auth/route-guard';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard roles={['teacher']}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 overflow-auto content-bg">
            <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
