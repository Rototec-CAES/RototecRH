import { Icon } from '@iconify/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import PensumsTab from './PensumsTab'
import AsignarTab from './AsignarTab'
import AsignadosTab from './AsignadosTab'
import CarnetTab from './CarnetTab'
import SalasTab from './SalasTab'
import BibliotecaTab from './BibliotecaTab'

const TID = 'rh-capacitaciones'

const TABS = [
  { value: 'pensums', label: 'Pensums', icon: 'solar:book-bookmark-bold' },
  { value: 'material', label: 'Material', icon: 'solar:folder-with-files-bold' },
  { value: 'asignar', label: 'Asignar', icon: 'solar:user-plus-bold' },
  { value: 'asignados', label: 'Asignados', icon: 'solar:users-group-rounded-bold' },
  { value: 'salas', label: 'Salas de examen', icon: 'solar:users-group-two-rounded-bold' },
  { value: 'carnets', label: 'Carnés', icon: 'solar:card-2-bold' },
]

export default function CapacitacionesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Capacitaciones"
        icono="solar:diploma-bold"
        descripcion="Crea los pensums de cada puesto, asígnalos a los empleados, revisa su avance e imprime sus carnés."
      />
      <Tabs defaultValue="pensums">
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} data-testid={`${TID}__tab-${t.value}`}>
              <Icon icon={t.icon} width={16} />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="pensums"><PensumsTab /></TabsContent>
        <TabsContent value="material"><BibliotecaTab /></TabsContent>
        <TabsContent value="asignar"><AsignarTab /></TabsContent>
        <TabsContent value="asignados"><AsignadosTab /></TabsContent>
        <TabsContent value="salas"><SalasTab /></TabsContent>
        <TabsContent value="carnets"><CarnetTab /></TabsContent>
      </Tabs>
    </div>
  )
}
