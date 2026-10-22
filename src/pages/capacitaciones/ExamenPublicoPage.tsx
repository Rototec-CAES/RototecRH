import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import { capacitacionesApi } from '@/api/capacitaciones'
import type {
  ExamenPublico,
  EnviarRespuestasInput,
  ResultadoExamen,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const DURACION_SEG = 20 * 60 // 20 minutos

type Phase = 'confirm' | 'examen' | 'video' | 'enviado'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Reproductor que no deja adelantar más allá de lo ya visto (retroceder sí).
 * `onTerminado` se dispara al llegar al final, que solo es alcanzable viéndolo completo.
 */
function VideoSinAdelantar({ src, onTerminado }: { src: string; onTerminado: () => void }) {
  const maxVisto = useRef(0)

  return (
    <video
      src={src}
      controls
      playsInline
      disablePictureInPicture
      controlsList="nodownload noplaybackrate"
      preload="metadata"
      className="aspect-video w-full rounded-xl bg-black"
      onTimeUpdate={(e) => {
        const v = e.currentTarget
        if (!v.seeking) maxVisto.current = Math.max(maxVisto.current, v.currentTime)
      }}
      onSeeking={(e) => {
        const v = e.currentTarget
        // Margen de 1s para no pelear con el redondeo del timeupdate.
        if (v.currentTime > maxVisto.current + 1) v.currentTime = maxVisto.current
      }}
      onRateChange={(e) => {
        if (e.currentTarget.playbackRate > 1) e.currentTarget.playbackRate = 1
      }}
      onEnded={onTerminado}
    />
  )
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <Icon icon="solar:danger-triangle-bold" width={18} className="mt-0.5 shrink-0 text-rose-500" />
      <span>{children}</span>
    </div>
  )
}

function Encabezado({ titulo, icono, derecha }: { titulo: string; icono: string; derecha?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white shadow-md">
          <Icon icon={icono} width={20} />
        </span>
        <h1 className="truncate text-lg font-bold leading-tight text-slate-900 sm:text-xl">{titulo}</h1>
      </div>
      {derecha}
    </div>
  )
}

