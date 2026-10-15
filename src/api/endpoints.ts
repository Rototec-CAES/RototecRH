import type {
  AsignacionTurno,
  AsignacionTurnoInput,
  Atraso,
  AtrasoInput,
  Ausencia,
  AusenciaInput,
  BajaInput,
  Empleado,
  EmpleadoInput,
  RegistroAsistencia,
  RegistroAsistenciaInput,
  Turno,
  TurnoInput,
} from '@/types'
import { empleadosApi } from './employees'
import { asignacionesTurnoApi, turnosApi } from './turnos'
import { atrasosApi, ausenciasApi } from './ausencias'
import { asistenciasApi } from './asistencias'
import { authApi, type AuthUser, type LoginInput, type LoginResult } from './auth'
import { catalogosApi, type Catalogos } from './catalogos'
import { organizacionApi, type ArbolOrganizacional } from './organizacion'

// ==================== Empleados ====================

export const getEmpleados = (): Promise<Empleado[]> => empleadosApi.list()
export const getEmpleado = (id: string): Promise<Empleado> => empleadosApi.get(id)
export const createEmpleado = (input: EmpleadoInput): Promise<Empleado> =>
  empleadosApi.create(input)
export const updateEmpleado = (id: string, input: EmpleadoInput): Promise<Empleado> =>
  empleadosApi.update(id, input)
export const darDeBajaEmpleado = (id: string, baja: BajaInput): Promise<Empleado> =>
  empleadosApi.darDeBaja(id, baja)
export const reactivarEmpleado = (id: string): Promise<Empleado> =>
  empleadosApi.reactivar(id)

// ==================== Turnos ====================

export const getTurnos = (): Promise<Turno[]> => turnosApi.list()
export const getTurno = (id: string): Promise<Turno> => turnosApi.get(id)
export const createTurno = (input: TurnoInput): Promise<Turno> => turnosApi.create(input)
export const updateTurno = (id: string, input: TurnoInput): Promise<Turno> =>
  turnosApi.update(id, input)
export const desactivarTurno = (id: string): Promise<Turno> => turnosApi.desactivar(id)
export const reactivarTurno = (id: string): Promise<Turno> => turnosApi.reactivar(id)

// ==================== Asignaciones de turno ====================

export const getAsignacionesTurno = (): Promise<AsignacionTurno[]> =>
  asignacionesTurnoApi.list()
export const getAsignacionesTurnoPorEmpleado = (
  empleadoId: string,
): Promise<AsignacionTurno[]> => asignacionesTurnoApi.listByEmpleado(empleadoId)
export const createAsignacionTurno = (
  input: AsignacionTurnoInput,
): Promise<AsignacionTurno> => asignacionesTurnoApi.create(input)

// ==================== Ausencias ====================

export const getAusencias = (): Promise<Ausencia[]> => ausenciasApi.list()
export const getAusenciasPorPeriodo = (
  desde: string,
  hasta: string,
): Promise<Ausencia[]> => ausenciasApi.listByPeriodo(desde, hasta)
export const getAusenciasPorEmpleado = (empleadoId: string): Promise<Ausencia[]> =>
  ausenciasApi.listByEmpleado(empleadoId)
export const createAusencia = (input: AusenciaInput): Promise<Ausencia> =>
  ausenciasApi.create(input)
export const updateAusencia = (id: string, input: AusenciaInput): Promise<Ausencia> =>
  ausenciasApi.update(id, input)
export const deleteAusencia = (id: string): Promise<void> => ausenciasApi.remove(id)

// ==================== Atrasos ====================

export const getAtrasos = (): Promise<Atraso[]> => atrasosApi.list()
export const getAtrasosPorPeriodo = (
  desde: string,
  hasta: string,
): Promise<Atraso[]> => atrasosApi.listByPeriodo(desde, hasta)
export const getAtrasosPorEmpleado = (empleadoId: string): Promise<Atraso[]> =>
  atrasosApi.listByEmpleado(empleadoId)
export const createAtraso = (input: AtrasoInput): Promise<Atraso> =>
  atrasosApi.create(input)
export const updateAtraso = (id: string, input: AtrasoInput): Promise<Atraso> =>
  atrasosApi.update(id, input)
export const deleteAtraso = (id: string): Promise<void> => atrasosApi.remove(id)

// ==================== Asistencias ====================

export const getAsistencias = (): Promise<RegistroAsistencia[]> =>
  asistenciasApi.list()
export const getAsistenciasPorPeriodo = (
  desde: string,
  hasta: string,
): Promise<RegistroAsistencia[]> => asistenciasApi.listByPeriodo(desde, hasta)
export const getAsistenciasPorEmpleadoPeriodo = (
  empleadoId: string,
  desde: string,
  hasta: string,
): Promise<RegistroAsistencia[]> =>
  asistenciasApi.listByEmpleadoPeriodo(empleadoId, desde, hasta)
export const upsertAsistencia = (
  input: RegistroAsistenciaInput,
): Promise<RegistroAsistencia> => asistenciasApi.upsert(input)
export const deleteAsistencia = (empleadoId: string, fecha: string): Promise<void> =>
  asistenciasApi.remove(empleadoId, fecha)

// ==================== Auth ====================

export const login = (input: LoginInput): Promise<LoginResult> => authApi.login(input)
export const getMe = (): Promise<AuthUser> => authApi.me()
export const logout = (): Promise<void> => authApi.logout()

// ==================== Catálogos ====================

export const getCatalogos = (): Promise<Catalogos> => catalogosApi.obtenerCatalogos()

export const getArbolOrganizacional = (): Promise<ArbolOrganizacional> =>
  organizacionApi.obtenerArbol()
