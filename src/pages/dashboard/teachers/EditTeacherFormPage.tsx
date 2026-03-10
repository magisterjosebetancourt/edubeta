import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

export default function EditTeacherFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [isCoordinator, setIsCoordinator] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'profiles', id))
      .then(snap => {
        if (!snap.exists()) {
          toast.error('Docente no encontrado')
          navigate('/dashboard/teachers', { replace: true })
          return
        }
        const data = snap.data()
        setFullName(data.full_name || '')
        setEmail(data.email || '')
        setIsCoordinator(data.role === 'coordinator')
      })
      .catch(e => toast.error('Error al cargar datos', { description: e.message }))
      .finally(() => setLoading(false))
  }, [id, navigate])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'profiles', id!), {
        full_name: fullName.trim(),
        role: isCoordinator ? 'coordinator' : 'teacher',
        updated_at: serverTimestamp(),
      })
      toast.success('Docente actualizado')
      navigate('/dashboard/teachers', { replace: true })
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando datos del docente..." />;

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <EduInput
            id="fullName"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Ej. Gómez, Roberto"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Correo institucional (no modificable)</Label>
          <EduInput
            value={email}
            disabled
            className="bg-slate-50 dark:bg-slate-800/50 opacity-70"
          />
        </div>

        {/* Toggle coordinador */}
        <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold text-slate-800 dark:text-white leading-none">
              Rol de coordinador
            </Label>
            <p className="text-[10px] text-slate-500 mt-1 leading-tight">
              Privilegios para gestionar asistencias generales.
            </p>
          </div>
          <Switch
            checked={isCoordinator}
            onCheckedChange={setIsCoordinator}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        <div className="pt-2">
          <EduButton
            type="submit"
            disabled={saving}
            icon={saving ? Loader2 : Save}
            fullWidth
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
