import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import { CsvUploader } from "@/components/students/CsvUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, UserPlus, Search, Edit, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

// Estructura Ley 115 de 1994 (Colombia)
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

type Grade = {
  id: string;
  name: string;
  level?: string;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_id?: string | number;
  state?: boolean;
  grades?: {
    name: string;
  };
  attendance_stats?: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGradeId, setFilterGradeId] = useState<string>("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const gradeId = searchParams.get("gradeId");
    if (gradeId) {
      setFilterGradeId(gradeId);
    }
  }, [searchParams]);

  // Jerarquía de grades
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [selectedGradeName, setSelectedGradeName] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");

  // Para editar
  const [editLevelId, setEditLevelId] = useState<string>("");
  const [editGradeName, setEditGradeName] = useState<string>("");
  const [editGradeId, setEditGradeId] = useState<string>("");

  const supabase = createClient();

  const fetchData = async () => {
    try {
      const [studentsRes, gradesRes, attendanceRes] = await Promise.all([
        supabase
          .from("students")
          .select(`*, grades (name)`)
          .order("first_name", { ascending: true }),
        supabase.from("grades").select("*").eq("state", true).order("name", { ascending: true }),
        supabase.from("attendance_records").select("student_id, status")
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (gradesRes.error) throw gradesRes.error;
      if (attendanceRes.error) throw attendanceRes.error;

      const attendanceData = (attendanceRes.data as any[]) || [];
      const studentsWithStats = (studentsRes.data || []).map((student: any) => {
        const studentAttendance = attendanceData.filter(a => a.student_id === student.id);
        return {
          ...student,
          attendance_stats: {
            present: studentAttendance.filter(a => a.status === 'present').length,
            absent: studentAttendance.filter(a => a.status === 'absent').length,
            late: studentAttendance.filter(a => a.status === 'late').length,
            excused: studentAttendance.filter(a => a.status === 'excused').length,
          }
        };
      });

      setStudents(studentsWithStats);
      setGrades(gradesRes.data || []);
    } catch (error: any) {
      toast.error("Error al cargar datos", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrar grades según la jerarquía
  const filteredGradesForSelect = grades.filter((g) => {
    if (!selectedGradeName) return false;

    if (selectedGradeName === "Transición") {
      return g.name.includes("Transición");
    }

    const prefix = GRADE_MAP[selectedGradeName];
    if (!prefix) return false;

    if (prefix === "1") {
      return g.name.startsWith("1") && !g.name.startsWith("11");
    }

    return g.name.startsWith(prefix);
  });

  // Lo mismo para editar
  const filteredGradesForEdit = grades.filter((g) => {
    if (!editGradeName) return false;

    if (editGradeName === "Transición") {
      return g.name.includes("Transición");
    }

    const prefix = GRADE_MAP[editGradeName];
    if (!prefix) return false;

    if (prefix === "1") {
      return g.name.startsWith("1") && !g.name.startsWith("11");
    }

    return g.name.startsWith(prefix);
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const gradeId = selectedGradeId;

    if (!firstName || !lastName || !gradeId) {
      toast.error("Completar todos los campos");
      setIsCreating(false);
      return;
    }

    try {
      const { error } = await supabase.from("students").insert([
        {
          first_name: firstName,
          last_name: lastName,
          grade_id: Number(gradeId),
        },
      ] as any);

      if (error) throw error;

      toast.success("Estudiante matriculado");
      setIsDialogOpen(false);
      setSelectedLevelId("");
      setSelectedGradeName("");
      setSelectedGradeId("");
      fetchData();
    } catch (error: any) {
      toast.error("Error al matricular", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStudent) return;

    setIsUpdating(true);
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const gradeId = editGradeId;

    if (!firstName || !lastName || !gradeId) {
      toast.error("Completar todos los campos");
      setIsUpdating(false);
      return;
    }

    try {
      const { error } = await (supabase.from("students") as any)
        .update({
          first_name: firstName,
          last_name: lastName,
          grade_id: Number(gradeId),
        })
        .eq("id", editingStudent.id);

      if (error) throw error;

      toast.success("Estudiante actualizado");
      setEditingStudent(null);
      fetchData();
    } catch (error: any) {
      toast.error("Error al actualizar", { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleState = async (student: Student) => {
    try {
      const newState = !student.state;
      const { error } = await (supabase
        .from("students") as any)
        .update({ state: newState })
        .eq("id", student.id);

      if (error) throw error;

      toast.success(newState ? "Estudiante activado" : "Estudiante desactivado");
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, state: newState } : s)),
      );
    } catch (error: any) {
      toast.error("Error al cambiar estado", { description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este estudiante?")) return;

    try {
      const { error } = await supabase.from("students").delete().eq("id", id);

      if (error) throw error;

      toast.success("Estudiante eliminado");
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (error: any) {
      toast.error("Error al eliminar", { description: error.message });
    }
  };

  // Filter students
  const filteredStudents = students.filter((student) => {
    const nameMatch = `${student.first_name} ${student.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const gradeMatch =
      filterGradeId === "" || String(student.grade_id) === filterGradeId;

    return nameMatch && gradeMatch;
  });

  if (loading)
    return <div className="p-8 text-center">Cargando estudiantes...</div>;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-800 dark:text-slate-100 pb-20">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#151b2d]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Estudiantes
            </h1>
          </div>

          <div className="flex gap-2">
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-full shadow-sm transition-transform active:scale-95 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importación Masiva</DialogTitle>
                  <DialogDescription>
                    Sube un archivo CSV (nombre, apellido, grado) para registrar
                    múltiples estudiantes.
                  </DialogDescription>
                </DialogHeader>
                <CsvUploader
                  onSuccess={() => {
                    setIsImportOpen(false);
                    fetchData();
                  }}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="bg-primary hover:bg-primary/90 text-white p-2 rounded-full shadow-lg shadow-primary/30 transition-transform active:scale-95 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Matricular Estudiante</DialogTitle>
                  <DialogDescription>
                    Ingresa los datos del nuevo estudiante.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="Ej. Juan"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Ej. Pérez"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Grado/Curso</Label>
                    <select
                      value={selectedLevelId}
                      onChange={(e) => {
                        setSelectedLevelId(e.target.value);
                        setSelectedGradeName("");
                        setSelectedGradeId("");
                      }}
                      className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                    >
                      <option value="">Nivel Educativo</option>
                      {LEVELS.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <select
                      value={selectedGradeName}
                      onChange={(e) => {
                        setSelectedGradeName(e.target.value);
                        setSelectedGradeId("");
                      }}
                      disabled={!selectedLevelId}
                      className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                    >
                      <option value="">Grado (Ley 115)</option>
                      {selectedLevelId &&
                        LEVELS.find(
                          (l) => l.id === selectedLevelId,
                        )?.grades.map((gName) => (
                          <option key={gName} value={gName}>
                            {gName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <select
                      value={selectedGradeId}
                      onChange={(e) => setSelectedGradeId(e.target.value)}
                      disabled={!selectedGradeName}
                      className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                    >
                      <option value="">
                        {filteredGradesForSelect.length > 0
                          ? "Grupo/Curso"
                          : "No hay grupos"}
                      </option>
                      {filteredGradesForSelect.map((g) => (
                        <option key={g.id} value={String(g.id)}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isCreating}
                  >
                    {isCreating ? "Guardando..." : "Matricular"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-[#1e2536] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary/50 transition-shadow outline-none"
              placeholder="Buscar por apellido o nombre..."
              type="text"
            />
          </div>

          <select
            value={filterGradeId}
            onChange={(e) => setFilterGradeId(e.target.value)}
            className="min-w-[120px] bg-slate-100 dark:bg-[#1e2536] border-none rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 transition-shadow outline-none"
          >
            <option value="">Todos los grados</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content List */}
      <main className="px-4 py-4 space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>No se encontraron estudiantes.</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className="group relative bg-white dark:bg-[#151b2d] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.99] transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {student.first_name.charAt(0)}
                    {student.last_name.charAt(0)}
                  </div>
                  <div className="cursor-pointer" onClick={() => navigate(`/dashboard/students/${student.id}`)}>
                    <h3 className="font-semibold text-slate-900 dark:text-white leading-tight hover:text-primary transition-colors uppercase">
                      {student.first_name}, {student.last_name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Acudiente: No registrado
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wide">
                    {student.grades?.name || "Sin Asignar"}
                  </span>
                  <div
                    onClick={() => handleToggleState(student)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                      student.state !== false
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {student.state !== false ? "Activo" : "Inactivo"}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-[9px] font-bold border border-green-100 dark:border-green-800" title="Asistencias">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {student.attendance_stats?.present || 0}
                    </div>
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-[9px] font-bold border border-red-100 dark:border-red-800" title="Inasistencias">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {student.attendance_stats?.absent || 0}
                    </div>
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded text-[9px] font-bold border border-amber-100 dark:border-amber-800" title="Tardanzas">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {student.attendance_stats?.late || 0}
                    </div>
                  </div>
                </div>
              </div>
              {/* Quick Actions */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingStudent(student);
                    setEditLevelId("");
                    setEditGradeName("");
                    setEditGradeId(String(student.grade_id || ""));
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(student.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Edit Student Dialog */}
      <Dialog
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Estudiante</DialogTitle>
            <DialogDescription>
              Modifica los datos personales y académicos del estudiante.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">Nombre</Label>
                <Input
                  id="edit-firstName"
                  name="firstName"
                  defaultValue={editingStudent?.first_name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Apellido</Label>
                <Input
                  id="edit-lastName"
                  name="lastName"
                  defaultValue={editingStudent?.last_name}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grado/Curso</Label>
              <select
                value={editLevelId}
                onChange={(e) => {
                  setEditLevelId(e.target.value);
                  setEditGradeName("");
                  setEditGradeId("");
                }}
                className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
              >
                <option value="">Nivel Educativo</option>
                {LEVELS.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <select
                value={editGradeName}
                onChange={(e) => {
                  setEditGradeName(e.target.value);
                  setEditGradeId("");
                }}
                disabled={!editLevelId}
                className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
              >
                <option value="">Grado (Ley 115)</option>
                {editLevelId &&
                  LEVELS.find((l) => l.id === editLevelId)?.grades.map(
                    (gName) => (
                      <option key={gName} value={gName}>
                        {gName}
                      </option>
                    ),
                  )}
              </select>
            </div>

            <div className="space-y-2">
              <select
                value={editGradeId}
                onChange={(e) => setEditGradeId(e.target.value)}
                disabled={!editGradeName}
                className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
              >
                <option value="">
                  {filteredGradesForEdit.length > 0
                    ? "Grupo/Curso"
                    : "No hay grupos"}
                </option>
                {filteredGradesForEdit.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingStudent(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
