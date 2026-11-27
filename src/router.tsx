import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { ConPermiso, InicioSegunPermisos } from '@/components/auth/ConPermiso'
import type { AccionRH, PaginaRH } from '@/api/permisos'
import LoginPage from '@/pages/auth/LoginPage'
import EmpleadosListPage from '@/pages/empleados/EmpleadosListPage'
import EmpleadoDetailPage from '@/pages/empleados/EmpleadoDetailPage'
import EmpleadoCreateWizard from '@/pages/empleados/nuevo/EmpleadoCreateWizard'
import EmpleadoEditPage from '@/pages/empleados/EmpleadoEditPage'
import ActualizacionMasivaPage from '@/pages/empleados/ActualizacionMasivaPage'
import BiometricoPendientesPage from '@/pages/empleados/BiometricoPendientesPage'
import AsistenciasListPage from '@/pages/asistencias/AsistenciasListPage'
import AsistenciaEmpleadoPage from '@/pages/asistencias/AsistenciaEmpleadoPage'
import AusenciasPage from '@/pages/ausencias/AusenciasPage'
import OrganizacionPage from '@/pages/organizacion/OrganizacionPage'
import PlanillaPage from '@/pages/planilla/PlanillaPage'
import HorasExtraPage from '@/pages/horas-extra/HorasExtraPage'
import CargaTurnosPage from '@/pages/carga-turnos/CargaTurnosPage'
import CapacitacionesPage from '@/pages/capacitaciones/CapacitacionesPage'
import ExamenPublicoPage from '@/pages/capacitaciones/ExamenPublicoPage'
import SalaPublicaPage from '@/pages/capacitaciones/SalaPublicaPage'
import PermisosPage from '@/pages/permisos/PermisosPage'

/** Envuelve la pantalla con su permiso (ver t2_Paginas del dominio 'rrhh'). */
const p = (pagina: PaginaRH, el: React.ReactNode, accion?: AccionRH) => (
  <ConPermiso pagina={pagina} accion={accion}>
    {el}
  </ConPermiso>
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/examen/:token', element: <ExamenPublicoPage /> },
  { path: '/sala/:codigo', element: <SalaPublicaPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <InicioSegunPermisos /> },
          { path: 'empleados', element: p('rrhh.empleados', <EmpleadosListPage />) },
          { path: 'empleados/nuevo', element: p('rrhh.empleados', <EmpleadoCreateWizard />, 'crear') },
          { path: 'empleados/actualizacion-masiva', element: p('rrhh.actualizacion-masiva', <ActualizacionMasivaPage />) },
          { path: 'empleados/biometrico', element: p('rrhh.biometrico', <BiometricoPendientesPage />) },
          { path: 'empleados/:id', element: p('rrhh.empleados', <EmpleadoDetailPage />) },
          { path: 'empleados/:id/editar', element: p('rrhh.empleados', <EmpleadoEditPage />, 'editar') },
          { path: 'asistencias', element: p('rrhh.asistencias', <AsistenciasListPage />) },
          { path: 'asistencias/:id', element: p('rrhh.asistencias', <AsistenciaEmpleadoPage />) },
          { path: 'ausencias', element: p('rrhh.ausencias', <AusenciasPage />) },
          { path: 'organizacion', element: p('rrhh.organizacion', <OrganizacionPage />) },
          { path: 'planilla', element: p('rrhh.planilla', <PlanillaPage />) },
          { path: 'horas-extra', element: p('rrhh.horas-extra', <HorasExtraPage />) },
          { path: 'carga-turnos', element: p('rrhh.carga-turnos', <CargaTurnosPage />) },
          { path: 'capacitaciones', element: p('rrhh.capacitaciones', <CapacitacionesPage />) },
          { path: 'permisos', element: p('rrhh.permisos', <PermisosPage />) },
          { path: '*', element: <InicioSegunPermisos /> },
        ],
      },
    ],
  },
])
