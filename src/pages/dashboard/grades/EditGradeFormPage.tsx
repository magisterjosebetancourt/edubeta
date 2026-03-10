import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { useQueryClient } from '@tanstack/react-query'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { EduSelect } from '@/components/ui/EduSelect'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, User } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useTeachers } from '@/lib/hooks/useFirebaseData'

export default function EditGradeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [directorId, setDirectorId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const { data: teachers = [] } = useTeachers()

  useEffect(() => {
    if (!id) return
    const fetchGrade = async () => {
      try {
        const snap = await getDoc(doc(db, 'grades', id))
        if (!snap.exists()) {
          toast.error('Grupo no encontrado')
          navigate('/dashboard/grades', { replace: true })
          return
        }
        const data = snap.data()
        setName(data.name || '')
        setDirectorId(data.director_id || '')
      } catch (error: any) {
        toast.error('Error al cargar el grupo', { description: error.message })
      } finally {
        setLoading(false)
      }
    }
    fetchGrade()
  }, [id, navigate])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre del grupo es requerido')
      return
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'grades', id!), { 
        name: name.trim(),
        director_id: directorId || null
      })
      
      // Update local cache
      queryClient.setQueryData(['grades'], (old: any) => {
        if (!old) return old
        const newList = old.map((g: any) => g.id === id ? { ...g, name: name.trim(), director_id: directorId || null } : g)
        return newList.sort((a: any, b: any) => a.name.localeCompare(b.name, "es"))
      })

      toast.success('Grupo actualizado')
      navigate('/dashboard/grades', { replace: true })
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando datos del grupo..." />;

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="grade-name">Nombre del grupo</Label>
          <EduInput
            id="grade-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: 601, 1102, Transición A"
            autoComplete="off"
            required
          />
        </div>

        {/* Director de Grupo */}
        <div className="space-y-2">
          <Label>Director de Grupo</Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <EduSelect
              value={directorId}
              onChange={e => setDirectorId(e.target.value)}
              icon={User}
            >
              <option value="">Sin asignar por defecto</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </EduSelect>
          </div>
          <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">Solo aparecen docentes y coordinadores registrados.</p>
        </div>

        {/* Acciones */}
        <div className="pt-2">
          <EduButton
            type="submit"
            disabled={saving}
            icon={Save}
            fullWidth
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
