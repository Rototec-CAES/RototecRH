import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DEPARTAMENTOS_ROTOTEC, SUCURSAL_DEFAULT } from '@/constants/guatemala'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useCreateEmpleado, useUpdateEmpleado } from '@/hooks/useEmpleados'
import { empleadoSchema, type EmpleadoFormValues } from '@/lib/validators'
import type { Empleado, EmpleadoInput } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  empleado?: Empleado
}

const defaultValues: EmpleadoFormValues = {
  primerNombre: '',
  segundoNombre: '',
  tercerNombre: '',
  primerApellido: '',
  segundoApellido: '',
  apellidoCasada: '',
  tipoDocumento: 'DPI',
  dpi: '',
  nit: '',
  igss: '',
  fechaNacimiento: '',
  sexo: 'M',
  estadoCivil: 'SOLTERO',
  cantidadHijos: 0,
  tipoDiscapacidad: '1',
  nacionalidad: 'GTM',
  paisOrigen: 'GTM',
  puebloPertenencia: '5',
  comunidadLinguistica: '99',
  lugarNacimientoMunicipio: '',
  permisoExtranjero: '',
  puesto: '',
  departamento: 'PRODUCCION',
  jornada: 'DIURNA',
  temporalidadContrato: 'INDEFINIDO',
  tipoContrato: 'PLANILLA',
  fechaIngreso: '',
  fechaReingreso: '',
  salarioMensual: 3650,
  sucursal: SUCURSAL_DEFAULT,
  nivelAcademico: '7',
  tituloProfesion: '',
  formaPago: 'TRANSFERENCIA',
  codigoBanco: '',
  numeroCuenta: '',
  tipoCuenta: undefined,
}

