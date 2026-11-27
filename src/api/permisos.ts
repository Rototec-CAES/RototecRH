import { rrhhApi, USE_MOCK } from './client'

/** Pantallas de la app con permisos (t2_Paginas del dominio 'rrhh'). */
export type PaginaRH =
  | 'rrhh.empleados'
  | 'rrhh.actualizacion-masiva'
  | 'rrhh.biometrico'
  | 'rrhh.organizacion'
  | 'rrhh.capacitaciones'
  | 'rrhh.carga-turnos'
  | 'rrhh.asistencias'
  | 'rrhh.ausencias'
  | 'rrhh.horas-extra'
  | 'rrhh.planilla'
  | 'rrhh.permisos'

export type AccionRH = 'leer' | 'crear' | 'editar' | 'eliminar' | 'aprobar' | 'exportar' | 'ver_salarios'

export interface MisPermisos {
  esSuperadmin: boolean
  /** Claves 'pagina:accion', p. ej. 'rrhh.empleados:leer'. */
  permisos: string[]
}

export interface PaginaPermisos {
  id: number
  codigo: string
  nombre: string
  acciones: { id: number; codigo: string; nombre: string }[]
}

export interface RolPermisos {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  esSuperadmin: boolean
  plataforma: string
  /** Cuántos permisos de la app RH tiene. */
  permisos: number
  usuarios: number
}

export interface UsuarioPermisos {
  id: number
  username: string
  nombre: string | null
  puesto: string | null
  roles: { id: number; nombre: string }[]
}

const realApi = {
  async mios(): Promise<MisPermisos> {
    const { data } = await rrhhApi.get<MisPermisos>('/permisos/mios')
    return data
  },
  async catalogo(): Promise<PaginaPermisos[]> {
    const { data } = await rrhhApi.get<PaginaPermisos[]>('/permisos/catalogo')
    return data
  },
  async roles(): Promise<RolPermisos[]> {
    const { data } = await rrhhApi.get<RolPermisos[]>('/permisos/roles')
    return data
  },
  async crearRol(input: { nombre: string; descripcion?: string }): Promise<{ id: number }> {
    const { data } = await rrhhApi.post<{ id: number }>('/permisos/roles', input)
    return data
  },
  async permisosDeRol(rolId: number): Promise<number[]> {
    const { data } = await rrhhApi.get<number[]>(`/permisos/roles/${rolId}`)
    return data
  },
  async guardarPermisosDeRol(rolId: number, accionIds: number[]): Promise<{ accionIds: number[] }> {
    const { data } = await rrhhApi.put<{ accionIds: number[] }>(`/permisos/roles/${rolId}`, { accionIds })
    return data
  },
  async usuarios(params: { buscar?: string; rolId?: number }): Promise<UsuarioPermisos[]> {
    const { data } = await rrhhApi.get<UsuarioPermisos[]>('/permisos/usuarios', { params })
    return data
  },
  async asignarRol(usuarioId: number, rolId: number): Promise<void> {
    await rrhhApi.post(`/permisos/usuarios/${usuarioId}/roles`, { rolId })
  },
  async quitarRol(usuarioId: number, rolId: number): Promise<void> {
    await rrhhApi.delete(`/permisos/usuarios/${usuarioId}/roles/${rolId}`)
  },
}

// En modo mock (dev offline) todo está permitido.
const mockApi: typeof realApi = {
  async mios() {
    return { esSuperadmin: true, permisos: [] }
  },
  async catalogo() {
    return []
  },
  async roles() {
    return []
  },
  async crearRol() {
    return { id: 0 }
  },
  async permisosDeRol() {
    return []
  },
  async guardarPermisosDeRol(_id, accionIds) {
    return { accionIds }
  },
  async usuarios() {
    return []
  },
  async asignarRol() {},
  async quitarRol() {},
}

export const permisosApi = USE_MOCK ? mockApi : realApi
