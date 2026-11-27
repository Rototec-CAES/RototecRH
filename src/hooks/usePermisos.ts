import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { permisosApi, type AccionRH, type PaginaRH } from '@/api/permisos'
import { useAuth } from '@/hooks/useAuth'

const QK = ['permisos'] as const

export interface PermisosApi {
  /** Aún no se sabe qué puede hacer (primera carga). */
  cargando: boolean
  esSuperadmin: boolean
  /** ¿Puede hacer `accion` en `pagina`? Por defecto pregunta por 'leer' (ver la pantalla). */
  puede: (pagina: PaginaRH, accion?: AccionRH) => boolean
}

/**
 * Permisos del usuario en la app RH (modelo t2_* de la Intranet, dominio 'rrhh').
 * Se refrescan al volver a la pestaña y cada 5 min, así un cambio de permisos llega sin re-login.
 * El backend es quien realmente bloquea: esto solo oculta lo que no se puede usar.
 */
export function usePermisos(): PermisosApi {
  const { user, isAuthenticated } = useAuth()
  const { data, isLoading } = useQuery({
    // El usuario va en la llave: al cambiar de sesión no se reutilizan los permisos del anterior.
    queryKey: [...QK, 'mios', user?.username ?? null] as const,
    queryFn: () => permisosApi.mios(),
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  })

  return useMemo<PermisosApi>(() => {
    const claves = new Set(data?.permisos ?? [])
    const esSuperadmin = data?.esSuperadmin ?? false
    return {
      cargando: isAuthenticated && isLoading,
      esSuperadmin,
      puede: (pagina, accion = 'leer') => esSuperadmin || claves.has(`${pagina}:${accion}`),
    }
  }, [data, isLoading, isAuthenticated])
}

// ── Administración (pantalla Permisos) ──

export const useCatalogoPermisos = () =>
  useQuery({ queryKey: [...QK, 'catalogo'], queryFn: () => permisosApi.catalogo(), staleTime: 10 * 60_000 })

export const useRolesPermisos = () => useQuery({ queryKey: [...QK, 'roles'], queryFn: () => permisosApi.roles() })

export const usePermisosDeRol = (rolId?: number) =>
  useQuery({
    queryKey: [...QK, 'rol', rolId],
    queryFn: () => permisosApi.permisosDeRol(rolId as number),
    enabled: rolId != null,
  })

export const useUsuariosPermisos = (params: { buscar?: string; rolId?: number }, enabled = true) =>
  useQuery({
    queryKey: [...QK, 'usuarios', params.buscar ?? '', params.rolId ?? null],
    queryFn: () => permisosApi.usuarios(params),
    enabled,
  })

function useInvalidar() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: QK })
}

export function useCrearRol() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (input: { nombre: string; descripcion?: string }) => permisosApi.crearRol(input),
    onSuccess: invalidar,
  })
}

export function useGuardarPermisosDeRol() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: ({ rolId, accionIds }: { rolId: number; accionIds: number[] }) =>
      permisosApi.guardarPermisosDeRol(rolId, accionIds),
    onSuccess: invalidar,
  })
}

export function useAsignarRol() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: ({ usuarioId, rolId }: { usuarioId: number; rolId: number }) => permisosApi.asignarRol(usuarioId, rolId),
    onSuccess: invalidar,
  })
}

export function useQuitarRol() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: ({ usuarioId, rolId }: { usuarioId: number; rolId: number }) => permisosApi.quitarRol(usuarioId, rolId),
    onSuccess: invalidar,
  })
}
