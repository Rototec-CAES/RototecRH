import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2, Upload, Video } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { extractApiErrorMessage } from '@/api/client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCreateEvaluacion,
  useCreatePregunta,
  useCreateRespuesta,
  useDeleteEvaluacion,
  useDeletePregunta,
  useDeleteRespuesta,
  useEvaluacion,
  useSubirVideoEvaluacion,
  useUpdateEvaluacion,
} from '@/hooks/useCapacitaciones'
import {
  preguntaSchema,
  respuestaSchema,
  type PreguntaFormValues,
  type RespuestaFormValues,
} from '@/lib/validators'
import type { Evaluacion, ModoEvaluacion, Pregunta } from '@/types'

interface Props {
  idModulo: number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModuloEvaluacionDialog({ idModulo, open, onOpenChange }: Props) {
  const { data, isLoading, isError } = useEvaluacion(open ? idModulo : undefined)
  const createEval = useCreateEvaluacion(idModulo ?? 0)
  const deleteEval = useDeleteEvaluacion(idModulo ?? 0)

  async function onCreate() {
    if (idModulo === undefined) return
    try {
      await createEval.mutateAsync({ idModulo })
      toast.success('Evaluación creada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear')
    }
  }
  async function onDeleteEval() {
    if (!data) return
    if (!window.confirm('¿Eliminar la evaluación completa?')) return
    try {
      await deleteEval.mutateAsync(data.evaluacion.id)
      toast.success('Evaluación eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Evaluación del módulo</DialogTitle>
          <DialogDescription>
            {data?.evaluacion.nombre ?? 'Define un examen de preguntas o un video para la evaluación.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <p className="text-center text-sm text-destructive">Error al cargar la evaluación</p>
        ) : !data ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Este módulo no tiene evaluación todavía.
            </p>
            <Button onClick={onCreate} disabled={createEval.isPending || idModulo === undefined}>
              <Plus className="h-4 w-4" />
              Crear evaluación
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <NombreEvaluacion
              idModulo={idModulo as number}
              idEvaluacion={data.evaluacion.id}
              nombre={data.evaluacion.nombre ?? ''}
            />

            <ModoSelector idModulo={idModulo as number} evaluacion={data.evaluacion} />

            {data.evaluacion.modo === 'VIDEO' ? (
              <VideoEvaluacion idModulo={idModulo as number} evaluacion={data.evaluacion} />
            ) : (
              <>
                {idModulo !== undefined && (
                  <NuevaPregunta idModulo={idModulo} idEvaluacion={data.evaluacion.id} />
                )}

                {data.preguntas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin preguntas todavía</p>
                ) : (
                  data.preguntas.map((p) => (
                    <PreguntaCard key={p.id} idModulo={idModulo as number} pregunta={p} />
                  ))
                )}
              </>
            )}

            <DialogFooter>
              <Button variant="destructive" onClick={onDeleteEval} disabled={deleteEval.isPending}>
                <Trash2 className="h-4 w-4" />
                Eliminar evaluación
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function NombreEvaluacion({
  idModulo,
  idEvaluacion,
  nombre,
}: {
  idModulo: number
  idEvaluacion: number
  nombre: string
}) {
  const updateMut = useUpdateEvaluacion(idModulo)
  const [value, setValue] = useState(nombre)

  useEffect(() => setValue(nombre), [nombre])

  async function onSave() {
    try {
      await updateMut.mutateAsync({ id: idEvaluacion, nombre: value.trim() || undefined })
      toast.success('Nombre actualizado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <div className="flex items-end gap-2 rounded-md border bg-muted/40 p-3">
      <div className="flex-1">
        <Label className="mb-1.5 block">Nombre de la evaluación</Label>
        <Input
          placeholder="Nombre de la evaluación"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <Button onClick={onSave} disabled={updateMut.isPending || value === nombre}>
        <Pencil className="h-4 w-4" />
        Guardar
      </Button>
    </div>
  )
}

const MODOS: { value: ModoEvaluacion; label: string; descripcion: string }[] = [
  { value: 'EXAMEN', label: 'Examen', descripcion: 'Preguntas con respuestas; se aprueba con el porcentaje del módulo.' },
  { value: 'VIDEO', label: 'Video', descripcion: 'El empleado ve el video completo y lo marca como completado.' },
]

function ModoSelector({ idModulo, evaluacion }: { idModulo: number; evaluacion: Evaluacion }) {
  const updateMut = useUpdateEvaluacion(idModulo)

  async function onChange(modo: ModoEvaluacion) {
    if (modo === evaluacion.modo) return
    try {
      await updateMut.mutateAsync({ id: evaluacion.id, modo })
      toast.success(modo === 'VIDEO' ? 'Evaluación en modo video' : 'Evaluación en modo examen')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar el modo')
    }
  }

  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <Label className="mb-2 block">Modo de evaluación</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODOS.map((m) => (
          <label
            key={m.value}
            className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-2 text-sm has-[:checked]:border-primary"
          >
            <input
              type="radio"
              name={`modo-evaluacion-${evaluacion.id}`}
              value={m.value}
              checked={evaluacion.modo === m.value}
              onChange={() => onChange(m.value)}
              disabled={updateMut.isPending}
              className="mt-0.5 accent-primary"
            />
            <span>
              <span className="font-medium">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.descripcion}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

/** Mismo tope que el multipart de cloudflare-service-layer (629145600 bytes). */
const MAX_VIDEO_BYTES = 600 * 1024 * 1024

function VideoEvaluacion({ idModulo, evaluacion }: { idModulo: number; evaluacion: Evaluacion }) {
  const subirMut = useSubirVideoEvaluacion()
  const updateMut = useUpdateEvaluacion(idModulo)
  const inputRef = useRef<HTMLInputElement>(null)
  const [progreso, setProgreso] = useState<number | null>(null)
  const ocupado = progreso !== null || updateMut.isPending

  async function onFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast.error('El archivo debe ser un video')
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error('El video no puede pesar más de 600 MB')
      return
    }
    setProgreso(0)
    try {
      const subido = await subirMut.mutateAsync({ file, onProgress: setProgreso })
      await updateMut.mutateAsync({ id: evaluacion.id, videoUrl: subido.url, videoKey: subido.key })
      toast.success('Video cargado')
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    } finally {
      setProgreso(null)
    }
  }

  async function onQuitar() {
    if (!window.confirm('¿Quitar el video de esta evaluación?')) return
    try {
      await updateMut.mutateAsync({ id: evaluacion.id, videoUrl: null, videoKey: null })
      toast.success('Video quitado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al quitar el video')
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {evaluacion.videoUrl ? (
        <video
          key={evaluacion.videoUrl}
          src={evaluacion.videoUrl}
          controls
          preload="metadata"
          className="aspect-video w-full rounded-md bg-black"
        />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground">
          <Video className="h-8 w-8" />
          Sin video todavía. Los empleados no podrán abrir el enlace hasta que cargues uno.
        </div>
      )}

      {progreso !== null && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progreso}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {progreso < 100 ? `Subiendo… ${progreso}%` : 'Procesando…'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {evaluacion.videoUrl && (
          <Button variant="outline" onClick={onQuitar} disabled={ocupado}>
            <Trash2 className="h-4 w-4" />
            Quitar video
          </Button>
        )}
        <Button onClick={() => inputRef.current?.click()} disabled={ocupado}>
          <Upload className="h-4 w-4" />
          {evaluacion.videoUrl ? 'Reemplazar video' : 'Subir video'}
        </Button>
      </div>
    </div>
  )
}

function NuevaPregunta({ idModulo, idEvaluacion }: { idModulo: number; idEvaluacion: number }) {
  const createMut = useCreatePregunta(idModulo)
  const form = useForm<PreguntaFormValues>({
    resolver: zodResolver(preguntaSchema),
    defaultValues: { pregunta: '' },
  })

  async function onSubmit(values: PreguntaFormValues) {
    try {
      await createMut.mutateAsync({
        idEvaluacion,
        input: { pregunta: values.pregunta, puntosPorRespuesta: values.puntosPorRespuesta },
      })
      toast.success('Pregunta agregada')
      form.reset({ pregunta: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <form
      className="flex items-end gap-2 rounded-md border bg-muted/40 p-3"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex-1">
        <Label className="mb-1.5 block">Nueva pregunta</Label>
        <Input placeholder="Texto de la pregunta" {...form.register('pregunta')} />
        {form.formState.errors.pregunta && (
          <p className="mt-1 text-xs text-destructive">
            {form.formState.errors.pregunta.message}
          </p>
        )}
      </div>
      <div className="w-24">
        <Label className="mb-1.5 block">Puntos</Label>
        <Input type="number" step="any" {...form.register('puntosPorRespuesta')} />
      </div>
      <Button type="submit" disabled={createMut.isPending}>
        <Plus className="h-4 w-4" />
        Agregar
      </Button>
    </form>
  )
}

function PreguntaCard({ idModulo, pregunta }: { idModulo: number; pregunta: Pregunta }) {
  const deletePregunta = useDeletePregunta(idModulo)
  const deleteRespuesta = useDeleteRespuesta(idModulo)
  const createRespuesta = useCreateRespuesta(idModulo)
  const [nueva, setNueva] = useState('')
  const [correcta, setCorrecta] = useState(false)

  async function onDeletePregunta() {
    if (!window.confirm('¿Eliminar esta pregunta?')) return
    try {
      await deletePregunta.mutateAsync(pregunta.id)
      toast.success('Pregunta eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }
  async function onAddRespuesta() {
    const parsed = respuestaSchema.safeParse({ respuesta: nueva, respuestaCorrecta: correcta })
    if (!parsed.success) {
      toast.error('Escribe el texto de la respuesta')
      return
    }
    const values: RespuestaFormValues = parsed.data
    try {
      await createRespuesta.mutateAsync({
        idPregunta: pregunta.id,
        input: { respuesta: values.respuesta, respuestaCorrecta: values.respuestaCorrecta },
      })
      toast.success('Respuesta agregada')
      setNueva('')
      setCorrecta(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }
  async function onDeleteRespuesta(id: number) {
    try {
      await deleteRespuesta.mutateAsync(id)
      toast.success('Respuesta eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{pregunta.pregunta}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeletePregunta}
          disabled={deletePregunta.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ul className="mt-2 space-y-1">
        {pregunta.respuestas.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-sm"
          >
            <span className="flex items-center gap-2">
              {r.respuesta}
              {r.respuestaCorrecta && <Badge variant="success">Correcta</Badge>}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteRespuesta(r.id)}
              disabled={deleteRespuesta.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-end gap-2">
        <div className="flex-1">
          <Input
            placeholder="Nueva respuesta"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={correcta}
            onChange={(e) => setCorrecta(e.target.checked)}
          />
          Correcta
        </label>
        <Button size="sm" onClick={onAddRespuesta} disabled={createRespuesta.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
