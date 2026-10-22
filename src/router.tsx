import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import LoginPage from '@/pages/auth/LoginPage'
import EmpleadosListPage from '@/pages/empleados/EmpleadosListPage'
import EmpleadoDetailPage from '@/pages/empleados/EmpleadoDetailPage'
import EmpleadoCreateWizard from '@/pages/empleados/nuevo/EmpleadoCreateWizard'
import EmpleadoEditPage from '@/pages/empleados/EmpleadoEditPage'
import ActualizacionMasivaPage from '@/pages/empleados/ActualizacionMasivaPage'
import AsistenciasListPage from '@/pages/asistencias/AsistenciasListPage'
import AsistenciaEmpleadoPage from '@/pages/asistencias/AsistenciaEmpleadoPage'
import AusenciasPage from '@/pages/ausencias/AusenciasPage'
import OrganizacionPage from '@/pages/organizacion/OrganizacionPage'
import PlanillaPage from '@/pages/planilla/PlanillaPage'
import HorasExtraPage from '@/pages/horas-extra/HorasExtraPage'
import CargaTurnosPage from '@/pages/carga-turnos/CargaTurnosPage'
import CapacitacionesPage from '@/pages/capacitaciones/CapacitacionesPage'
import ExamenPublicoPage from '@/pages/capacitaciones/ExamenPublicoPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/examen/:token', element: <ExamenPublicoPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/empleados" replace /> },
          { path: 'empleados', element: <EmpleadosListPage /> },
          { path: 'empleados/nuevo', element: <EmpleadoCreateWizard /> },
          { path: 'empleados/actualizacion-masiva', element: <ActualizacionMasivaPage /> },
          { path: 'empleados/:id', element: <EmpleadoDetailPage /> },
          { path: 'empleados/:id/editar', element: <EmpleadoEditPage /> },
          { path: 'asistencias', element: <AsistenciasListPage /> },
          { path: 'asistencias/:id', element: <AsistenciaEmpleadoPage /> },
          { path: 'ausencias', element: <AusenciasPage /> },
          { path: 'organizacion', element: <OrganizacionPage /> },
          { path: 'planilla', element: <PlanillaPage /> },
          { path: 'horas-extra', element: <HorasExtraPage /> },
          { path: 'carga-turnos', element: <CargaTurnosPage /> },
          { path: 'capacitaciones', element: <CapacitacionesPage /> },
          { path: '*', element: <Navigate to="/empleados" replace /> },
        ],
      },
    ],
  },
])
