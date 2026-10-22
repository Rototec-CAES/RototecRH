import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Icon } from '@iconify/react'

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
import { extractApiErrorMessage } from '@/api/client'
import { notify } from '@/lib/notify'
import {
  useActualizarDepartamento,
  useActualizarPuesto,
  useActualizarSubDepartamento,
  useCrearDepartamento,
  useCrearPuesto,
  useCrearSubDepartamento,
} from '@/hooks/useEstructura'

export type Nivel = 'departamento' | 'subdepartamento' | 'puesto'

export interface NodoDialogState {
  open: boolean
  nivel: Nivel
  mode: 'crear' | 'editar'
  /** empresaId (depto) · idDepartamento (sub) · idSubdepartamento (puesto) */
  parentId?: number
  nodo?: { id: number; nombre: string; codigo?: string | null; codigoBiotime?: number | null }
}

const LABEL: Record<Nivel, string> = {
  departamento: 'departamento',
  subdepartamento: 'sub-departamento',
  puesto: 'puesto',
}

const ICONO: Record<Nivel, string> = {
  departamento: 'solar:buildings-2-bold',
  subdepartamento: 'solar:folder-with-files-bold',
  puesto: 'solar:case-round-bold',
}

const MAX_NOMBRE: Record<Nivel, number> = {
  departamento: 25,
  subdepartamento: 50,
  puesto: 255,
}

function makeSchema(nivel: Nivel) {
  return z.object({
    nombre: z
      .string()
      .trim()
      .min(1, 'Requerido')
      .max(MAX_NOMBRE[nivel], `Máximo ${MAX_NOMBRE[nivel]} caracteres`),
    codigo: z.string().trim().max(20, 'Máximo 20 caracteres').optional(),
    codigoBiotime: z.string().trim().regex(/^\d*$/, 'Solo números enteros').optional(),
  })
}
type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function NodoDialog({
  state,
  onOpenChange,
}: {
  state: NodoDialogState
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {state.open && (
          <NodoForm
            key={`${state.nivel}-${state.mode}-${state.nodo?.id ?? 'new'}`}
            state={state}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NodoForm({ state, onDone }: { state: NodoDialogState; onDone: () => void }) {
  const { nivel, mode, parentId, nodo } = state
  const label = LABEL[nivel]

  const crearDepto = useCrearDepartamento()
  const actDepto = useActualizarDepartamento()
  const crearSub = useCrearSubDepartamento()
  const actSub = useActualizarSubDepartamento()
  const crearPuesto = useCrearPuesto()
  const actPuesto = useActualizarPuesto()

  const pending =
    crearDepto.isPending ||
    actDepto.isPending ||
    crearSub.isPending ||
    actSub.isPending ||
    crearPuesto.isPending ||
    actPuesto.isPending

  const form = useForm<FormValues>({
    resolver: zodResolver(makeSchema(nivel)),
    defaultValues: {
      nombre: nodo?.nombre ?? '',
      codigo: nodo?.codigo ?? '',
      codigoBiotime: nodo?.codigoBiotime != null ? String(nodo.codigoBiotime) : '',
    },
  })

  async function onSubmit(values: FormValues) {
    const nombre = values.nombre.trim()
    const codigo = (values.codigo ?? '').trim()
    const codigoBiotime = values.codigoBiotime?.trim() ? Number(values.codigoBiotime) : undefined
    try {
      if (nivel === 'departamento') {
        if (mode === 'crear') await crearDepto.mutateAsync({ departamento: nombre, codigo, empresaId: parentId! })
        else await actDepto.mutateAsync({ id: nodo!.id, input: { departamento: nombre, codigo } })
      } else if (nivel === 'subdepartamento') {
        if (mode === 'crear') await crearSub.mutateAsync({ nombre, idDepartamento: parentId! })
        else await actSub.mutateAsync({ id: nodo!.id, input: { nombre } })
      } else {
        if (mode === 'crear') await crearPuesto.mutateAsync({ nombre, idSubdepartamento: parentId!, codigoBiotime })
        else await actPuesto.mutateAsync({ id: nodo!.id, input: { nombre, codigoBiotime } })
      }
      notify('success', mode === 'crear' ? `Se creó el ${label}` : `Se guardó el ${label}`)
      onDone()
    } catch (err) {
      notify('error', 'No se pudo guardar', extractApiErrorMessage(err))
    }
  }

  const errors = form.formState.errors

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white">
            <Icon icon={ICONO[nivel]} width={16} />
          </span>
          <span className="first-letter:uppercase">{mode === 'crear' ? `Nuevo ${label}` : `Editar ${label}`}</span>
        </DialogTitle>
        <DialogDescription>
          {nivel === 'puesto'
            ? 'El código del reloj (Biotime) es opcional y enlaza el puesto con el reloj biométrico.'
            : nivel === 'departamento'
              ? 'Nombre corto (máx. 25) y un código opcional.'
              : 'Nombre del sub-departamento.'}
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Nombre <span className="text-rose-500">*</span></Label>
          <Input autoFocus maxLength={MAX_NOMBRE[nivel]} {...form.register('nombre')} />
          {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
        </div>

        {nivel === 'departamento' && (
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Código</Label>
            <Input maxLength={20} placeholder="Opcional" {...form.register('codigo')} />
            {errors.codigo && <p className="mt-1 text-xs text-red-600">{errors.codigo.message}</p>}
          </div>
        )}

        {nivel === 'puesto' && (
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Código del reloj (Biotime)</Label>
            <Input inputMode="numeric" placeholder="Opcional" {...form.register('codigoBiotime')} />
            {errors.codigoBiotime && (
              <p className="mt-1 text-xs text-red-600">{errors.codigoBiotime.message}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} data-testid="rh-organizacion__btn-guardar-nodo">
            <Icon icon={pending ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} width={16} />
            {pending ? 'Guardando…' : mode === 'crear' ? 'Crear' : 'Guardar'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
