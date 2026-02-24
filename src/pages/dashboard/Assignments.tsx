import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  BookOpen,
  GraduationCap,
  ChevronDown,
  Edit
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Teacher = { id: string; full_name: string };
type Grade = { id: string; name: string };
type Subject = { id: string; name: string };
type Assignment = {
  id: string;
  teacher_id: string;
  grade_id: string;
  subject_id: string;
  state?: boolean;
  teacher?: { full_name: string };
  grade?: { name: string };
  subject?: { name: string };
};

// Estructura Ley 115 de 1994 (Colombia) - Same as Grades.tsx
const LEVELS = [
  { id: "preescolar", name: "Preescolar", grades: ["Transición"] },
  {
    id: "primaria",
    name: "Básica Primaria",
    grades: ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto"],
  },
  {
    id: "secundaria",
    name: "Básica Secundaria",
    grades: ["Sexto", "Séptimo", "Octavo", "Noveno"],
  },
  { id: "media", name: "Educación Media", grades: ["Décimo", "Once"] },
];

const GRADE_MAP: Record<string, string> = {
  Primero: "1",
  Segundo: "2",
  Tercero: "3",
  Cuarto: "4",
  Quinto: "5",
  Sexto: "6",
  Séptimo: "7",
  Octavo: "8",
  Noveno: "9",
  Décimo: "10",
  Once: "11",
};

