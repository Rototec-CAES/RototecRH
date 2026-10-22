import { create } from 'zustand'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Modal } from './Modal'

/**
 * Confirmación imperativa:
 *
 *   const ok = await confirmar({ titulo: '¿Eliminar?', mensaje: 'No se puede deshacer', peligro: true })
 *   if (!ok) return
 *
 * Requiere <ConfirmDialogHost /> montado una vez (está en App.tsx).
 */
interface ConfirmOptions {
  titulo: string
  mensaje?: string
  textoConfirmar?: string
  textoCancelar?: string
  peligro?: boolean
}

interface ConfirmState {
  opts: ConfirmOptions | null
  resolve: ((v: boolean) => void) | null
}

const useConfirmStore = create<ConfirmState>(() => ({ opts: null, resolve: null }))

export function confirmar(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.setState({ opts, resolve }))
}

export function ConfirmDialogHost() {
  const { opts, resolve } = useConfirmStore()
  const cerrar = (v: boolean) => {
    resolve?.(v)
    useConfirmStore.setState({ opts: null, resolve: null })
  }
  return (
    <Modal
      open={!!opts}
      onClose={() => cerrar(false)}
      titulo={
        <span className="flex items-center gap-2">
          <Icon
            icon={opts?.peligro ? 'solar:danger-triangle-bold' : 'solar:question-circle-bold'}
            width={20}
            className={opts?.peligro ? 'text-rose-500' : 'text-sky-500'}
          />
          {opts?.titulo ?? ''}
        </span>
      }
      size="sm"
      testId="confirm-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => cerrar(false)} data-testid="confirm-dialog__cancelar">
            {opts?.textoCancelar ?? 'Cancelar'}
          </Button>
          <Button
            variant={opts?.peligro ? 'destructive' : 'default'}
            onClick={() => cerrar(true)}
            data-testid="confirm-dialog__confirmar"
          >
            {opts?.textoConfirmar ?? 'Confirmar'}
          </Button>
        </>
      }
    >
      {opts?.mensaje && <p className="whitespace-pre-line text-sm text-slate-600">{opts.mensaje}</p>}
    </Modal>
  )
}
