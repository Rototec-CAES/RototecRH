import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { capacitacionesApi } from '@/api/capacitaciones'
import type {
  ExamenPublico,
  EnviarRespuestasInput,
  ResultadoExamen,
} from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
      className="aspect-video w-full rounded-md bg-black"
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        {phase === 'confirm' && (
          <>
            <CardHeader>
              <CardTitle>Evaluación</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-40" />
                </div>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    El enlace de examen es inválido o ha expirado. Por favor solicita un nuevo enlace.
                  </AlertDescription>
                </Alert>
              )}
              {examenData && !error && examenData.modo === 'VIDEO' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-semibold">{examenData.nombre ?? 'Evaluación'}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Mira el video completo. No se puede adelantar; al terminar podrás marcarlo como completado.
                    </p>
                  </div>
                  <Button onClick={() => { setPhase('video') }}>
                    Ver video
                  </Button>
                </div>
              )}
              {examenData && !error && examenData.modo !== 'VIDEO' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-semibold">{examenData.nombre ?? 'Evaluación'}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {examenData.preguntas.length} pregunta{examenData.preguntas.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tiempo disponible: {formatTime(DURACION_SEG)}
                    </p>
                  </div>
                  <Button onClick={() => { setPhase('examen') }}>
                    Comenzar examen
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        )}

        {phase === 'examen' && examenData && (
          <>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{examenData.nombre ?? 'Evaluación'}</CardTitle>
              <span className={`text-sm font-mono font-semibold ${timeLeft < 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formatTime(timeLeft)}
              </span>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {examenData.preguntas.map((pregunta, idx) => (
                  <div key={pregunta.idPregunta} className="space-y-2">
                    <p className="font-medium">
                      {idx + 1}. {pregunta.pregunta}
                      {pregunta.puntos != null && (
                        <span className="ml-2 text-xs text-muted-foreground">({pregunta.puntos} pts)</span>
                      )}
                    </p>
                    <div className="space-y-1 pl-2">
                      {pregunta.opciones.map(opcion => (
                        <label
                          key={opcion.idRespuesta}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="radio"
                            name={`pregunta-${pregunta.idPregunta}`}
                            value={opcion.idRespuesta}
                            checked={selected[pregunta.idPregunta] === opcion.idRespuesta}
                            onChange={() =>
                              setSelected(prev => ({
                                ...prev,
                                [pregunta.idPregunta]: opcion.idRespuesta,
                              }))
                            }
                            className="accent-primary"
                          />
                          {opcion.respuesta}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Enviando…' : 'Enviar respuestas'}
                </Button>
              </div>
              {mutation.isError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    Error al enviar las respuestas. Intenta de nuevo.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </>
        )}

        {phase === 'video' && examenData?.videoUrl && (
          <>
            <CardHeader>
              <CardTitle>{examenData.nombre ?? 'Evaluación'}</CardTitle>
            </CardHeader>
            <CardContent>
              <VideoSinAdelantar src={examenData.videoUrl} onTerminado={() => setVideoTerminado(true)} />
              <p className="mt-2 text-sm text-muted-foreground">
                {videoTerminado
                  ? 'Terminaste el video. Ya puedes marcarlo como completado.'
                  : 'El botón se habilita cuando termine el video.'}
              </p>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => mutation.mutate({ videoCompletado: true })}
                  disabled={!videoTerminado || mutation.isPending}
                >
                  {mutation.isPending ? 'Enviando…' : 'Marcar como completado'}
                </Button>
              </div>
              {mutation.isError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    Error al registrar el video como completado. Intenta de nuevo.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </>
        )}

        {phase === 'enviado' && resultado && (
          <>
            <CardHeader>
              <CardTitle>{examenData?.modo === 'VIDEO' ? 'Video completado' : 'Examen enviado'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-center">
                <p className="text-4xl">✅</p>
                <p className="text-lg font-medium">¡Gracias!</p>
                <p className="text-muted-foreground">
                  Tu evaluación fue registrada. Ya podés cerrar esta página.
                </p>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