export default function ExamenPublicoPage() {
  const { token } = useParams<{ token: string }>()
  const [phase, setPhase] = useState<Phase>('confirm')
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [timeLeft, setTimeLeft] = useState(DURACION_SEG)
  const [examenData, setExamenData] = useState<ExamenPublico | null>(null)
  const [resultado, setResultado] = useState<ResultadoExamen | null>(null)
  const [videoTerminado, setVideoTerminado] = useState(false)

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['examen', token],
    queryFn: () => capacitacionesApi.getExamenPublico(token!),
    enabled: !!token,
    retry: false,
  })

  useEffect(() => {
    if (data) setExamenData(data)
  }, [data])

  // Countdown timer — only active during 'examen' phase
  useEffect(() => {
    if (phase !== 'examen') return
    if (timeLeft <= 0) {
      handleSubmit()
      return
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  const mutation = useMutation({
    mutationFn: (input: EnviarRespuestasInput) =>
      capacitacionesApi.enviarExamen(token!, input),
    onSuccess: (res) => {
      setResultado(res)
      setPhase('enviado')
    },
  })

  function handleSubmit() {
    if (!examenData) return
    const input: EnviarRespuestasInput = {
      respuestas: examenData.preguntas.map(p => ({
        idPregunta: p.idPregunta,
        idRespuesta: selected[p.idPregunta] ?? null,
      })),
    }
    mutation.mutate(input)
  }

  const titulo = examenData?.nombre ?? 'Evaluación'
  const respondidas = examenData ? examenData.preguntas.filter((p) => selected[p.idPregunta] != null).length : 0

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-3 py-6 sm:justify-center sm:p-6">
      {/* Marca */}
      <div className="mb-5 flex items-center gap-2.5">
        <img src="/logo_rototec.png" alt="Rototec" style={{ height: 26, width: 'auto' }} />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Capacitaciones</span>
      </div>

      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        {phase === 'confirm' && (
          <>
            <Encabezado titulo="Evaluación" icono="solar:diploma-bold" />
            <div className="px-5 py-6 sm:px-7">
              {isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-7 w-56" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              )}
              {error && (
                <ErrorBox>
                  El enlace de examen es inválido o ha expirado. Por favor solicita un nuevo enlace.
                </ErrorBox>
              )}
              {examenData && !error && examenData.modo === 'VIDEO' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xl font-bold text-slate-900 sm:text-2xl">{titulo}</p>
                    <p className="mt-2 flex items-start gap-2 text-base text-slate-600">
                      <Icon icon="solar:videocamera-record-bold" width={20} className="mt-0.5 shrink-0 text-sky-500" />
                      Mira el video completo. No se puede adelantar; al terminar podrás marcarlo como completado.
                    </p>
                  </div>
                  <Button
                    onClick={() => { setPhase('video') }}
                    className="h-12 w-full rounded-xl text-base font-semibold sm:w-auto sm:px-8"
                    data-testid="rh-capacitaciones__examen-btn-ver-video"
                  >
                    <Icon icon="solar:play-bold" width={18} />
                    Ver video
                  </Button>
                </div>
              )}
              {examenData && !error && examenData.modo !== 'VIDEO' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xl font-bold text-slate-900 sm:text-2xl">{titulo}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-base text-slate-700">
                        <Icon icon="solar:question-square-bold" width={20} className="text-sky-500" />
                        {examenData.preguntas.length} pregunta{examenData.preguntas.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-base text-slate-700">
                        <Icon icon="solar:clock-circle-bold" width={20} className="text-sky-500" />
                        Tiempo disponible: {formatTime(DURACION_SEG)}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Al presionar Comenzar empieza a correr el tiempo. Si se acaba, tus respuestas se envían solas.
                    </p>
                  </div>
                  <Button
                    onClick={() => { setPhase('examen') }}
                    className="h-12 w-full rounded-xl text-base font-semibold sm:w-auto sm:px-8"
                    data-testid="rh-capacitaciones__examen-btn-comenzar"
                  >
                    <Icon icon="solar:play-bold" width={18} />
                    Comenzar examen
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'examen' && examenData && (
          <>
            <div className="sticky top-0 z-10 bg-white">
              <Encabezado
                titulo={titulo}
                icono="solar:checklist-minimalistic-bold"
                derecha={
                  <span
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-base font-bold tabular-nums',
                      timeLeft < 60 ? 'animate-pulse bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700',
                    )}
                    title="Tiempo restante"
                  >
                    <Icon icon="solar:clock-circle-bold" width={16} />
                    {formatTime(timeLeft)}
                  </span>
                }
              />
              <div className="h-1 w-full bg-slate-100">
                <div
                  className="h-full bg-sky-500 transition-all"
                  style={{ width: `${examenData.preguntas.length ? (respondidas / examenData.preguntas.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="px-4 py-5 sm:px-7">
              <div className="space-y-5">
                {examenData.preguntas.map((pregunta, idx) => (
                  <div key={pregunta.idPregunta} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-base font-semibold text-slate-900">
                      <span className="mr-1.5 text-sky-600">{idx + 1}.</span>
                      {pregunta.pregunta}
                      {pregunta.puntos != null && (
                        <span className="ml-2 text-xs font-medium text-slate-400">({pregunta.puntos} pts)</span>
                      )}
                    </p>
                    <div className="mt-3 space-y-2">
                      {pregunta.opciones.map(opcion => {
                        const marcada = selected[pregunta.idPregunta] === opcion.idRespuesta
                        return (
                          <label
                            key={opcion.idRespuesta}
                            className={cn(
                              'flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base transition-colors',
                              marcada
                                ? 'border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-500'
                                : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                            )}
                          >
                            <input
                              type="radio"
                              name={`pregunta-${pregunta.idPregunta}`}
                              value={opcion.idRespuesta}
                              checked={marcada}
                              onChange={() =>
                                setSelected(prev => ({
                                  ...prev,
                                  [pregunta.idPregunta]: opcion.idRespuesta,
                                }))
                              }
                              className="h-5 w-5 shrink-0 accent-sky-500"
                            />
                            {opcion.respuesta}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-sm text-slate-500 sm:text-left">
                  Respondiste {respondidas} de {examenData.preguntas.length}
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className="h-12 rounded-xl bg-emerald-600 px-8 text-base font-semibold hover:bg-emerald-700"
                  data-testid="rh-capacitaciones__examen-btn-enviar"
                >
                  <Icon icon={mutation.isPending ? 'svg-spinners:180-ring' : 'solar:plain-bold'} width={18} />
                  {mutation.isPending ? 'Enviando…' : 'Enviar respuestas'}
                </Button>
              </div>
              {mutation.isError && (
                <div className="mt-4">
                  <ErrorBox>Error al enviar las respuestas. Intenta de nuevo.</ErrorBox>
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'video' && examenData?.videoUrl && (
          <>
            <Encabezado titulo={titulo} icono="solar:videocamera-record-bold" />
            <div className="px-4 py-5 sm:px-7">
              <VideoSinAdelantar src={examenData.videoUrl} onTerminado={() => setVideoTerminado(true)} />
              <p
                className={cn(
                  'mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm',
                  videoTerminado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600',
                )}
              >
                <Icon
                  icon={videoTerminado ? 'solar:check-circle-bold' : 'solar:info-circle-bold'}
                  width={18}
                  className="shrink-0"
                />
                {videoTerminado
                  ? 'Terminaste el video. Ya puedes marcarlo como completado.'
                  : 'El botón se habilita cuando termine el video.'}
              </p>
              <div className="mt-5 flex justify-end">
                <Button
                  onClick={() => mutation.mutate({ videoCompletado: true })}
                  disabled={!videoTerminado || mutation.isPending}
                  className="h-12 w-full rounded-xl bg-emerald-600 px-8 text-base font-semibold hover:bg-emerald-700 sm:w-auto"
                  data-testid="rh-capacitaciones__examen-btn-completar-video"
                >
                  <Icon icon={mutation.isPending ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} width={18} />
                  {mutation.isPending ? 'Enviando…' : 'Marcar como completado'}
                </Button>
              </div>
              {mutation.isError && (
                <div className="mt-4">
                  <ErrorBox>Error al registrar el video como completado. Intenta de nuevo.</ErrorBox>
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'enviado' && resultado && (
          <>
            <Encabezado
              titulo={examenData?.modo === 'VIDEO' ? 'Video completado' : 'Examen enviado'}
              icono="solar:check-circle-bold"
            />
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon icon="solar:check-circle-bold" width={36} />
              </span>
              <p className="text-xl font-bold text-slate-900">¡Gracias!</p>
              <p className="max-w-sm text-base text-slate-600">
                Tu evaluación fue registrada. Ya podés cerrar esta página.
              </p>
            </div>
          </>
        )}
      </div>

      <p className="mt-5 text-xs text-slate-400">© {new Date().getFullYear()} Rototec S.A.</p>
    </div>
  )
}