export function EmpleadoFormSheet({ open, onOpenChange, mode, empleado }: Props) {
  const [tab, setTab] = useState('personal')
  const createMut = useCreateEmpleado()
  const updateMut = useUpdateEmpleado(empleado?.id ?? '')
  const isSubmitting = createMut.isPending || updateMut.isPending
  const { data: cat } = useCatalogos()

  const form = useForm<EmpleadoFormValues>({
    resolver: zodResolver(empleadoSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) return
    setTab('personal')
    if (mode === 'edit' && empleado) {
      form.reset({
        primerNombre: empleado.primerNombre,
        segundoNombre: empleado.segundoNombre ?? '',
        tercerNombre: empleado.tercerNombre ?? '',
        primerApellido: empleado.primerApellido,
        segundoApellido: empleado.segundoApellido ?? '',
        apellidoCasada: empleado.apellidoCasada ?? '',
        tipoDocumento: empleado.tipoDocumento,
        dpi: empleado.dpi,
        nit: empleado.nit,
        igss: empleado.igss,
        fechaNacimiento: empleado.fechaNacimiento,
        sexo: empleado.sexo,
        estadoCivil: empleado.estadoCivil,
        cantidadHijos: empleado.cantidadHijos,
        tipoDiscapacidad: empleado.tipoDiscapacidad,
        nacionalidad: empleado.nacionalidad,
        paisOrigen: empleado.paisOrigen,
        puebloPertenencia: empleado.puebloPertenencia,
        comunidadLinguistica: empleado.comunidadLinguistica,
        lugarNacimientoMunicipio: empleado.lugarNacimientoMunicipio ?? '',
        permisoExtranjero: empleado.permisoExtranjero ?? '',
        puesto: empleado.puesto,
        departamento: empleado.departamento,
        jornada: empleado.jornada,
        temporalidadContrato: empleado.temporalidadContrato,
        tipoContrato: empleado.tipoContrato,
        fechaIngreso: empleado.fechaIngreso,
        fechaReingreso: empleado.fechaReingreso ?? '',
        salarioMensual: empleado.salarioMensual,
        sucursal: empleado.sucursal,
        nivelAcademico: empleado.nivelAcademico,
        tituloProfesion: empleado.tituloProfesion ?? '',
        formaPago: empleado.formaPago,
        codigoBanco: empleado.codigoBanco ?? '',
        numeroCuenta: empleado.numeroCuenta ?? '',
        tipoCuenta: empleado.tipoCuenta,
      })
    } else {
      form.reset(defaultValues)
    }
  }, [open, mode, empleado, form])

  async function onSubmit(values: EmpleadoFormValues) {
    try {
      // Los selects acotan los valores a los del catálogo (BD); el cast adapta
      // EmpleadoFormValues (campos string tras relajar Zod) a EmpleadoInput (uniones).
      if (mode === 'create') {
        await createMut.mutateAsync(values as EmpleadoInput)
        toast.success('Empleado creado')
      } else if (empleado) {
        await updateMut.mutateAsync(values as EmpleadoInput)
        toast.success('Empleado actualizado')
      }
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(msg)
    }
  }

  function jumpToFirstError() {
    const order: { tab: string; fields: (keyof EmpleadoFormValues)[] }[] = [
      {
        tab: 'personal',
        fields: [
          'primerNombre',
          'segundoNombre',
          'tercerNombre',
          'primerApellido',
          'segundoApellido',
          'apellidoCasada',
          'tipoDocumento',
          'dpi',
          'nit',
          'igss',
          'fechaNacimiento',
          'sexo',
          'estadoCivil',
          'cantidadHijos',
          'tipoDiscapacidad',
        ],
      },
      {
        tab: 'cultural',
        fields: [
          'nacionalidad',
          'paisOrigen',
          'puebloPertenencia',
          'comunidadLinguistica',
          'lugarNacimientoMunicipio',
          'permisoExtranjero',
        ],
      },
      {
        tab: 'laboral',
        fields: [
          'puesto',
          'departamento',
          'jornada',
          'temporalidadContrato',
          'tipoContrato',
          'fechaIngreso',
          'fechaReingreso',
          'salarioMensual',
          'sucursal',
          'nivelAcademico',
          'tituloProfesion',
        ],
      },
      { tab: 'bancario', fields: ['formaPago', 'codigoBanco', 'numeroCuenta', 'tipoCuenta'] },
    ]
    const errors = form.formState.errors
    for (const grp of order) {
      if (grp.fields.some((f) => errors[f])) {
        setTab(grp.tab)
        return
      }
    }
  }

  const errors = form.formState.errors
  const esTransferencia = form.watch('formaPago') === 'TRANSFERENCIA'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{mode === 'create' ? 'Nuevo Empleado' : 'Editar Empleado'}</SheetTitle>
          <SheetDescription>
            Completa los datos en cada pestaña. Los campos marcados con * son obligatorios.
          </SheetDescription>
        </SheetHeader>

        <form
          className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit, jumpToFirstError)}
        >
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="cultural">Cultural</TabsTrigger>
              <TabsTrigger value="laboral">Laboral</TabsTrigger>
              <TabsTrigger value="bancario">Bancario</TabsTrigger>
            </TabsList>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {/* ============ TAB 1: IDENTIFICACIÓN PERSONAL ============ */}
              <TabsContent value="personal" className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Primer nombre *" error={errors.primerNombre?.message}>
                    <Input {...form.register('primerNombre')} />
                  </Field>
                  <Field label="Segundo nombre" error={errors.segundoNombre?.message}>
                    <Input {...form.register('segundoNombre')} />
                  </Field>
                  <Field label="Tercer nombre" error={errors.tercerNombre?.message}>
                    <Input {...form.register('tercerNombre')} />
                  </Field>
                  <Field label="Primer apellido *" error={errors.primerApellido?.message}>
                    <Input {...form.register('primerApellido')} />
                  </Field>
                  <Field label="Segundo apellido" error={errors.segundoApellido?.message}>
                    <Input {...form.register('segundoApellido')} />
                  </Field>
                  <Field label="Apellido de casada" error={errors.apellidoCasada?.message}>
                    <Input
                      {...form.register('apellidoCasada')}
                      disabled={form.watch('estadoCivil') !== 'CASADO'}
                    />
                  </Field>

                  <Field label="Tipo de documento *" error={errors.tipoDocumento?.message}>
                    <ControlledSelect
                      value={form.watch('tipoDocumento')}
                      onValueChange={(v) =>
                        form.setValue('tipoDocumento', v as EmpleadoFormValues['tipoDocumento'])
                      }
                      items={cat?.tiposDocumento ?? []}
                    />
                  </Field>
                  <Field label="DPI *" error={errors.dpi?.message}>
                    <Input
                      maxLength={13}
                      inputMode="numeric"
                      placeholder="13 dígitos"
                      {...form.register('dpi')}
                    />
                  </Field>
                  <Field label="NIT *" error={errors.nit?.message}>
                    <Input placeholder="Ej: 1234567 o 1234567K" {...form.register('nit')} />
                  </Field>
                  <Field label="No. IGSS *" error={errors.igss?.message}>
                    <Input {...form.register('igss')} />
                  </Field>
                  <Field label="Fecha de nacimiento *" error={errors.fechaNacimiento?.message}>
                    <Input type="date" {...form.register('fechaNacimiento')} />
                  </Field>
                  <Field label="Sexo *" error={errors.sexo?.message}>
                    <ControlledSelect
                      value={form.watch('sexo')}
                      onValueChange={(v) => form.setValue('sexo', v as EmpleadoFormValues['sexo'])}
                      items={cat?.sexos ?? []}
                    />
                  </Field>
                  <Field label="Estado civil *" error={errors.estadoCivil?.message}>
                    <ControlledSelect
                      value={form.watch('estadoCivil')}
                      onValueChange={(v) =>
                        form.setValue('estadoCivil', v as EmpleadoFormValues['estadoCivil'])
                      }
                      items={cat?.estadosCiviles ?? []}
                    />
                  </Field>
                  <Field label="Cantidad de hijos *" error={errors.cantidadHijos?.message}>
                    <Input type="number" min={0} {...form.register('cantidadHijos')} />
                  </Field>
                  <Field label="Tipo de discapacidad *" error={errors.tipoDiscapacidad?.message}>
                    <ControlledSelect
                      value={form.watch('tipoDiscapacidad')}
                      onValueChange={(v) => form.setValue('tipoDiscapacidad', v)}
                      items={cat?.tiposDiscapacidad ?? []}
                    />
                  </Field>
                </div>
              </TabsContent>

              {/* ============ TAB 2: DATOS CULTURALES (MINTRAB) ============ */}
              <TabsContent value="cultural" className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Nacionalidad *" error={errors.nacionalidad?.message}>
                    <ControlledSelect
                      value={form.watch('nacionalidad')}
                      onValueChange={(v) => form.setValue('nacionalidad', v)}
                      items={cat?.paises ?? []}
                    />
                  </Field>
                  <Field label="País de origen *" error={errors.paisOrigen?.message}>
                    <ControlledSelect
                      value={form.watch('paisOrigen')}
                      onValueChange={(v) => form.setValue('paisOrigen', v)}
                      items={cat?.paises ?? []}
                    />
                  </Field>
                  <Field label="Pueblo de pertenencia *" error={errors.puebloPertenencia?.message}>
                    <ControlledSelect
                      value={form.watch('puebloPertenencia')}
                      onValueChange={(v) => form.setValue('puebloPertenencia', v)}
                      items={cat?.pueblos ?? []}
                    />
                  </Field>
                  <Field
                    label="Comunidad lingüística *"
                    error={errors.comunidadLinguistica?.message}
                  >
                    <ControlledSelect
                      value={form.watch('comunidadLinguistica')}
                      onValueChange={(v) => form.setValue('comunidadLinguistica', v)}
                      items={cat?.comunidadesLinguisticas ?? []}
                    />
                  </Field>
                  <Field
                    label="Lugar de nacimiento (municipio)"
                    error={errors.lugarNacimientoMunicipio?.message}
                    className="sm:col-span-2"
                  >
                    <Input {...form.register('lugarNacimientoMunicipio')} />
                  </Field>
                  <Field
                    label="Permiso/Expediente extranjero"
                    error={errors.permisoExtranjero?.message}
                    hint="Sólo si el empleado es extranjero"
                    className="sm:col-span-2"
                  >
                    <Input {...form.register('permisoExtranjero')} />
                  </Field>
                </div>
              </TabsContent>

              {/* ============ TAB 3: DATOS LABORALES ============ */}
              <TabsContent value="laboral" className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Puesto *" error={errors.puesto?.message}>
                    <Input
                      placeholder="Ej: OPERARIO DE MAQUINA"
                      {...form.register('puesto')}
                    />
                  </Field>
                  <Field label="Departamento *" error={errors.departamento?.message}>
                    <ControlledSelect
                      value={form.watch('departamento')}
                      onValueChange={(v) =>
                        form.setValue('departamento', v as EmpleadoFormValues['departamento'])
                      }
                      items={DEPARTAMENTOS_ROTOTEC}
                    />
                  </Field>
                  <Field label="Jornada *" error={errors.jornada?.message}>
                    <ControlledSelect
                      value={form.watch('jornada')}
                      onValueChange={(v) =>
                        form.setValue('jornada', v as EmpleadoFormValues['jornada'])
                      }
                      items={cat?.jornadas ?? []}
                    />
                  </Field>
                  <Field
                    label="Temporalidad del contrato *"
                    error={errors.temporalidadContrato?.message}
                  >
                    <ControlledSelect
                      value={form.watch('temporalidadContrato')}
                      onValueChange={(v) =>
                        form.setValue(
                          'temporalidadContrato',
                          v as EmpleadoFormValues['temporalidadContrato'],
                        )
                      }
                      items={cat?.temporalidadContrato ?? []}
                    />
                  </Field>
                  <Field label="Tipo de contrato *" error={errors.tipoContrato?.message}>
                    <ControlledSelect
                      value={form.watch('tipoContrato')}
                      onValueChange={(v) =>
                        form.setValue('tipoContrato', v as EmpleadoFormValues['tipoContrato'])
                      }
                      items={cat?.tiposContrato ?? []}
                    />
                  </Field>
                  <Field label="Fecha de ingreso *" error={errors.fechaIngreso?.message}>
                    <Input type="date" {...form.register('fechaIngreso')} />
                  </Field>
                  <Field
                    label="Fecha de reingreso"
                    error={errors.fechaReingreso?.message}
                    hint="Sólo si es un reingreso"
                  >
                    <Input type="date" {...form.register('fechaReingreso')} />
                  </Field>
                  <Field label="Salario mensual (Q) *" error={errors.salarioMensual?.message}>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...form.register('salarioMensual')}
                    />
                  </Field>
                  <Field label="Nivel académico *" error={errors.nivelAcademico?.message}>
                    <ControlledSelect
                      value={form.watch('nivelAcademico')}
                      onValueChange={(v) => form.setValue('nivelAcademico', v)}
                      items={cat?.nivelesAcademicos ?? []}
                    />
                  </Field>
                  <Field
                    label="Título / Profesión"
                    error={errors.tituloProfesion?.message}
                  >
                    <Input {...form.register('tituloProfesion')} />
                  </Field>
                  <Field
                    label="Sucursal *"
                    error={errors.sucursal?.message}
                    className="sm:col-span-2"
                  >
                    <Input {...form.register('sucursal')} />
                  </Field>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  La bonificación incentivo (Q250 mensual / Q125 quincenal) se aplica automáticamente
                  en la planilla por ley (Decreto 78-89).
                </p>
              </TabsContent>

              {/* ============ TAB 4: DATOS BANCARIOS ============ */}
              <TabsContent value="bancario" className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Forma de pago *" error={errors.formaPago?.message}>
                    <ControlledSelect
                      value={form.watch('formaPago')}
                      onValueChange={(v) =>
                        form.setValue('formaPago', v as EmpleadoFormValues['formaPago'])
                      }
                      items={cat?.formasPago ?? []}
                    />
                  </Field>
                  <Field
                    label={`Código de banco ${esTransferencia ? '*' : ''}`}
                    error={errors.codigoBanco?.message}
                  >
                    <Input
                      {...form.register('codigoBanco')}
                      maxLength={10}
                      disabled={!esTransferencia}
                      placeholder="Código del colaborador en el banco"
                    />
                  </Field>
                  <Field
                    label={`Número de cuenta ${esTransferencia ? '*' : ''}`}
                    error={errors.numeroCuenta?.message}
                  >
                    <Input
                      {...form.register('numeroCuenta')}
                      disabled={!esTransferencia}
                    />
                  </Field>
                  <Field
                    label={`Tipo de cuenta ${esTransferencia ? '*' : ''}`}
                    error={errors.tipoCuenta?.message}
                  >
                    <ControlledSelect
                      value={form.watch('tipoCuenta') ?? ''}
                      onValueChange={(v) =>
                        form.setValue('tipoCuenta', v as EmpleadoFormValues['tipoCuenta'])
                      }
                      items={cat?.tiposCuenta ?? []}
                      disabled={!esTransferencia}
                      placeholder="Seleccionar"
                    />
                  </Field>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  El código de banco es el código único que el banco le asigna al colaborador para el enrollment.
                </p>
              </TabsContent>
            </div>
          </Tabs>

          <SheetFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : mode === 'create' ? 'Crear empleado' : 'Guardar cambios'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function ControlledSelect({
  value,
  onValueChange,
  items,
  disabled,
  placeholder = 'Seleccionar',
}: {
  value: string
  onValueChange: (v: string) => void
  items: { value: string; label: string }[]
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
