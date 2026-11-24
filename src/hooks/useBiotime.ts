import { useQuery } from '@tanstack/react-query'
import { biotimeApi } from '@/api/biotime'

const HORA = 1000 * 60 * 60

export const useBiotimeDepartamentos = () =>
  useQuery({ queryKey: ['biotime', 'departamentos'], queryFn: () => biotimeApi.departamentos(), staleTime: HORA })

export const useBiotimeUbicaciones = () =>
  useQuery({ queryKey: ['biotime', 'ubicaciones'], queryFn: () => biotimeApi.ubicaciones(), staleTime: HORA })

export const useBiotimePosiciones = () =>
  useQuery({ queryKey: ['biotime', 'posiciones'], queryFn: () => biotimeApi.posiciones(), staleTime: HORA })
