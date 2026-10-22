import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import { extractApiErrorMessage } from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { loginSchema, type LoginFormValues } from '@/lib/validators'

interface LocationState {
  from?: { pathname?: string }
}

const MODULOS = [
  { icon: 'solar:users-group-rounded-bold', label: 'Empleados y expedientes' },
  { icon: 'solar:calendar-mark-bold', label: 'Turnos y asistencias' },
  { icon: 'solar:calendar-minimalistic-bold', label: 'Ausencias y permisos' },
  { icon: 'solar:clock-circle-bold', label: 'Horas extra' },
  { icon: 'solar:wallet-money-bold', label: 'Planilla y nómina' },
  { icon: 'solar:diploma-bold', label: 'Capacitaciones' },
]

const INPUT_CLS = cn(
  'h-11 rounded-xl pl-10 text-sm',
  'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-300',
  'hover:border-slate-300 hover:bg-white',
  'focus-visible:border-sky-500 focus-visible:bg-white focus-visible:ring-sky-500',
  'transition-all duration-150',
)

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/empleados'
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })
  const errors = form.formState.errors

  // Ya autenticado → directo a la app (sin pasar por el login).
  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(values: LoginFormValues) {
    setSubmitting(true)
    setError(null)
    try {
      await login(values)
      toast.success('Sesión iniciada')
      navigate(from, { replace: true })
    } catch (err) {
      const msg = extractApiErrorMessage(err)
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Panel izquierdo (solo en pantallas grandes) ── */}
      <div
        className="relative hidden w-[520px] shrink-0 flex-col overflow-hidden lg:flex"
        style={{ background: 'linear-gradient(160deg, #0c1628 0%, #0f172a 40%, #0c1e35 100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />
        <div
          className="pointer-events-none absolute -left-48 -top-48 h-[700px] w-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, transparent 55%)' }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 55%)' }}
        />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center gap-4 px-8 pt-8">
            <img
              src="/logo_rototec.png"
              alt="Rototec"
              style={{ height: 56, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.88 }}
            />
            <div className="flex-1">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-400/70">Rototec S.A.</p>
              <p
                className="text-[28px] font-bold leading-none tracking-widest"
                style={{
                  background: 'linear-gradient(135deg, #f1f5f9 0%, #7dd3fc 55%, #38bdf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                RECURSOS HUMANOS
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center px-10">
            <div className="mb-10">
              <h2 className="mb-3 text-4xl font-bold leading-tight tracking-tight text-white">
                Gestión de
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(90deg, #38bdf8, #22d3ee)' }}
                >
                  personal y nómina
                </span>
              </h2>
              <p className="max-w-xs text-sm leading-relaxed text-slate-400">
                Todo el proceso de Recursos Humanos en un solo lugar: del expediente del empleado a la planilla.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {MODULOS.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15">
                    <Icon icon={m.icon} width={14} className="text-sky-400" />
                  </div>
                  <span className="text-xs leading-tight text-slate-400">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-8 pb-8">
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} Rototec S.A. · Recursos Humanos v2.0</p>
          </div>
        </div>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-slate-50 px-6">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(ellipse at 60% 20%, rgba(14,165,233,0.04) 0%, transparent 60%)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative w-full max-w-[420px]"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <div className="p-7">
              {/* Encabezado en pantallas chicas */}
              <div className="mb-6 flex items-center gap-3 lg:hidden">
                <img src="/logo_rototec.png" alt="Rototec" style={{ height: 28, width: 'auto' }} />
                <div>
                  <p className="text-[11px] font-bold leading-none tracking-widest text-slate-900">RECURSOS HUMANOS</p>
                  <p className="mt-1 text-xs leading-none text-slate-400">Rototec S.A.</p>
                </div>
              </div>

              <h1 className="mb-1 text-xl font-bold text-slate-900">Iniciar sesión</h1>
              <p className="mb-7 text-sm text-slate-500">Ingresa con tu usuario para continuar</p>

              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Usuario
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon icon="solar:user-bold" width={15} />
                    </span>
                    <Input
                      id="username"
                      autoComplete="username"
                      autoFocus
                      placeholder="usuario"
                      disabled={submitting}
                      className={INPUT_CLS}
                      {...form.register('username')}
                    />
                  </div>
                  {errors.username && <p className="text-xs text-red-600">{errors.username.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon icon="solar:lock-password-bold" width={15} />
                    </span>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      disabled={submitting}
                      className={cn(INPUT_CLS, 'pr-11')}
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-600"
                    >
                      <Icon icon={showPassword ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={15} />
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <Icon icon="solar:danger-triangle-bold" width={15} className="mt-0.5 shrink-0 text-red-400" />
                        <span>{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-xl text-sm font-semibold text-white shadow-md shadow-sky-500/20"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}
                >
                  <Icon icon={submitting ? 'svg-spinners:180-ring' : 'solar:login-3-bold'} width={16} />
                  {submitting ? 'Ingresando…' : 'Ingresar'}
                </Button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
