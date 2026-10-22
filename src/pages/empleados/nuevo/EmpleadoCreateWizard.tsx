import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { Stepper } from '@/components/ui/stepper'
import { empleadoCreateSchema, WIZARD_STEP_FIELDS, type EmpleadoCreateValues } from '@/lib/validators'
import type { CreateEmpleadoInput } from '@/types'
import { useCrearAltaEmpleado } from '@/hooks/useEmpleados'
import { useDepartamentos, usePuestos } from '@/hooks/useCompanyCatalogos'
import { extractApiErrorMessage } from '@/api/client'
import { WIZARD_STEPS, StepContent, numOrUndef } from './wizardSteps'
import { BiotimeCodeDialog, type AltaResumen } from './BiotimeCodeDialog'

const LAST = WIZARD_STEPS.length - 1

export default function EmpleadoCreateWizard() {
  const navigate = useNavigate()
  const crearMut = useCrearAltaEmpleado()
  const [step, setStep] = useState(0)
  const [resumen, setResumen] = useState<AltaResumen | null>(null)

  const form = useForm<EmpleadoCreateValues>({
    resolver: zodResolver(empleadoCreateSchema),
    mode: 'onTouched',
    defaultValues: { cantidad_hijos: 0, forma_pago: 'TRANSFERENCIA', frecuencia_pago: 'QUINCENAL' },
  })

  // Reseteo en cascada: cambiar un padre limpia a sus hijos.
  const paisW = form.watch('PAIS')
  const empresaId = form.watch('empresa_id')
  const depId = form.watch('id_departamento')
  const subId = form.watch('id_sub_departamento')
  useEffect(() => {
    form.resetField('empresa_id')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paisW])
  useEffect(() => {
    form.resetField('id_departamento')
    form.resetField('id_sub_departamento')
    form.resetField('id_puesto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId])
  useEffect(() => {
    form.resetField('id_sub_departamento')
    form.resetField('id_puesto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depId])
  useEffect(() => {
    form.resetField('id_puesto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId])

  // Para el resumen del diálogo (cacheado por TanStack Query, sin red extra).
  const departamentosQ = useDepartamentos(numOrUndef(empresaId))
  const puestosQ = usePuestos(numOrUndef(subId))

  async function next() {
    const ok = await form.trigger(WIZARD_STEP_FIELDS[step], { shouldFocus: true })
    if (ok) setStep((s) => Math.min(LAST, s + 1))
  }
  function back() {
    setStep((s) => Math.max(0, s - 1))
  }

  async function onSubmit(values: EmpleadoCreateValues) {
    try {
      // Quita opcionales vacíos/NaN para que el backend (@IsOptional) los omita
      // (evita "must be a valid ISO 8601 date" en fechas en blanco como reingreso).
      const payload = Object.fromEntries(
        Object.entries(values).filter(
          ([, v]) => v !== '' && v !== null && !(typeof v === 'number' && Number.isNaN(v)),
        ),
      ) as unknown as CreateEmpleadoInput
      const res = await crearMut.mutateAsync(payload)
      const nombre = [values.primer_nombre, values.segundo_nombre, values.primer_apellido, values.segundo_apellido]
        .filter(Boolean)
        .join(' ')
      setResumen({
        id: res.id,
        nombre,
        puesto: puestosQ.data?.find((p) => p.id === values.id_puesto)?.nombre ?? '—',
        departamento: departamentosQ.data?.find((d) => d.id === values.id_departamento)?.nombre ?? '—',
        codigoBiotime: res.codigoEmpleadoBio != null ? String(res.codigoEmpleadoBio) : 'N/D',
      })
    } catch (err) {
      const msg = extractApiErrorMessage(err)
      if (/identificaci[oó]n|dpi|duplicad/i.test(msg)) setStep(5)
      toast.error(msg)
    }
  }

  const progreso = Math.round(((step + 1) / WIZARD_STEPS.length) * 100)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <PageHeader
          titulo="Nuevo empleado"
          icono="solar:user-plus-bold"
          descripcion={
            <>
              Paso {step + 1} de {WIZARD_STEPS.length} · <span className="font-medium text-slate-700">{WIZARD_STEPS[step].title}</span>
            </>
          }
        >
          <Button variant="outline" onClick={() => navigate('/empleados')}>
            <Icon icon="solar:close-circle-linear" />
            Cancelar
          </Button>
        </PageHeader>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-slate-500">{progreso}%</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <Card className="h-fit p-3 md:sticky md:top-6">
          <Stepper steps={WIZARD_STEPS} current={step} onStepClick={setStep} />
        </Card>

        <Card className="p-6">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <h3 className="mb-1 text-lg font-semibold text-slate-900">{WIZARD_STEPS[step].title}</h3>
              <p className="mb-6 text-sm text-slate-500">
                Los campos marcados con <span className="font-semibold text-red-600">*</span> son obligatorios.
              </p>

              <div key={step} className="min-h-[300px] animate-in fade-in slide-in-from-right-4 duration-300">
                <StepContent index={step} />
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                <Button type="button" variant="outline" onClick={back} disabled={step === 0}>
                  <Icon icon="solar:alt-arrow-left-linear" />
                  Atrás
                </Button>
                {step < LAST ? (
                  <Button type="button" onClick={next}>
                    Siguiente
                    <Icon icon="solar:alt-arrow-right-linear" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={crearMut.isPending}>
                    <Icon icon={crearMut.isPending ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} />
                    {crearMut.isPending ? 'Creando…' : 'Crear empleado'}
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </Card>
      </div>

      <BiotimeCodeDialog resumen={resumen} onClose={() => navigate('/empleados')} />
    </div>
  )
}
