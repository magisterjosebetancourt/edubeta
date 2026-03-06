import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Save, X, Loader2 } from 'lucide-react'
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
  const [exiting, setExiting] = useState(false)

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

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

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
      setExiting(true)
      setTimeout(() => navigate('/dashboard/teachers', { replace: true }), 220)
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando datos del docente..." />;

  return (
    <FormView exiting={exiting}>
      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Ej. Gómez, Roberto"
            required
            className="h-12 text-sm bg-slate-100 dark:bg-[#1e2536] border dark:border-slate-800 focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-2">
          <Label>Correo institucional (no modificable)</Label>
          <Input
            value={email}
            disabled
            className="h-12 text-sm bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 opacity-70"
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
            className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-white rounded-[5px] h-auto py-3.5 gap-2 shadow-xl shadow-primary/20 font-semibold text-sm transition-all active:scale-[0.98]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
