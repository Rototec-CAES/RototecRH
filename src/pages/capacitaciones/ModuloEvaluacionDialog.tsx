import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'
import { toast } from '@/components/ui/sonner'
import { extractApiErrorMessage } from '@/api/client'

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
import { EmptyState } from '@/components/shared/DataTable'
import { confirmar } from '@/components/shared/ConfirmDialog'
import { Tag } from '@/shared/report/report-ui'
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
    const ok = await confirmar({ titulo: '¿Eliminar la evaluación completa?', textoConfirmar: 'Eliminar', peligro: true })
    if (!ok) return
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
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white">
              <Icon icon="solar:clipboard-list-bold" width={16} />
            </span>
            Evaluación del módulo
          </DialogTitle>
          <DialogDescription>
            {data?.evaluacion.nombre ?? 'Define un examen de preguntas o un video para la evaluación.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <EmptyState icon="solar:danger-triangle-bold" title="No se pudo cargar la evaluación" description="Cierra y vuelve a abrir." />
        ) : !data ? (
          <div className="flex flex-col items-center pb-6">
            <EmptyState
              icon="solar:clipboard-list-bold"
              title="Este módulo no tiene evaluación todavía"
              description="Créala para poder agregar preguntas o un video."
              className="pb-4"
            />
            <Button onClick={onCreate} disabled={createEval.isPending || idModulo === undefined} data-testid="rh-capacitaciones__btn-crear-evaluacion">
              <Icon icon={createEval.isPending ? 'svg-spinners:180-ring' : 'solar:add-circle-bold'} width={16} />
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
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    Sin preguntas todavía. Escribe la primera arriba y presiona Agregar.
                  </p>
                ) : (
                  data.preguntas.map((p) => (
                    <PreguntaCard key={p.id} idModulo={idModulo as number} pregunta={p} />
                  ))
                )}
              </>
            )}

            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button variant="destructive" onClick={onDeleteEval} disabled={deleteEval.isPending}>
                <Icon icon="solar:trash-bin-trash-bold" width={16} />
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
    <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex-1">
        <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Nombre de la evaluación</Label>
        <Input
          placeholder="Nombre de la evaluación"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <Button onClick={onSave} disabled={updateMut.isPending || value === nombre}>
        <Icon icon={updateMut.isPending ? 'svg-spinners:180-ring' : 'solar:diskette-bold'} width={16} />
        Guardar
      </Button>
    </div>
  )
}

const MODOS: { value: ModoEvaluacion; label: string; descripcion: string; icon: string }[] = [
  { value: 'EXAMEN', label: 'Examen', descripcion: 'Preguntas con respuestas; se aprueba con el porcentaje del módulo.', icon: 'solar:checklist-minimalistic-bold' },
  { value: 'VIDEO', label: 'Video', descripcion: 'El empleado ve el video completo y lo marca como completado.', icon: 'solar:videocamera-record-bold' },
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <Label className="mb-2 block text-xs font-semibold text-slate-600">Modo de evaluación</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODOS.map((m) => (
          <label
            key={m.value}
            className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm transition-colors hover:border-slate-300 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50/60 has-[:checked]:ring-1 has-[:checked]:ring-sky-500"
          >
            <input
              type="radio"
              name={`modo-evaluacion-${evaluacion.id}`}
              value={m.value}
              checked={evaluacion.modo === m.value}
              onChange={() => onChange(m.value)}
              disabled={updateMut.isPending}
              className="mt-0.5 accent-sky-500"
            />
            <span>
              <span className="flex items-center gap-1.5 font-medium text-slate-800">
                <Icon icon={m.icon} width={15} className="text-sky-600" />
                {m.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{m.descripcion}</span>
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
    const ok = await confirmar({ titulo: '¿Quitar el video de esta evaluación?', textoConfirmar: 'Quitar video', peligro: true })
    if (!ok) return
    try {
      await updateMut.mutateAsync({ id: evaluacion.id, videoUrl: null, videoKey: null })
      toast.success('Video quitado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al quitar el video')
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
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
          className="aspect-video w-full rounded-lg bg-black"
        />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
          <Icon icon="solar:videocamera-record-bold" width={32} className="text-slate-400" />
          Sin video todavía. Los empleados no podrán abrir el enlace hasta que cargues uno.
        </div>
      )}

      {progreso !== null && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all" style={{ width: `${progreso}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {progreso < 100 ? `Subiendo… ${progreso}%` : 'Procesando…'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {evaluacion.videoUrl && (
          <Button variant="outline" onClick={onQuitar} disabled={ocupado}>
            <Icon icon="solar:trash-bin-trash-bold" width={16} />
            Quitar video
          </Button>
        )}
        <Button onClick={() => inputRef.current?.click()} disabled={ocupado}>
          <Icon icon={progreso !== null ? 'svg-spinners:180-ring' : 'solar:upload-bold'} width={16} />
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
      className="flex items-end gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex-1">
        <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Nueva pregunta</Label>
        <Input placeholder="Texto de la pregunta" {...form.register('pregunta')} />
        {form.formState.errors.pregunta && (
          <p className="mt-1 text-xs text-red-600">
            {form.formState.errors.pregunta.message}
          </p>
        )}
      </div>
      <div className="w-24">
        <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Puntos</Label>
        <Input type="number" step="any" {...form.register('puntosPorRespuesta')} />
      </div>
      <Button type="submit" disabled={createMut.isPending}>
        <Icon icon={createMut.isPending ? 'svg-spinners:180-ring' : 'solar:add-circle-bold'} width={16} />
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
    const ok = await confirmar({ titulo: '¿Eliminar esta pregunta?', textoConfirmar: 'Eliminar', peligro: true })
    if (!ok) return
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
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-start gap-2 font-medium text-slate-800">
          <Icon icon="solar:question-square-bold" width={18} className="mt-0.5 shrink-0 text-sky-500" />
          {pregunta.pregunta}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeletePregunta}
          disabled={deletePregunta.isPending}
          title="Eliminar pregunta"
          aria-label="Eliminar pregunta"
          className="hover:bg-rose-50 hover:text-rose-600"
        >
          <Icon icon="solar:trash-bin-trash-bold" width={15} />
        </Button>
      </div>

      <ul className="mt-2 space-y-1">
        {pregunta.respuestas.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm"
          >
            <span className="flex items-center gap-2 text-slate-700">
              {r.respuesta}
              {r.respuestaCorrecta && <Tag severity="success" icon="solar:check-circle-bold" value="Correcta" />}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteRespuesta(r.id)}
              disabled={deleteRespuesta.isPending}
              title="Eliminar respuesta"
              aria-label="Eliminar respuesta"
              className="h-7 hover:bg-rose-50 hover:text-rose-600"
            >
              <Icon icon="solar:trash-bin-trash-linear" width={14} />
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
            className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
            checked={correcta}
            onChange={(e) => setCorrecta(e.target.checked)}
          />
          Correcta
        </label>
        <Button size="sm" onClick={onAddRespuesta} disabled={createRespuesta.isPending} title="Agregar respuesta" aria-label="Agregar respuesta">
          <Icon icon="solar:add-circle-bold" width={16} />
        </Button>
      </div>
    </div>
  )
}
