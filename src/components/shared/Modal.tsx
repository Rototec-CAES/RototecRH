import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[95vw]',
} as const

interface ModalProps {
  open: boolean
  onClose: () => void
  titulo: ReactNode
  descripcion?: ReactNode
  size?: keyof typeof SIZES
  footer?: ReactNode
  children?: ReactNode
  className?: string
  /** Evita cerrar al hacer clic fuera. */
  persistente?: boolean
  testId?: string
}

/** Diálogo estándar: encabezado + cuerpo + pie opcional. */
export function Modal({ open, onClose, titulo, descripcion, size = 'md', footer, children, className, persistente, testId }: ModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent
        data-testid={testId}
        className={cn(SIZES[size], className)}
        onInteractOutside={persistente ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        {children && <div className="min-w-0">{children}</div>}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
