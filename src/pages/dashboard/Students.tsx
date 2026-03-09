import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { useUserProfile } from "@/lib/context/UserProfileContext";
import { useQueryClient } from "@tanstack/react-query";
import { useStudents, useGrades } from '@/lib/hooks/useFirebaseData';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Edit, MapPin, UserPlus, FileUp, FileSignature, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Grade = { id: string; name: string };

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_id?: string | number;
  neighborhood?: string;
  state?: boolean;
  grades?: { name: string };
  attendance_stats?: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
};

export default function StudentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, firebaseUser } = useUserProfile();
  const { data: studentsData, isLoading: isLoadingStudents } = useStudents();
  const { data: gradesData, isLoading: isLoadingGrades } = useGrades();

  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const userRole = profile?.role || 'user';
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGradeId, setFilterGradeId] = useState<string>("");

  useEffect(() => {
    if (isLoadingStudents || isLoadingGrades) return;
    fetchData();
  }, [profile, firebaseUser, studentsData, gradesData, isLoadingStudents, isLoadingGrades]);

  const fetchData = async () => {
    try {
      setLoadingInitial(true);
      const user = firebaseUser;
      if (!user || !profile) return;

      const role = profile.role;

      let validGradeIds: string[] = [];
      if (role === "teacher") {
        // Obtenemos qué asignaturas le pertenecen al docente (assignments)
        // Esto sí es específico de cada usuario y cambia
        const assSnap = await getDocs(
          query(
            collection(db, "assignments"),
            where("teacher_id", "==", user.uid),
            where("state", "==", true)
          )
        );
        validGradeIds = assSnap.docs.map((d) => d.data().grade_id);
      }

      // Cargamos Grades desde RC Cache
      let gradesList = gradesData ? [...gradesData] : [];
      if (role === "teacher") {
        gradesList = gradesList.filter(g => validGradeIds.includes(g.id));
      } else if (role === "admin" || role === "coordinator") {
        gradesList = gradesList.filter(g => g.state === true); // active grades only
      }
      gradesList.sort((a,b) => a.name.localeCompare(b.name));
      setGrades(gradesList);

      // Cargamos estudiantes desde RC cache
      let studentsList = studentsData ? [...studentsData] : [];
      if (role === "teacher") {
         studentsList = studentsList.filter(s => validGradeIds.includes(s.grade_id as string));
      }

      // Map grade names
      const gradeMap = new Map((gradesData || []).map(g => [g.id, g.name]));
      const enrichedStudents = studentsList.map(s => ({
         ...s,
         grades: { name: gradeMap.get(s.grade_id as string) || "Sin Asignar" }
      }));
      
      enrichedStudents.sort((a,b) => (a.last_name || "").localeCompare(b.last_name || "", "es"));
      setStudents(enrichedStudents);
    } catch (error: any) {
      console.error("Error loading students view context:", error);
      toast.error("Error al cargar la información");
    } finally {
      setLoadingInitial(false);
    }
  };

  const loading = loadingInitial || isLoadingStudents || isLoadingGrades;

  const handleToggleState = async (student: Student) => {
    try {
      const newState = !student.state;
      await updateDoc(doc(db, "students", student.id), { state: newState });
      
      // Actualización de cache y UI local simultánea
      queryClient.setQueryData(['students'], (old: any) => 
        old ? old.map((s: any) => (s.id === student.id ? { ...s, state: newState } : s)) : old
      );

      toast.success(newState ? "Estudiante activado" : "Estudiante desactivado");
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, state: newState } : s))
      );
    } catch (error: any) {
      toast.error("Error al cambiar estado", { description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este estudiante?")) return;
    try {
      await deleteDoc(doc(db, "students", id));
      
      // Eliminar de caché local directamente, previniendo recarga
      queryClient.setQueryData(['students'], (old: any) => 
        old ? old.filter((s: any) => s.id !== id) : old
      );

      toast.success("Estudiante eliminado exitosamente");
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (error: any) {
      toast.error("Error al eliminar", { description: error.message });
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const nameMatch = `${s.last_name} ${s.first_name} ${s.neighborhood || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const gradeMatch = filterGradeId === "" || String(s.grade_id) === filterGradeId;
      return nameMatch && gradeMatch;
    });
  }, [students, searchTerm, filterGradeId]);

  if (loading) return <LoadingSpinner message="Cargando estudiantes..." />;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-800 dark:text-slate-100 pb-24">
      <div className="p-4 space-y-4">
        <p className="w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-6">
          Listado de alumnos matriculados.
        </p>

        {/* Barra de búsqueda y acciones */}
        <div className="grid grid-cols-1 gap-3 md:flex md:items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Buscar por apellido o nombre..."
              type="text"
            />
          </div>

          <div className="w-full grid grid-cols-2 md:flex gap-2">
            <select
              value={filterGradeId}
              onChange={(e) => setFilterGradeId(e.target.value)}
              className="pl-9 h-10 w-full sm:w-auto min-w-[150px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
            >
              <option value="">Grados</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            {(userRole === "admin" || userRole === "coordinator") && (
              <div className="grid grid-cols-2 md:flex gap-2 col-span-2 md:col-span-1">
                <Button
                  onClick={() => navigate("/dashboard/students/import")}
                  variant="outline"
                  className="w-full h-14 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 gap-2 rounded-lg font-semibold tracking-widest text-xs"
                >
                  <FileUp className="w-4 h-4" />
                  <span className="hidden lg:inline">Carga Masiva</span>
                  <span className="lg:hidden text-xs">CSV</span>
                </Button>
                <Button
                  onClick={() => navigate("/dashboard/students/new")}
                  className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden lg:inline">Matricular</span>
                  <span className="lg:hidden text-xs">Añadir</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista */}
      <main className="px-4 py-4 space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>No se encontraron estudiantes.</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className="group relative bg-white dark:bg-[#151b2d] rounded-[5px] p-4 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.99] transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-auto rounded-full bg-[#C6E7FC] flex items-center justify-center text-[#0099FE] font-semibold text-sm">
                    {student.last_name.charAt(0)}
                    {student.first_name.charAt(0)}
                  </div>
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/dashboard/students/${student.id}`)}
                  >
                    <div className="flex flex-col">
                      <h3 className="font-semibold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                        {student.last_name}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {student.first_name}
                      </p>
                    </div>
                    {student.neighborhood && (
                      <p className="text-[10px] text-primary font-semibold tracking-tight flex items-center gap-1 mt-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {student.neighborhood}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                      Acudiente: No registrado
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary tracking-wide">
                    {student.grades?.name || "Sin Asignar"}
                  </span>
                  {userRole !== "teacher" && (
                    <div
                      onClick={() => handleToggleState(student)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider cursor-pointer transition-colors ${
                        student.state !== false
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {student.state !== false ? "Activo" : "Inactivo"}
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-1">
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-[9px] font-semibold border border-green-100 dark:border-green-800" title="Asistencias">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {student.attendance_stats?.present || 0}
                    </div>
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-[9px] font-semibold border border-red-100 dark:border-red-800" title="Inasistencias">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {student.attendance_stats?.absent || 0}
                    </div>
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded text-[9px] font-semibold border border-amber-100 dark:border-amber-800" title="Tardanzas">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {student.attendance_stats?.late || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-nowrap items-center justify-end w-full gap-1 overflow-x-auto">
                <button
                  onClick={() => navigate(`/dashboard/students/${student.id}/observations`, { state: { student } })}
                  className="flex flex-1 min-w-0 items-center gap-2 px-2 py-2 rounded-[5px] text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-all border border-primary/20"
                >
                  <FileSignature className="w-4 h-4" />
                  Anotación
                </button>
                {userRole !== "teacher" && (
                  <>
                    <button
                      onClick={() => navigate(`/dashboard/students/${student.id}/edit`)}
                      className="flex flex-1 min-w-0 items-center gap-2 px-2 py-2 rounded-[5px] text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="flex flex-1 min-w-0 items-center gap-2 px-2 py-2 rounded-[5px] text-xs font-semibold text-red-500 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </main>

    </div>
  );
}
