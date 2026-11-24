import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { FilterCard } from '@/shared/report/report-ui'
import { SinBiometricoMasiva } from './SinBiometricoMasiva'

/** Empleados activos que no están en BioTime (p. ej. de la carga masiva), para registrarlos en lote. */
export default function BiometricoPendientesPage() {
  const navigate = useNavigate()
  return (
    <div className="space-y-5">
      <FilterCard>
        <PageHeader
          titulo="Pendientes de biométrico"
          icono="solar:fingerprint-bold"
          descripcion="Empleados activos que todavía no están en BioTime. Sin este registro no aparecen en el reloj, así que no se les puede registrar la huella ni pueden marcar."
        >
          <Button variant="outline" onClick={() => navigate('/empleados')}>
            <Icon icon="solar:arrow-left-linear" />
            Volver a empleados
          </Button>
        </PageHeader>
      </FilterCard>
      <FilterCard>
        <SinBiometricoMasiva idsCreados={[]} />
      </FilterCard>
    </div>
  )
}
