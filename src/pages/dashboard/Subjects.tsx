import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from '@/lib/firebase/config'
import { updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { useSubjects } from '@/lib/hooks/useFirebaseData'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { BookOpen, Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react'

type Subject = {
  id: string;
  name: string;
  state?: boolean;
};

export default function SubjectsPage() {
  const navigate = useNavigate()
  const { data: subjectsData, isLoading: loadingSubjects } = useSubjects()
  const queryClient = useQueryClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (loadingSubjects || !subjectsData) return
    const sorted = [...subjectsData].sort((a,b) => a.name.localeCompare(b.name, "es"))
    setSubjects(sorted)
    setLoading(false)
  }, [subjectsData, loadingSubjects])

  const handleToggleState = async (subject: Subject) => {
    try {
      const newState = !subject.state
      await updateDoc(doc(db, 'subjects', subject.id), { state: newState })
      
      queryClient.setQueryData(['subjects'], (old: any) => 
        old ? old.map((s: any) => s.id === subject.id ? { ...s, state: newState } : s) : old
      )

      toast.success(newState ? 'Asignatura activada' : 'Asignatura desactivada')
      setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, state: newState } : s))
    } catch (error: any) {
      toast.error('Error al cambiar estado', { description: error.message })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro? Se eliminarán todas las asignaciones asociadas.')) return
    try {
      await deleteDoc(doc(db, 'subjects', id))
      
      queryClient.setQueryData(['subjects'], (old: any) => 
        old ? old.filter((s: any) => s.id !== id) : old
      )

      toast.success('Asignatura eliminada')
      setSubjects(prev => prev.filter(s => s.id !== id))
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error.message })
    }
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
            className="bg-primary hover:bg-primary/90 text-white rounded-[5px] h-auto py-3 px-6 gap-2 shadow-xl shadow-primary/20 font-bold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 uppercase"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Nueva Asignatura
          </Button>
        </div>
      </div>

      <main className="p-4 space-y-3">
        {subjects.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[5px] bg-white/50 dark:bg-slate-900/30">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay asignaturas registradas.</p>
          </div>
        ) : (
          subjects.map(subject => (
            <div key={subject.id}
              className="bg-white dark:bg-[#151b2d] rounded-[5px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-[5px] bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-300">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{subject.name}</h3>
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
              </div>

              {/* Acciones de la asignatura */}
              <div className="px-3 pb-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-nowrap items-center justify-end w-full gap-1 overflow-x-auto bg-slate-50/50 dark:bg-black/10">
                <button
                  onClick={() => handleToggleState(subject)}
                  className={`flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-2 rounded-[5px] text-xs font-semibold border transition-all ${
                    subject.state !== false
                      ? "text-amber-600 bg-white border-amber-100 dark:bg-slate-900 dark:border-amber-900/30 hover:bg-amber-50"
                      : "text-green-600 bg-white border-green-100 dark:bg-slate-900 dark:border-green-900/30 hover:bg-green-50"
                  }`}
                >
                  {subject.state !== false ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span className="truncate">{subject.state !== false ? "Desactivar" : "Activar"}</span>
                </button>
                <button
                  onClick={() => navigate(`/dashboard/subjects/${subject.id}/edit`)}
                  className="flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-2 rounded-[5px] text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="truncate">Editar</span>
                </button>
                <button
                  onClick={() => handleDelete(subject.id)}
                  className="flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-2 rounded-[5px] text-xs font-semibold text-red-500 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-all shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="truncate">Eliminar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
