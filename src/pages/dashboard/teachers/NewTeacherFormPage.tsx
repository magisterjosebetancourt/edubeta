import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Copy, Save, Loader2 } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function NewTeacherFormPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) { toast.error('El nombre completo es obligatorio'); return }
    if (!email.trim() || !email.includes('@')) { toast.error('Ingresa un correo institucional válido'); return }
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
    navigate('/dashboard/teachers', { replace: true })
  }

  return (
    <FormView>
      {generatedToken ? (
        /* ── Paso 2: Token generado ── */
        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl space-y-3 text-center">
            <p className="text-[10px] font-black text-primary tracking-widest">Código generado</p>
            <h3 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
              {generatedToken}
            </h3>
            <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Token guardado en Firebase
            </div>
          </div>

          <div className="space-y-3">
            <EduButton
              onClick={handleSendEmail}
              className="bg-slate-900 hover:bg-slate-800"
              icon={Mail}
            >
              Enviar invitación por email
            </EduButton>
            <div className="grid grid-cols-2 gap-3">
              <EduButton 
                variant="outline" 
                onClick={copyToken} 
                icon={Copy}
                distributed
              >
                Copiar código
              </EduButton>
              <EduButton 
                variant="outline" 
                onClick={handleDone}
                distributed
              >
                Finalizar
              </EduButton>
            </div>
          </div>
        </div>
      ) : (
        /* ── Paso 1: Formulario ── */
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
            Genera un código de acceso para que el docente pueda registrarse en la plataforma.
          </p>

          <div className="space-y-2">
            <Label htmlFor="fullName">Apellidos y nombres</Label>
            <EduInput
              id="fullName"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ej. Pérez, Juan"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo institucional</Label>
            <EduInput
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ejemplo@institucion.edu.co"
              required
            />
          </div>

          <div className="pt-2">
            <EduButton
              type="submit"
              disabled={saving}
              icon={saving ? Loader2 : Save}
              fullWidth
            >
              {saving ? 'Generando...' : 'Generar código de acceso'}
            </EduButton>
          </div>
        </form>
      )}
    </FormView>
  )
}
