import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from '@/lib/firebase/config'
import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react'

type Subject = {
  id: string;
  name: string;
  state?: boolean;
};

export default function SubjectsPage() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSubjects() }, [])

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'subjects'), orderBy('name', 'asc'))
      const snap = await getDocs(q)
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Subject[])
    } catch (error: any) {
      toast.error('Error al cargar asignaturas', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleState = async (subject: Subject) => {
    const newState = !subject.state
    await updateDoc(doc(db, 'subjects', subject.id), { state: newState })
    toast.success(newState ? 'Asignatura activada' : 'Asignatura desactivada')
    setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, state: newState } : s))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro? Se eliminarán todas las asignaciones asociadas.')) return
    await deleteDoc(doc(db, 'subjects', id))
    toast.success('Asignatura eliminada')
    setSubjects(prev => prev.filter(s => s.id !== id))
  }

  if (loading) return <div className="p-8 text-center">Cargando asignaturas...</div>

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24">
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra las materias del currículo escolar institucional.
          </p>
          <Button
            onClick={() => navigate('/dashboard/subjects/new')}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Nueva Asignatura
          </Button>
        </div>
      </div>

      <main className="p-4 space-y-3">
        {subjects.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-slate-900/30">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay asignaturas registradas.</p>
          </div>
        ) : (
          subjects.map(subject => (
            <div key={subject.id}
              className="bg-white dark:bg-[#151b2d] p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-300">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{subject.name}</h3>
                  <div
                    onClick={() => handleToggleState(subject)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider cursor-pointer transition-colors ${
                      subject.state !== false
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {subject.state !== false ? 'Activa' : 'Inactiva'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10"
                  onClick={() => navigate(`/dashboard/subjects/${subject.id}/edit`)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  onClick={() => handleDelete(subject.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
