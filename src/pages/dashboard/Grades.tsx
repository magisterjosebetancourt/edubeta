import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from '@/lib/firebase/config'
import { 
  updateDoc, 
  deleteDoc, 
  doc
} from 'firebase/firestore'
import { useGrades, useStudents, useTeachers } from '@/lib/hooks/useFirebaseData'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Trash2, Plus, School, Layers, Pencil, Users } from 'lucide-react'

type Grade = {
  id: string;
  name: string;
  state?: boolean;
  created_at?: any;
  studentCount?: number;
  director_id?: string | null;
};

// Estructura Ley 115 de 1994 (Colombia)
const LEVELS = [
  { id: 'preescolar', name: 'Preescolar', grades: ['Transición'] },
  { id: 'primaria', name: 'Básica Primaria', grades: ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'] },
  { id: 'secundaria', name: 'Básica Secundaria', grades: ['Sexto', 'Séptimo', 'Octavo', 'Noveno'] },
  { id: 'media', name: 'Educación Media', grades: ['Décimo', 'Once'] },
]

export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  
  const { data: gradesData, isLoading: loadingGrades } = useGrades()
  const { data: studentsData, isLoading: loadingStudents } = useStudents()
  const { data: teachersData } = useTeachers()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (loadingGrades || loadingStudents || !gradesData || !studentsData) return;
    
    try {
      // Sort A-Z
      const sortedGrades = [...gradesData].sort((a,b) => a.name.localeCompare(b.name, "es"))

      const countMap: Record<string, number> = {}
      studentsData.forEach((s: any) => {
        const gid = s.grade_id;
        if (gid) countMap[gid] = (countMap[gid] ?? 0) + 1
      })

      const gradesWithCount = sortedGrades.map(g => ({
        ...g,
        studentCount: countMap[g.id] ?? 0
      }))

      setGrades(gradesWithCount)
    } catch (error: any) {
      toast.error('Error al procesar grados', { description: error.message })
    } finally {
      setLoading(false)
    }
  }, [gradesData, studentsData, loadingGrades, loadingStudents])

  const handleToggleState = async (grade: Grade) => {
    try {
      const newState = !grade.state;
      const gradeRef = doc(db, 'grades', grade.id)
      await updateDoc(gradeRef, { state: newState })
      
      queryClient.setQueryData(['grades'], (old: any) => 
        old ? old.map((g: any) => g.id === grade.id ? { ...g, state: newState } : g) : old
      )

      toast.success(newState ? "Grupo activado" : "Grupo desactivado");
      setGrades((prev) =>
        prev.map((g) => (g.id === grade.id ? { ...g, state: newState } : g)),
      );
    } catch (error: any) {
      toast.error("Error al cambiar estado", { description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "¿Estás seguro de eliminar este grupo escolar? Se desconectarán los estudiantes asociados.",
      )
    )
      return;

    try {
      await deleteDoc(doc(db, 'grades', id))
      
      queryClient.setQueryData(['grades'], (old: any) => 
        old ? old.filter((g: any) => g.id !== id) : old
      )

      toast.success("Grupo eliminado");
      setGrades((prev) => prev.filter((g) => g.id !== id));
    } catch (error: any) {
      toast.error("Error al eliminar", { description: error.message });
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando grupos escolares...</div>

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24">
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gestión de grados y grupos según la Ley 115.
            </p>
          </div>
          <Button
            onClick={() => navigate('/dashboard/grades/new')}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Nuevo Grupo
          </Button>
        </div>
      </div>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Grupos Activos por Nivel</CardTitle>
            <CardDescription>Resumen de la organización escolar actual.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 space-y-6">
            {grades.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg bg-white/50 dark:bg-slate-900/30">
                <School className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-medium">
                  No hay grupos configurados.
                </p>
                <p className="text-sm text-slate-400">
                  Utiliza el botón + para crear el primer grupo.
                </p>
              </div>
            ) : (
              LEVELS.map((level) => {
                const levelGroups = grades.filter((g) => {
                  if (level.id === "preescolar") return g.name.includes("Transición");
                  const firstDigits = parseInt(
                    g.name.substring(0, g.name.length >= 4 ? 2 : 1),
                  );
                  if (isNaN(firstDigits)) return false;
                  if (level.id === "primaria") return firstDigits >= 1 && firstDigits <= 5;
                  if (level.id === "secundaria") return firstDigits >= 6 && firstDigits <= 9;
                  if (level.id === "media") return firstDigits >= 10 && firstDigits <= 11;
                  return false;
                });

                if (levelGroups.length === 0) return null;

                return (
                  <div
                    key={level.id}
                    className="bg-white dark:bg-[#151b2d] rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                  >
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm tracking-wide">
                          {level.name}
                        </h3>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-full border shadow-sm">
                        {levelGroups.length} Grupos
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {levelGroups.map((group) => (
                        <div
                          key={group.id}
                          className="relative group/item flex items-center justify-between p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-primary/50 transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-semibold">
                              Grado
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-base font-semibold text-slate-800 dark:text-white font-mono cursor-pointer hover:text-primary transition-colors"
                                onClick={() => navigate(`/dashboard/grades/${group.id}/students`)}
                              >
                                {group.name}
                              </span>
                              <div
                                onClick={() => handleToggleState(group)}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wider cursor-pointer transition-colors ${
                                  group.state !== false
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                                }`}
                              >
                                {group.state !== false ? "Activo" : "Inactivo"}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3 text-primary/70" />
                              <span className="text-[10px] font-semibold text-primary/80">
                                {group.studentCount ?? 0} {(group.studentCount ?? 0) === 1 ? 'estudiante' : 'estudiantes'}
                              </span>
                            </div>
                            {group.director_id && (
                              <p className="text-[10px] text-slate-400 mt-0.5 italic">
                                Dir: <span className="text-slate-500 font-semibold">{teachersData?.find((t: any) => t.id === group.director_id)?.full_name || 'Cargando...'}</span>
                              </p>
                            )}
                            <span
                              className="text-[10px] text-slate-500 font-medium cursor-pointer hover:underline"
                              onClick={() => navigate(`/dashboard/grades/${group.id}/students`)}
                            >
                              Ver estudiantes matriculados
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                              onClick={() => navigate(`/dashboard/grades/${group.id}/edit`)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              onClick={() => handleDelete(group.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
