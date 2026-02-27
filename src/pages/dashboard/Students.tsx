import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Edit, MapPin, UserPlus, FileUp } from "lucide-react";

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

  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("user");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGradeId, setFilterGradeId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const role = profileSnap.data()?.role || "user";
      setUserRole(role);

      let gradeIds: string[] = [];
      if (role === "teacher") {
        const assSnap = await getDocs(
          query(collection(db, "assignments"), where("teacher_id", "==", user.uid))
        );
        gradeIds = assSnap.docs.map((d) => d.data().grade_id);
        if (gradeIds.length === 0) {
          setStudents([]);
          setGrades([]);
          setLoading(false);
          return;
        }
      }

      const [studentsSnap, allGradesSnap, attendanceSnap] = await Promise.all([
        getDocs(query(collection(db, "students"), orderBy("first_name"))),
        getDocs(query(collection(db, "grades"), where("state", "==", true))),
        getDocs(collection(db, "attendance_records")),
      ]);

      const gradeMap = new Map(allGradesSnap.docs.map((d) => [d.id, d.data().name]));
      const attendanceData = attendanceSnap.docs.map((d) => d.data());

      let studentDocs = studentsSnap.docs;
      if (role === "teacher") {
        studentDocs = studentDocs.filter((d) => gradeIds.includes(d.data().grade_id));
      }

      const transformed = studentDocs.map((docSnap) => {
        const data = docSnap.data();
        const att = attendanceData.filter((a) => a.student_id === docSnap.id);
        return {
          id: docSnap.id,
          ...data,
          grades: { name: gradeMap.get(data.grade_id) || "Sin Grado" },
          attendance_stats: {
            present: att.filter((a) => a.status === "present").length,
            absent: att.filter((a) => a.status === "absent").length,
            late: att.filter((a) => a.status === "late").length,
            excused: att.filter((a) => a.status === "excused").length,
          },
        } as Student;
      });

      transformed.sort((a, b) =>
        (a.last_name || "").localeCompare(b.last_name || "", "es")
      );

      setStudents(transformed);
      setGrades(
        allGradesSnap.docs
          .filter((d) => role !== "teacher" || gradeIds.includes(d.id))
          .map((d) => ({ id: d.id, name: d.data().name }))
      );
    } catch (error: any) {
      toast.error("Error al cargar datos", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleState = async (student: Student) => {
    try {
      const newState = !student.state;
      await updateDoc(doc(db, "students", student.id), { state: newState });
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
      toast.success("Estudiante eliminado");
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

  if (loading) return <div className="p-8 text-center">Cargando estudiantes...</div>;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-800 dark:text-slate-100 pb-24">
      <div className="p-4 space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Listado de alumnos matriculados.
        </p>

        {/* Barra de búsqueda y acciones */}
        <div className="grid grid-cols-1 gap-3 md:flex md:items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-[#1e2536] border rounded-lg py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
              placeholder="Buscar por apellido o nombre..."
              type="text"
            />
          </div>

          <div className="w-full grid grid-cols-2 md:flex gap-2">
            <select
              value={filterGradeId}
              onChange={(e) => setFilterGradeId(e.target.value)}
              className="col-span-2 w-full bg-slate-100 dark:bg-[#1e2536] border dark:border-slate-800 rounded-lg py-3 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none appearance-none"
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
                  className="rounded-lg h-auto py-3 gap-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e2536] text-slate-700 dark:text-slate-200"
                >
                  <FileUp className="w-4 h-4" />
                  <span className="hidden lg:inline">Carga Masiva</span>
                  <span className="lg:hidden">CSV</span>
                </Button>
                <Button
                  onClick={() => navigate("/dashboard/students/new")}
                  className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3 gap-2 shadow-lg shadow-primary/20"
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
              className="group relative bg-white dark:bg-[#151b2d] rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.99] transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                    {student.last_name.charAt(0)}
                    {student.first_name.charAt(0)}
                  </div>
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/dashboard/students/${student.id}`)}
                  >
                    <h3 className="font-semibold text-slate-900 dark:text-white leading-tight hover:text-primary transition-colors">
                      {student.last_name}, {student.first_name}
                    </h3>
                    {student.neighborhood && (
                      <p className="text-[10px] text-primary font-semibold tracking-tight flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {student.neighborhood}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Acudiente: No registrado
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary tracking-wide">
                    {student.grades?.name || "Sin Asignar"}
                  </span>
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
              {userRole !== "teacher" && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-end gap-2">
                  <button
                    onClick={() => navigate(`/dashboard/students/${student.id}/edit`)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </main>

    </div>
  );
}
