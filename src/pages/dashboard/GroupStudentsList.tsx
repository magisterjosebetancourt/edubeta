import { useState, useEffect, useMemo } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useParams } from "react-router-dom";
import { useStudents, useGrades } from "@/lib/hooks/useFirebaseData";
import { useUserProfile } from "@/lib/context/UserProfileContext";
import { toast } from "sonner";
import { Search, Users, MapPin } from "lucide-react";
import { EduInput } from "@/components/ui/EduInput";
import { EduSelect } from "@/components/ui/EduSelect";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_id: string; // Changed from optional to required
  neighborhood?: string;
  state: boolean; // Changed from optional to required
  guardian_name?: string;
  attendance_stats?: {
    present: number;
    absent: number;
    late: number;
  };
};

export default function GroupStudentsListPage() {
  const { gradeId } = useParams<{ gradeId: string }>();
  const { data: studentsData, isLoading: loadingStudents } = useStudents();
  const { data: gradesData, isLoading: loadingGrades } = useGrades();
  const { profile } = useUserProfile();
  const userRole = profile?.role || "user";

  const [students, setStudents] = useState<Student[]>([]);
  const [gradeName, setGradeName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<"apellido" | "nombre">("apellido");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        if (!gradeId) return;

        // Obtain grade name from Cache
        const currentGrade = (gradesData || []).find((g) => g.id === gradeId);
        if (currentGrade) setGradeName(currentGrade.name);
        else setGradeName("Grado Desconocido");

        // Filter students from cache
        const filtered = (studentsData || []).filter((s) => s.grade_id === gradeId);

        // Sort A→Z by last_name (keeping original sort logic from previous version)
        filtered.sort((a, b) =>
          (a.last_name || "").localeCompare(b.last_name || "", "es")
        );

        setStudents(filtered as Student[]);
      } catch (error: any) {
        toast.error("Error al cargar datos", { description: error.message });
      }
    };

    if (!loadingStudents && !loadingGrades) fetchStudents();
  }, [gradeId, studentsData, gradesData, loadingStudents, loadingGrades]);

  const loading = loadingStudents || loadingGrades;

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase();
    return students.filter((s) => {
      if (filterBy === "apellido")
        return s.last_name.toLowerCase().includes(term);
      return s.first_name.toLowerCase().includes(term);
    });
  }, [students, searchTerm, filterBy]);

  if (loading) return <LoadingSpinner message="Cargando estudiantes del grupo..." />;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-800 dark:text-slate-100 pb-24">
      {/* Header */}
      <div className="p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white leading-tight">
            {gradeName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {students.length}{" "}
            {students.length === 1 ? "estudiante" : "estudiantes"} matriculados
          </p>
        </div>

        <div className="flex gap-2">
          <EduInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              filterBy === "apellido"
                ? "Buscar por apellido..."
                : "Buscar por nombre..."
            }
            type="text"
            icon={Search}
            className="flex-grow"
          />
          <EduSelect
            value={filterBy}
            onChange={(e) =>
              setFilterBy(e.target.value as "apellido" | "nombre")
            }
            className="w-32"
          >
            <option value="apellido">Apellido</option>
            <option value="nombre">Nombre</option>
          </EduSelect>
        </div>
      </div>

      {/* Student list */}
      <main className="px-4 py-2 space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <p className="text-sm">No se encontraron estudiantes.</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-white dark:bg-[#151b2d] rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <div className="flex justify-between items-center">
                {/* Avatar + Info */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {student.last_name.charAt(0)}
                    {student.first_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white leading-tight">
                      {student.last_name}, {student.first_name}
                    </h3>
                    {student.neighborhood && (
                      <p className="text-[10px] text-primary font-semibold tracking-tight flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {student.neighborhood}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Acudiente:{" "}
                      {student.guardian_name || "No registrado"}
                    </p>
                  </div>
                </div>

                {/* Estado + Asistencia */}
                <div className="flex flex-col items-end gap-1.5">
                  {userRole !== "teacher" && (
                    <div
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${
                        student.state !== false
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {student.state !== false ? "Activo" : "Inactivo"}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-[9px] font-semibold border border-green-100 dark:border-green-800"
                      title="Asistencias"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {student.attendance_stats?.present ?? 0}
                    </div>
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-[9px] font-semibold border border-red-100 dark:border-red-800"
                      title="Inasistencias"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {student.attendance_stats?.absent ?? 0}
                    </div>
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded text-[9px] font-semibold border border-amber-100 dark:border-amber-800"
                      title="Tardanzas"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {student.attendance_stats?.late ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
