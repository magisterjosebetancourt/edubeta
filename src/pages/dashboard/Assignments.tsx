import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  BookOpen,
  GraduationCap,
  ChevronDown,
  Edit,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type Teacher = { id: string; full_name: string };
type Grade = { id: number; name: string };
type Subject = { id: number; name: string };
type Assignment = {
  id: number;
  teacher_id: string;
  grade_id: number;
  subject_id: number;
  state?: boolean;
  teacher: { full_name: string };
  grade: { name: string };
  subject: { name: string };
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
  const supabase = createClient();
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
      const [assRes, teachRes, gradRes, subRes] = await Promise.all([
        supabase
          .from("assignments")
          .select(
            `
                        id, teacher_id, grade_id, subject_id, state,
                        teacher:profiles!teacher_id(full_name),
                        grade:grades!grade_id(name),
                        subject:subjects!subject_id(name)
                    `,
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "teacher")
          .filter("state", "eq", true),
        supabase
          .from("grades")
          .select("id, name")
          .eq("state", true)
          .order("name"),
        supabase
          .from("subjects")
          .select("id, name")
          .eq("state", true)
          .order("name"),
      ]);

      if (assRes.error) throw assRes.error;
      if (teachRes.error) throw teachRes.error;
      if (gradRes.error) throw gradRes.error;
      if (subRes.error) throw subRes.error;

      // Helper to clean up joined data which might be arrays or objects
      const cleanAssignments = (assRes.data || []).map((a: any) => ({
        id: a.id,
        teacher_id: a.teacher_id,
        grade_id: a.grade_id,
        subject_id: a.subject_id,
        state: a.state,
        teacher: Array.isArray(a.teacher) ? a.teacher[0] : a.teacher,
        grade: Array.isArray(a.grade) ? a.grade[0] : a.grade,
        subject: Array.isArray(a.subject) ? a.subject[0] : a.subject,
      }));

      setAssignments(cleanAssignments);
      setTeachers(teachRes.data || []);
      setGrades(gradRes.data || []);
      setSubjects(subRes.data || []);
    } catch (error: any) {
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
          a.grade_id === Number(selectedGradeId) &&
          a.subject_id === Number(selectedSubject) &&
          a.teacher_id === selectedTeacher,
      );

      if (exists) {
        toast.error("Esta asignación ya existe");
        setIsCreating(false);
        return;
      }

      const { error } = await supabase.from("assignments").insert({
        teacher_id: selectedTeacher,
        grade_id: Number(selectedGradeId),
        subject_id: Number(selectedSubject),
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya existe una asignación idéntica");
        } else {
          throw error;
        }
      } else {
        toast.success("Asignación creada");
        setIsDialogOpen(false);
        setSelectedTeacher("");
        setSelectedLevelId("");
        setSelectedGradeName("");
        setSelectedGradeId("");
        setSelectedSubject("");
        fetchData();
      }
    } catch (error: any) {
      toast.error("Error al asignar", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !selectedTeacher || !selectedGradeId || !selectedSubject) {
      toast.error("Completar todos los campos");
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await (supabase.from("assignments") as any)
        .update({
          teacher_id: selectedTeacher,
          grade_id: Number(selectedGradeId),
          subject_id: Number(selectedSubject),
        })
        .eq("id", editingAssignment.id);

      if (error) throw error;

      toast.success("Asignación actualizada");
      setEditingAssignment(null);
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
      const { error } = await (supabase.from("assignments") as any)
        .update({ state: newState })
        .eq("id", assignment.id);

      if (error) throw error;

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

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta asignación?")) return;

    try {
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", id);
      if (error) throw error;
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
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#151b2d]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Asignación Académica
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button className="bg-primary hover:bg-primary/90 text-white p-2 rounded-full shadow-lg shadow-primary/30 transition-transform active:scale-95 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva Asignación</DialogTitle>
                <DialogDescription>
                  Vincular Docente - Grado - Materia
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Docente</Label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
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
                  <Label>Nivel Educativo</Label>
                  <select
                    value={selectedLevelId}
                    onChange={(e) => {
                      setSelectedLevelId(e.target.value);
                      setSelectedGradeName("");
                      setSelectedGradeId("");
                    }}
                    className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                  >
                    <option value="">Seleccionar Nivel</option>
                    {LEVELS.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Grado (Ley 115)</Label>
                  <select
                    value={selectedGradeName}
                    onChange={(e) => {
                      setSelectedGradeName(e.target.value);
                      setSelectedGradeId("");
                    }}
                    disabled={!selectedLevelId}
                    className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                  >
                    <option value="">Seleccionar Grado</option>
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
                    disabled={!selectedGradeName}
                    className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                  >
                    <option value="">
                      {filteredGrades.length > 0
                        ? "Seleccionar Grupo"
                        : "No hay grupos"}
                    </option>
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
                    className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                  >
                    <option value="">Seleccionar Materia</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Creando..." : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Asigna qué materias dictan los docentes en cada curso.
        </p>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-3">
        {teachers.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/30">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              No hay docentes registrados.
            </p>
          </div>
        ) : (
          teachers.map((teacher) => {
            const teacherAssignments = assignmentsByTeacher[teacher.id] || [];
            const isExpanded = expandedTeachers.has(teacher.id);

            return (
              <div
                key={teacher.id}
                className="bg-white dark:bg-[#151b2d] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
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
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
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
                                setSelectedGradeId(String(assign.grade_id));
                                setSelectedSubject(String(assign.subject_id));
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
      {/* Edit Assignment Dialog */}
      <Dialog
        open={!!editingAssignment}
        onOpenChange={(open) => !open && setEditingAssignment(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Asignación</DialogTitle>
            <DialogDescription>
              Modifica la vinculación Docente - Grado - Materia.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
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
                {grades.map((g) => (
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
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingAssignment(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
