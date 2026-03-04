import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
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
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)

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

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

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
      }
      setExiting(true)
      setTimeout(() => navigate('/dashboard/assignments', { replace: true }), 220)
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const selectClass = "w-full h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none border border-slate-200 dark:border-slate-800 dark:text-white"

  if (loading) return <LoadingSpinner message="Cargando datos de asignación..." />;

  return (
    <FormView exiting={exiting}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isEdit ? 'Modifica la vinculación actual.' : 'Vincula un docente con un grupo y una materia.'}
        </p>

        <div className="space-y-2">
          <Label>Docente *</Label>
          <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} required className={selectClass}>
            <option value="">Seleccionar docente</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name || 'Sin nombre'}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Nivel (para filtrar grados)</Label>
          <select value={selectedLevelId} onChange={e => { setSelectedLevelId(e.target.value); setSelectedGradeName(''); }} className={selectClass}>
            <option value="">Todos los niveles</option>
            {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {selectedLevelId && (
          <div className="space-y-2">
            <Label>Grado (para filtrar grupos)</Label>
            <select value={selectedGradeName} onChange={e => setSelectedGradeName(e.target.value)} className={selectClass}>
              <option value="">Todos los grados</option>
              {LEVELS.find(l => l.id === selectedLevelId)?.grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Grupo / Curso *</Label>
          <select value={selectedGradeId} onChange={e => setSelectedGradeId(e.target.value)} required className={selectClass}>
            <option value="">Seleccionar grupo</option>
            {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Materia *</Label>
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} required className={selectClass}>
            <option value="">Seleccionar materia</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}
            className="w-full sm:w-auto rounded-lg h-auto py-3.5 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <X className="w-4 h-4 mr-1.5" />Cancelar
          </Button>
          <Button type="submit" disabled={saving}
            className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 gap-2 shadow-xl shadow-primary/20 font-semibold text-sm transition-all active:scale-[0.98]">
            <Save className="w-4 h-4" />{saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear asignación')}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
