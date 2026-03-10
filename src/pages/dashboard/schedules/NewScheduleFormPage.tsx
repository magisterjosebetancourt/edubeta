import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduSelect } from '@/components/ui/EduSelect'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, Loader2, CalendarDays } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { useUserProfile } from '@/lib/context/UserProfileContext'
import { useQueryClient } from '@tanstack/react-query'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function NewScheduleFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { profile } = useUserProfile()
  
  const userRole = profile?.role || 'user'
  // If admin/coordinator, teacher_id comes from URL. If teacher, it comes from profile.
  const queryTeacherId = searchParams.get('teacher_id')
  const teacherId = userRole === 'teacher' ? profile?.uid : queryTeacherId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [assignments, setAssignments] = useState<any[]>([])
  
  // Form fields
  const [day, setDay] = useState('Lunes')
  const [timeItem, setTimeItem] = useState('1')
  const [weight, setWeight] = useState(1)
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')

  const availableGroups = useMemo(() => {
    const map = new Map();
    assignments.forEach(a => {
      if (!map.has(a.grade_id)) map.set(a.grade_id, a.grade_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  useEffect(() => {
    if (availableGroups.length > 0 && !availableGroups.find(g => g.id === selectedGroupId)) {
      setSelectedGroupId(availableGroups[0].id);
    } else if (availableGroups.length === 0) {
      setSelectedGroupId('');
    }
  }, [availableGroups, selectedGroupId]);

  const availableSubjects = useMemo(() => {
    return assignments.filter(a => a.grade_id === selectedGroupId);
  }, [assignments, selectedGroupId]);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.find(s => s.subject_id === selectedSubjectId)) {
      setSelectedSubjectId(availableSubjects[0].subject_id);
    } else if (availableSubjects.length === 0) {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId]);

  useEffect(() => {
    if (!teacherId) {
      toast.error('No se ha especificado un docente')
      navigate('/dashboard/schedules')
      return
    }

    const loadAssignments = async () => {
      try {
        const [assSnap, gradSnap, subSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "assignments"),
              where("teacher_id", "==", teacherId),
              where("state", "==", true)
            )
          ),
          getDocs(query(collection(db, "grades"), where("state", "==", true))),
          getDocs(query(collection(db, "subjects"), where("state", "==", true)))
        ]);

        const gradeMap = new Map(gradSnap.docs.map(d => [d.id, d.data()]));
        const subjectMap = new Map(subSnap.docs.map(d => [d.id, d.data()]));

        const list = assSnap.docs.map(d => {
           const data = d.data();
           const g = gradeMap.get(data.grade_id) as any;
           const s = subjectMap.get(data.subject_id) as any;
           return {
             id: d.id,
             ...data,
             grade_name: g?.name || 'Desconocido',
             subject_name: s?.name || 'Desconocida'
           };
        });
        setAssignments(list);
      } catch (error: any) {
        toast.error('Error al cargar asignaciones', { description: error.message });
      } finally {
        setLoading(false);
      }
    }
    loadAssignments()
  }, [teacherId, navigate])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroupId || !selectedSubjectId) {
      toast.error('Debes seleccionar un grupo y una asignatura válidos')
      return
    }
    setSaving(true)

    const assignment = assignments.find(a => a.grade_id === selectedGroupId && a.subject_id === selectedSubjectId)
    if (!assignment) {
      setSaving(false)
      toast.error('Asignación inválida')
      return
    }

    try {
      const newSchedule = {
        teacher_id: teacherId,
        assignment_id: assignment.id,
        group_id: assignment.grade_id,
        group_name: assignment.grade_name || "Desconocido",
        subject_id: assignment.subject_id,
        subject_name: assignment.subject_name || "Desconocida",
        day,
        time_item: Number(timeItem),
        weight: Number(weight),
        created_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'schedules'), newSchedule)
      
      // Optimistic update
      queryClient.setQueryData(['schedules'], (old: any) => {
        const newVal = { id: docRef.id, ...newSchedule }
        return old ? [...old, newVal] : [newVal]
      })

      toast.success('Hora de clase registrada')
      navigate('/dashboard/schedules', { replace: true })
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando asignaciones..." />;

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
           <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
             <CalendarDays className="w-5 h-5 text-primary" />
           </div>
           <div>
             <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Nueva hora de clase</h2>
             <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">Programa el horario del docente en la semana.</p>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Día de la semana</Label>
            <EduSelect value={day} onChange={e => setDay(e.target.value)} required>
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </EduSelect>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Hora</Label>
            <EduSelect value={timeItem} onChange={e => setTimeItem(e.target.value)} required>
              {Array.from({length: 10}, (_, i) => i + 1).map(h => (
                <option key={h} value={h}>Hora {h}</option>
              ))}
            </EduSelect>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Peso (Duración)</Label>
           <EduSelect value={weight} onChange={e => setWeight(Number(e.target.value))} required>
              <option value={1}>1 Hora</option>
              <option value={2}>Bloque (2 horas consecutivas)</option>
           </EduSelect>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Grupo *</Label>
            <EduSelect value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} required disabled={availableGroups.length === 0}>
              {availableGroups.length === 0 ? (
                 <option value="">Sin grupos asignados</option>
              ) : (
                  availableGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))
              )}
            </EduSelect>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Asignatura *</Label>
            <EduSelect value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} required disabled={availableSubjects.length === 0}>
              {availableSubjects.length === 0 ? (
                 <option value="">Sin asignaturas</option>
              ) : (
                  availableSubjects.map(s => (
                    <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                  ))
              )}
            </EduSelect>
          </div>
        </div>
        
        {assignments.length === 0 && (
          <p className="text-[10px] text-amber-500 font-medium mt-1">
            El docente necesita tener asignación académica para poder programarle horario.
          </p>
        )}

        <div className="pt-6">
          <EduButton type="submit" disabled={saving || assignments.length === 0} fullWidth icon={saving ? Loader2 : Save}>
            {saving ? 'Guardando...' : 'Guardar y Programar'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
