import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { useQueryClient } from '@tanstack/react-query'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { EduSelect } from '@/components/ui/EduSelect'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, User } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useTeachers } from '@/lib/hooks/useFirebaseData'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const LEVELS = [
  { id: 'preescolar', name: 'Preescolar', grades: ['Transición'] },
  {
    id: 'primaria',
    name: 'Básica Primaria',
    grades: ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'],
  },
  {
    id: 'secundaria',
    name: 'Básica Secundaria',
    grades: ['Sexto', 'Séptimo', 'Octavo', 'Noveno'],
  },
  { id: 'media', name: 'Educación Media', grades: ['Décimo', 'Once'] },
]

const GRADE_MAP: Record<string, string> = {
  Primero: '1', Segundo: '2', Tercero: '3', Cuarto: '4', Quinto: '5',
  Sexto: '6', Séptimo: '7', Octavo: '8', Noveno: '9',
  Décimo: '10', Once: '11',
}


export default function NewGradeFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedGradeName, setSelectedGradeName] = useState('')
  const [groupSuffix, setGroupSuffix] = useState('')
  const [directorId, setDirectorId] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: teachers = [], isLoading: loadingTeachers } = useTeachers()

  if (loadingTeachers) return <LoadingSpinner message="Cargando docentes..." />;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLevel) { toast.error('Selecciona el nivel educativo'); return }
    if (!selectedGradeName) { toast.error('Selecciona el grado'); return }
    if (!groupSuffix.trim()) { toast.error('El sufijo de grupo (ej: 01) es obligatorio'); return }

    setSaving(true)

    let finalName = `${selectedGradeName} ${groupSuffix.trim()}`
    if (GRADE_MAP[selectedGradeName]) {
      finalName = `${GRADE_MAP[selectedGradeName]}${groupSuffix.trim()}`
    } else if (selectedGradeName === 'Transición') {
      finalName = `Transición ${groupSuffix.trim()}`
    }

    try {
      const docRef = await addDoc(collection(db, 'grades'), {
        name: finalName,
        director_id: directorId || null,
        state: true,
        created_at: serverTimestamp(),
      })
      
      // Mutación de caché local
      queryClient.setQueryData(['grades'], (old: any) => {
        const newGrade = { id: docRef.id, name: finalName, state: true }
        const newList = old ? [...old, newGrade] : [newGrade]
        return newList.sort((a,b) => a.name.localeCompare(b.name, "es"))
      })

      toast.success(`Grupo ${finalName} creado correctamente`)
      navigate('/dashboard/grades', { replace: true })
    } catch (error: any) {
      toast.error('Error al crear grupo', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nivel educativo */}
        <div className="space-y-2">
          <Label>Nivel educativo</Label>
          <EduSelect
            value={selectedLevel}
            onChange={e => {
              setSelectedLevel(e.target.value)
              setSelectedGradeName('')
            }}
          >
            <option value="">Seleccionar nivel</option>
            {LEVELS.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </EduSelect>
        </div>

        {/* Grado */}
        <div className="space-y-2">
          <Label>Grado (Ley 115)</Label>
          <EduSelect
            value={selectedGradeName}
            onChange={e => setSelectedGradeName(e.target.value)}
            disabled={!selectedLevel}
          >
            <option value="">Seleccionar grado</option>
            {LEVELS.find(l => l.id === selectedLevel)?.grades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </EduSelect>
        </div>

        {/* Sufijo de grupo */}
        <div className="space-y-2">
          <Label>Sufijo de grupo</Label>
          <EduInput
            value={groupSuffix}
            onChange={e => setGroupSuffix(e.target.value)}
            placeholder="Ej: 01, A, 02"
            autoComplete="off"
          />
          <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
            Resultado: <span className="font-semibold text-slate-600 dark:text-slate-300">601</span> (Sexto + 01)
            o <span className="font-semibold text-slate-600 dark:text-slate-300">Transición A</span>.
          </p>
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
            {saving ? 'Creando grupo...' : 'Crear grupo'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
