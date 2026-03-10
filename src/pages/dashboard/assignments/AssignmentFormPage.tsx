import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduSelect } from '@/components/ui/EduSelect'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, query, where, serverTimestamp } from 'firebase/firestore'

type Teacher = { id: string; full_name: string }
type Grade = { id: string; name: string }
type Subject = { id: string; name: string }

const LEVELS = [
  { id: 'preescolar', name: 'Preescolar', grades: ['Transición'] },
  { id: 'primaria', name: 'Básica Primaria', grades: ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'] },
  { id: 'secundaria', name: 'Básica Secundaria', grades: ['Sexto', 'Séptimo', 'Octavo', 'Noveno'] },
  { id: 'media', name: 'Educación Media', grades: ['Décimo', 'Once'] },
]
const GRADE_MAP: Record<string, string> = {
  Primero:'1',Segundo:'2',Tercero:'3',Cuarto:'4',Quinto:'5',
  Sexto:'6','Séptimo':'7',Octavo:'8',Noveno:'9','Décimo':'10',Once:'11',
}

export default function AssignmentFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedLevelId, setSelectedLevelId] = useState('')
  const [selectedGradeName, setSelectedGradeName] = useState('')
  const [selectedGradeId, setSelectedGradeId] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')

  useEffect(() => {
    const load = async () => {
      const [teachSnap, gradSnap, subSnap] = await Promise.all([
        getDocs(query(collection(db, 'profiles'), where('role', '==', 'teacher'), where('state', '==', true))),
        getDocs(query(collection(db, 'grades'), where('state', '==', true))),
        getDocs(query(collection(db, 'subjects'), where('state', '==', true))),
      ])
      setTeachers(teachSnap.docs.map(d => ({ id: d.id, full_name: (d.data() as any).full_name })))
      setGrades(gradSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })))
      setSubjects(subSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })))

      if (isEdit && id) {
        const snap = await getDoc(doc(db, 'assignments', id))
        if (snap.exists()) {
          const data = snap.data()
          setSelectedTeacher(data.teacher_id || '')
          setSelectedGradeId(data.grade_id || '')
          setSelectedSubject(data.subject_id || '')
        }
      }
      setLoading(false)
    }
    load().catch(e => { toast.error('Error al cargar datos', { description: e.message }); setLoading(false) })
  }, [id, isEdit])

  const filteredGrades = grades.filter(g => {
    if (!selectedGradeName) return true
    if (selectedGradeName === 'Transición') return g.name.includes('Transición')
    const prefix = GRADE_MAP[selectedGradeName]
    if (!prefix) return false
    if (prefix === '1') return g.name.startsWith('1') && !g.name.startsWith('11')
    return g.name.startsWith(prefix)
  })


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeacher || !selectedGradeId || !selectedSubject) {
      toast.error('Completa todos los campos requeridos')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await updateDoc(doc(db, 'assignments', id!), {
          teacher_id: selectedTeacher,
          grade_id: selectedGradeId,
          subject_id: selectedSubject,
          updated_at: serverTimestamp(),
        })
        toast.success('Asignación actualizada')
      } else {
        await addDoc(collection(db, 'assignments'), {
          teacher_id: selectedTeacher,
          grade_id: selectedGradeId,
          subject_id: selectedSubject,
          state: true,
          created_at: serverTimestamp(),
        })
        toast.success('Asignación creada')
        // Optimización: No salir del formulario, solo resetear el grupo
        setSelectedGradeId('')
      }
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }


  if (loading) return <LoadingSpinner message="Cargando datos de asignación..." />;

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
          {isEdit ? 'Modifica la vinculación actual.' : 'Vincula un docente con un grupo y una materia.'}
        </p>

        <div className="space-y-2">
          <Label>Docente *</Label>
          <EduSelect value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} required>
            <option value="">Seleccionar docente</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name || 'Sin nombre'}</option>)}
          </EduSelect>
        </div>

        <div className="space-y-2">
          <Label>Nivel (para filtrar grados)</Label>
          <EduSelect value={selectedLevelId} onChange={e => { setSelectedLevelId(e.target.value); setSelectedGradeName(''); }}>
            <option value="">Todos los niveles</option>
            {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </EduSelect>
        </div>

        {selectedLevelId && (
          <div className="space-y-2">
            <Label>Grado (para filtrar grupos)</Label>
            <EduSelect value={selectedGradeName} onChange={e => setSelectedGradeName(e.target.value)}>
              <option value="">Todos los grados</option>
              {LEVELS.find(l => l.id === selectedLevelId)?.grades.map(g => <option key={g} value={g}>{g}</option>)}
            </EduSelect>
          </div>
        )}

        <div className="space-y-2">
          <Label>Grupo / Curso *</Label>
          <EduSelect value={selectedGradeId} onChange={e => setSelectedGradeId(e.target.value)} required>
            <option value="">Seleccionar grupo</option>
            {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </EduSelect>
        </div>

        <div className="space-y-2">
          <Label>Materia *</Label>
          <EduSelect value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} required>
            <option value="">Seleccionar materia</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </EduSelect>
        </div>

        <div className="pt-2">
          <EduButton
            type="submit"
            disabled={saving}
            icon={Save}
            fullWidth
          >
            {saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear asignación')}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
