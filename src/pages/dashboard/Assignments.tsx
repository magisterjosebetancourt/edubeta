import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase/config";
import {
  collection, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy
} from "firebase/firestore";
import { EduButton } from "@/components/ui/EduButton";
import { toast } from "sonner";
import { Trash2, Plus, BookOpen, GraduationCap, ChevronDown, Edit } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Teacher = { id: string; full_name: string; avatar_url?: string };
type Assignment = {
  id: string; teacher_id: string; grade_id: string; subject_id: string; state?: boolean;
  teacher?: { full_name: string; avatar_url?: string }; grade?: { name: string }; subject?: { name: string };
};

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assSnap, teachSnap, gradSnap, subSnap] = await Promise.all([
        getDocs(query(collection(db, "assignments"), orderBy("teacher_id"))),
        getDocs(query(collection(db, "profiles"), where("role", "==", "teacher"), where("state", "==", true))),
        getDocs(query(collection(db, "grades"), where("state", "==", true))),
        getDocs(query(collection(db, "subjects"), where("state", "==", true))),
      ]);
      const teacherMap = new Map(teachSnap.docs.map(d => [d.id, d.data()]));
      const gradeMap = new Map(gradSnap.docs.map(d => [d.id, d.data()]));
      const subjectMap = new Map(subSnap.docs.map(d => [d.id, d.data()]));
      const enriched = assSnap.docs.map(d => {
        const data = d.data();
        const t = teacherMap.get(data.teacher_id) as any;
        const g = gradeMap.get(data.grade_id) as any;
        const s = subjectMap.get(data.subject_id) as any;
        return { id: d.id, teacher_id: data.teacher_id, grade_id: data.grade_id, subject_id: data.subject_id, state: data.state,
          teacher: { 
            full_name: t?.full_name || 'Desconocido',
            avatar_url: t?.avatar_url
          }, 
          grade: { name: g?.name || 'Desconocido' }, 
          subject: { name: s?.name || 'Desconocido' } } as Assignment;
      });
      setAssignments(enriched);
      setTeachers(teachSnap.docs.map(d => ({ 
        id: d.id, 
        full_name: (d.data() as any).full_name,
        avatar_url: (d.data() as any).avatar_url
      })));
    } catch (error: any) {
      toast.error("Error al cargar datos", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleState = async (assignment: Assignment) => {
    const newState = !assignment.state;
    await updateDoc(doc(db, "assignments", assignment.id), { state: newState });
    toast.success(newState ? "Asignación activada" : "Asignación desactivada");
    setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, state: newState } : a));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta asignación?")) return;
    await deleteDoc(doc(db, "assignments", id));
    toast.success("Asignación eliminada");
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const toggleTeacher = (teacherId: string) => {
    const newExpanded = new Set(expandedTeachers);
    newExpanded.has(teacherId) ? newExpanded.delete(teacherId) : newExpanded.add(teacherId);
    setExpandedTeachers(newExpanded);
  };

  const assignmentsByTeacher = teachers.reduce((acc, t) => {
    acc[t.id] = assignments.filter(a => a.teacher_id === t.id);
    return acc;
  }, {} as Record<string, Assignment[]>);

  if (loading) return <LoadingSpinner message="Cargando asignaciones académicas..." />;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24">
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
            Define la carga académica vinculando docentes con grados y materias.
          </p>
          <EduButton onClick={() => navigate('/dashboard/assignments/new')}
            icon={Plus}
            className="h-12 px-6 w-full sm:w-auto"
          >
            Nueva Asignación
          </EduButton>
        </div>
      </div>
      <main className="p-4 space-y-3">
        {teachers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border-2 border-dashed rounded-lg py-20 px-10 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white">No hay docentes registrados</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
              Registra docentes antes de realizar asignaciones.
            </p>
          </div>
        ) : (
          teachers.map(teacher => {
            const teacherAssignments = assignmentsByTeacher[teacher.id] || [];
            const isExpanded = expandedTeachers.has(teacher.id);
            return (
              <div key={teacher.id} className="bg-white dark:bg-[#151b2d] rounded-[5px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                <button onClick={() => toggleTeacher(teacher.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-full bg-[#C6E7FC] overflow-hidden flex items-center justify-center text-[#0099FE] font-semibold text-sm shrink-0 border border-primary/10">
                      {teacher.avatar_url ? (
                        <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
                      ) : (
                        teacher.full_name?.charAt(0) || "?"
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{teacher.full_name || "Sin Nombre"}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {teacherAssignments.length} asignación{teacherAssignments.length !== 1 ? "es" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-2">
                    {teacherAssignments.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                        Este docente no tiene asignaciones aún.
                      </p>
                    ) : (
                      teacherAssignments.map(assign => (
                        <div key={assign.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-300 flex-shrink-0">
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white leading-tight uppercase tracking-tight text-sm truncate">{assign.subject?.name}</p>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{assign.grade?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div onClick={e => { e.stopPropagation(); handleToggleState(assign); }}
                              className={`inline-flex items-center px-3 py-1 rounded-[5px] text-[10px] font-semibold tracking-wider cursor-pointer transition-all border ${
                                assign.state !== false
                                  ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 hover:bg-green-100"
                                  : "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100"
                              }`}>
                              {assign.state !== false ? "Activo" : "Inactivo"}
                            </div>
                            <button onClick={e => { e.stopPropagation(); navigate(`/dashboard/assignments/${assign.id}/edit`); }}
                              className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[5px] hover:bg-slate-50 transition-all flex items-center justify-center">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(assign.id); }}
                              className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-[5px] hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
