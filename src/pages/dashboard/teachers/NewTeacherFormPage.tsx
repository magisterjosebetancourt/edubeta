import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Copy, Save, X, Loader2 } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function NewTeacherFormPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) {
      toast.error('Completa nombre y correo')
      return
    }
    setSaving(true)
    const token = Math.floor(10000 + Math.random() * 90000).toString()
    try {
      await addDoc(collection(db, 'teacher_invites'), {
        full_name: fullName.trim(),
        email: email.trim(),
        token,
        created_at: serverTimestamp(),
      })
      setGeneratedToken(token)
      toast.success('Código de acceso generado')
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSendEmail = () => {
    if (!generatedToken) return
    const registerUrl = `${window.location.origin}/teacher-register`
    const subject = encodeURIComponent('Invitación a EduBeta - Código de Registro')
    const body = encodeURIComponent(
      `Hola ${fullName},\n\nHas sido invitado a unirte a EduBeta como docente.\n\nTu código de acceso es: ${generatedToken}\n\nRegistrate en: ${registerUrl}\n\nSaludos,\nEquipo EduBeta`
    )
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken)
      toast.success('Código copiado')
    }
  }

  const handleDone = () => {
    setExiting(true)
    setTimeout(() => navigate('/dashboard/teachers', { replace: true }), 220)
  }

  return (
    <FormView exiting={exiting}>
      {generatedToken ? (
        /* ── Paso 2: Token generado ── */
        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl space-y-3 text-center">
            <p className="text-[10px] font-black text-primary tracking-widest">Código generado</p>
            <h3 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
              {generatedToken}
            </h3>
            <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Token guardado en Firebase
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleSendEmail}
              className="w-full h-14 gap-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              <Mail className="w-5 h-5" />
              Enviar invitación por email
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={copyToken} className="h-12 gap-2 rounded-lg font-semibold text-xs">
                <Copy className="w-4 h-4" />
                Copiar código
              </Button>
              <Button variant="ghost" onClick={handleDone} className="h-12 rounded-lg font-semibold text-xs border border-slate-200 dark:border-slate-700">
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Paso 1: Formulario ── */
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Genera un código de acceso para que el docente pueda registrarse en la plataforma.
          </p>

          <div className="space-y-2">
            <Label htmlFor="fullName">Apellidos y nombres</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ej. Pérez, Juan"
              required
              className="h-12 text-sm bg-slate-100 dark:bg-[#1e2536] border dark:border-slate-800 focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo institucional</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ejemplo@institucion.edu.co"
              required
              className="h-12 text-sm bg-slate-100 dark:bg-[#1e2536] border dark:border-slate-800 focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
              className="w-full sm:w-auto rounded-lg h-auto py-3.5 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <X className="w-4 h-4 mr-1.5" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 gap-2 shadow-xl shadow-primary/20 font-semibold text-sm transition-all active:scale-[0.98]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Generando...' : 'Generar código de acceso'}
            </Button>
          </div>
        </form>
      )}
    </FormView>
  )
}
