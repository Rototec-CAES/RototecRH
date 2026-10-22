import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/**
 * Layout de la app (igual que la Intranet Rototec v2): sidebar oscuro colapsable a la
 * izquierda, barra superior con breadcrumb y el contenido de cada página debajo.
 */
export function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