export default function AssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [selectedGradeName, setSelectedGradeName] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Estado para acordeón expandido
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(
    new Set(),
  );

  // Filter grades based on Level -> GradeName selection
  const filteredGrades = grades.filter((g) => {
    if (!selectedGradeName) return false;

    if (selectedGradeName === "Transición") {
      return g.name.includes("Transición");
    }

    const prefix = GRADE_MAP[selectedGradeName];
    if (!prefix) return false;

    // Special handling for '1' (Primero) vs '11' (Once)
    // If prefix is '1', we want '101' but not '1101'
    if (prefix === "1") {
      return g.name.startsWith("1") && !g.name.startsWith("11");
    }

    return g.name.startsWith(prefix);
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all reference data in parallel
      const [assSnap, teachSnap, gradSnap, subSnap] = await Promise.all([
        getDocs(query(collection(db, "assignments"), orderBy("teacher_id"))),
        getDocs(query(collection(db, "profiles"), where("role", "==", "teacher"), where("state", "==", true))),
        getDocs(query(collection(db, "grades"), where("state", "==", true))),
        getDocs(query(collection(db, "subjects"), where("state", "==", true)))
      ]);

      // 2. Map reference data for easy lookup
      const teacherMap = new Map(teachSnap.docs.map(doc => [doc.id, doc.data()]));
      const gradeMap = new Map(gradSnap.docs.map(doc => [doc.id, doc.data()]));
      const subjectMap = new Map(subSnap.docs.map(doc => [doc.id, doc.data()]));

      // 3. Build enriched assignments
      const enrichedAssignments = assSnap.docs.map(doc => {
        const data = doc.data();
        const tInfo = teacherMap.get(data.teacher_id) as any;
        const gInfo = gradeMap.get(data.grade_id) as any;
        const sInfo = subjectMap.get(data.subject_id) as any;

        return {
          id: doc.id,
          teacher_id: data.teacher_id,
          grade_id: data.grade_id,
          subject_id: data.subject_id,
          state: data.state,
          teacher: { full_name: tInfo?.full_name || "Desconocido" },
          grade: { name: gInfo?.name || "Desconocido" },
          subject: { name: sInfo?.name || "Desconocido" }
        } as Assignment;
      });

      setAssignments(enrichedAssignments);
      setTeachers(teachSnap.docs.map(doc => ({ id: doc.id, full_name: (doc.data() as any).full_name })));
      setGrades(gradSnap.docs.map(doc => ({ id: doc.id, name: (doc.data() as any).name })));
      setSubjects(subSnap.docs.map(doc => ({ id: doc.id, name: (doc.data() as any).name })));
      
    } catch (error: any) {
      console.error("Fetch Assignments Error:", error);
      toast.error("Error al cargar datos", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !selectedGradeId || !selectedSubject) {
      toast.error("Completar todos los campos");
      return;
    }

    setIsCreating(true);

    try {
      const exists = assignments.find(
        (a) =>
          a.grade_id === selectedGradeId &&
          a.subject_id === selectedSubject &&
          a.teacher_id === selectedTeacher,
      );

      if (exists) {
        toast.error("Esta asignación ya existe");
        setIsCreating(false);
        return;
      }

      await addDoc(collection(db, "assignments"), {
        teacher_id: selectedTeacher,
        grade_id: selectedGradeId,
        subject_id: selectedSubject,
        state: true,
        created_at: serverTimestamp()
      });

      toast.success("Asignación creada");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error("Error al asignar", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedTeacher("");
    setSelectedLevelId("");
    setSelectedGradeName("");
    setSelectedGradeId("");
    setSelectedSubject("");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !selectedTeacher || !selectedGradeId || !selectedSubject) {
      toast.error("Completar todos los campos");
      return;
    }

    setIsUpdating(true);

    try {
      const assRef = doc(db, "assignments", editingAssignment.id);
      await updateDoc(assRef, {
        teacher_id: selectedTeacher,
        grade_id: selectedGradeId,
        subject_id: selectedSubject,
        updated_at: serverTimestamp()
      });

      toast.success("Asignación actualizada");
      setEditingAssignment(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error("Error al actualizar", { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleState = async (assignment: Assignment) => {
    try {
      const newState = !assignment.state;
      const assRef = doc(db, "assignments", assignment.id);
      await updateDoc(assRef, { state: newState });

      toast.success(
        newState ? "Asignación activada" : "Asignación desactivada",
      );
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignment.id ? { ...a, state: newState } : a,
        ),
      );
    } catch (error: any) {
      toast.error("Error al cambiar estado", { description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta asignación?")) return;

    try {
      await deleteDoc(doc(db, "assignments", id));
      toast.success("Asignación eliminada");
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (error: any) {
      toast.error("Error al eliminar", { description: error.message });
    }
  };

  const toggleTeacher = (teacherId: string) => {
    const newExpanded = new Set(expandedTeachers);
    if (newExpanded.has(teacherId)) {
      newExpanded.delete(teacherId);
    } else {
      newExpanded.add(teacherId);
    }
    setExpandedTeachers(newExpanded);
  };

  // Agrupar asignaciones por docente
  const assignmentsByTeacher = teachers.reduce(
    (acc, teacher) => {
      acc[teacher.id] = assignments.filter((a) => a.teacher_id === teacher.id);
      return acc;
    },
    {} as Record<string, Assignment[]>,
  );

  if (loading)
    return (
      <div className="p-8 text-center">Cargando asignaciones académicas...</div>
    );

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24">
      {/* Header */}
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Define la carga académica vinculando docentes con grados y materias.
            </p>
          </div>
          <Button 
            onClick={() => {
              setEditingAssignment(null);
              setIsDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-bold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Nueva Asignación
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-4 space-y-3">
        {teachers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border-2 border-dashed rounded-lg py-20 px-10 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white">No hay docentes registrados</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
              Es necesario registrar docentes antes de realizar asignaciones.
            </p>
          </div>
        ) : (
          teachers.map((teacher) => {
            const teacherAssignments = assignmentsByTeacher[teacher.id] || [];
            const isExpanded = expandedTeachers.has(teacher.id);

            return (
              <div
                key={teacher.id}
                className="bg-white dark:bg-[#151b2d] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Acordeón Header */}
                <button
                  onClick={() => toggleTeacher(teacher.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {teacher.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {teacher.full_name || "Sin Nombre"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {teacherAssignments.length} asignación
                        {teacherAssignments.length !== 1 ? "es" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Acordeón Content */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-2">
                    {teacherAssignments.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                        Este docente no tiene asignaciones aún.
                      </p>
                    ) : (
                      teacherAssignments.map((assign) => (
                        <div
                          key={assign.id}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-300 flex-shrink-0">
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {assign.subject?.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {assign.grade?.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleState(assign);
                              }}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
                                assign.state !== false
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                              }`}
                            >
                              {assign.state !== false ? "Activo" : "Inactivo"}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAssignment(assign);
                                setSelectedTeacher(assign.teacher_id);
                                setSelectedLevelId(""); // Reset level/grade name as we don't store them easily
                                setSelectedGradeName("");
                                setSelectedGradeId(assign.grade_id);
                                setSelectedSubject(assign.subject_id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-all"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(assign.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
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
      <Dialog
        open={isDialogOpen || !!editingAssignment}
        onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            setEditingAssignment(null);
            setSelectedTeacher("");
            setSelectedLevelId("");
            setSelectedGradeName("");
            setSelectedGradeId("");
            setSelectedSubject("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {editingAssignment ? "Editar Asignación" : "Nueva Asignación"}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold tracking-widest text-slate-400">
              {editingAssignment ? "Modifica la vinculación actual" : "Vincula un docente a un grado y materia"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingAssignment ? handleUpdate : handleCreate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Docente</Label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Seleccionar Docente</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name || "Sin Nombre"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Nivel (Opcional para filtrar)</Label>
              <select
                value={selectedLevelId}
                onChange={(e) => {
                  setSelectedLevelId(e.target.value);
                  setSelectedGradeName("");
                }}
                className="w-full h-9 rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Filtrar por Nivel</option>
                {LEVELS.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Grado (Opcional para filtrar)</Label>
              <select
                value={selectedGradeName}
                onChange={(e) => setSelectedGradeName(e.target.value)}
                disabled={!selectedLevelId}
                className="w-full h-9 rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Filtrar por Grado</option>
                {selectedLevelId &&
                  LEVELS.find((l) => l.id === selectedLevelId)?.grades.map(
                    (gName) => (
                      <option key={gName} value={gName}>
                        {gName}
                      </option>
                    ),
                  )}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Grupo / Curso</Label>
              <select
                value={selectedGradeId}
                onChange={(e) => setSelectedGradeId(e.target.value)}
                className="w-full h-9 rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Seleccionar Grupo</option>
                {filteredGrades.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Materia</Label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full h-9 rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Seleccionar Materia</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingAssignment(null);
                }}
                className="font-bold text-[10px] tracking-widest rounded-lg"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating || isUpdating}
                className="bg-primary hover:bg-primary/90 text-white font-bold text-[10px] tracking-widest rounded-lg px-8 shadow-lg shadow-primary/20"
              >
                {isCreating || isUpdating ? "Guardando..." : (editingAssignment ? "Guardar Cambios" : "Crear Asignación")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
