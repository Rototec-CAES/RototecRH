import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import { capacitacionesApi } from '@/api/capacitaciones'
import { extractApiErrorMessage } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { SalaPublica } from '@/types'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Participante = SalaPublica['participantes'][number]

/**
 * Página pública de la sala de examen (/sala/:codigo), sin sesión. El empleado busca su nombre,
 * confirma con los últimos 4 dígitos de su DPI y pasa a su examen (/examen/:token).
 */
export default function SalaPublicaPage() {
  const { codigo = '' } = useParams<{ codigo: string }>()
  const navigate = useNavigate()
  const [buscar, setBuscar] = useState('')
  const [elegido, setElegido] = useState<Participante | null>(null)
  const [dpi4, setDpi4] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sala-publica', codigo],
    queryFn: () => capacitacionesApi.getSalaPublica(codigo),
    enabled: !!codigo,
    refetchInterval: 15000,
    retry: false,
  })

  const ingresar = useMutation({
    mutationFn: () => capacitacionesApi.ingresarSala(codigo, { idParticipante: (elegido as Participante).id, dpi4 }),
    onSuccess: ({ token }) => navigate(`/examen/${token}?sala=${encodeURIComponent(codigo)}`),
  })

  const filtrados = useMemo(() => {
    const q = norm(buscar.trim())
    return (data?.participantes ?? []).filter((p) => !q || norm(p.nombre).includes(q))
  }, [data, buscar])

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-3 py-6 sm:justify-center sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <img src="/logo_rototec.png" alt="Rototec" style={{ height: 26, width: 'auto' }} />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Capacitaciones</span>
      </div>

      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white shadow-md">
            <Icon icon="solar:users-group-two-rounded-bold" width={20} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight text-slate-900">{data?.modulo ?? 'Sala de examen'}</h1>
            <p className="truncate text-xs text-slate-500">
              Sala <span className="font-mono font-semibold tracking-widest">{codigo.toUpperCase()}</span>
              {data?.pensum ? ` · ${data.pensum}` : ''}
            </p>
          </div>
        </div>

        <div className="px-5 py-5">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : isError || !data ? (
            <Aviso>{extractApiErrorMessage(error)}</Aviso>
          ) : elegido ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (/^\d{4}$/.test(dpi4)) ingresar.mutate()
              }}
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Vas a entrar como</p>
                <p className="text-lg font-semibold text-slate-900">{elegido.nombre}</p>
              </div>
              <div>
                <label htmlFor="dpi4" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Escribe los últimos 4 dígitos de tu DPI
                </label>
                <Input
                  id="dpi4"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  maxLength={4}
                  value={dpi4}
                  onChange={(e) => setDpi4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="h-14 text-center font-mono text-3xl tracking-[0.5em]"
                  placeholder="••••"
                />
              </div>
              {ingresar.isError && <Aviso>{extractApiErrorMessage(ingresar.error)}</Aviso>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setElegido(null)
                    setDpi4('')
                    ingresar.reset()
                  }}
                >
                  No soy yo
                </Button>
                <Button type="submit" className="flex-1" disabled={dpi4.length !== 4 || ingresar.isPending}>
                  <Icon icon={ingresar.isPending ? 'svg-spinners:180-ring' : 'solar:login-3-bold'} width={18} />
                  Entrar a mi examen
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Busca tu nombre y tócalo para entrar a tu examen.</p>
              <div className="relative">
                <Icon icon="solar:magnifer-linear" width={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input className="h-11 pl-10 text-base" placeholder="Tu nombre" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
              </div>
              <ul className="max-h-[55vh] space-y-1.5 overflow-y-auto">
                {filtrados.map((p) => {
                  const terminado = p.estado === 'terminado'
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={terminado}
                        onClick={() => setElegido(p)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base transition-colors',
                          terminado
                            ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-sky-400 hover:bg-sky-50/50',
                        )}
                      >
                        <span className="truncate">{p.nombre}</span>
                        {terminado ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600">
                            <Icon icon="solar:check-circle-bold" width={16} />
                            Terminado
                          </span>
                        ) : p.estado === 'en_curso' ? (
                          <span className="shrink-0 text-xs text-sky-600">Continuar</span>
                        ) : (
                          <Icon icon="solar:alt-arrow-right-linear" width={18} className="shrink-0 text-slate-400" />
                        )}
                      </button>
                    </li>
                  )
                })}
                {filtrados.length === 0 && (
                  <li className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    No encontramos ese nombre. Si no apareces, avísale al capacitador.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-400">© {new Date().getFullYear()} Rototec S.A.</p>
    </div>
  )
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <Icon icon="solar:danger-triangle-bold" width={18} className="mt-0.5 shrink-0 text-rose-500" />
      <span>{children}</span>
    </div>
  )
}
