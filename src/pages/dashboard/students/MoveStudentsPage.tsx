import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase/config";
import { writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { useUserProfile } from "@/lib/context/UserProfileContext";
import { useStudents, useGrades } from "@/lib/hooks/useFirebaseData";
import { EduButton } from "@/components/ui/EduButton";
import { EduInput } from "@/components/ui/EduInput";
import { EduSelect } from "@/components/ui/EduSelect";
import { FormView } from "@/components/ui/FormView";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { Search, ArrowRightLeft, Users, CheckSquare, Square } from "lucide-react";

type Grade = {
  id: string;
  name: string;
  state?: boolean;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_id: string;
  state?: boolean;
  avatar_url?: string;
};

export default function MoveStudentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { profile, loading: loadingProfile } = useUserProfile();
  const { data: studentsData, isLoading: loadingStudents } = useStudents();
  const { data: gradesData, isLoading: loadingGrades } = useGrades();

  const [sourceGradeId, setSourceGradeId] = useState("");
  const [targetGradeId, setTargetGradeId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Redirigir si no tiene permisos
  useEffect(() => {
    if (!loadingProfile && profile) {
      const role = profile.role?.toLowerCase() || "";
      if (role !== "admin" && role !== "coordinator") {
        toast.error("Acceso denegado. No tienes permisos para trasladar estudiantes.");
        navigate("/dashboard", { replace: true });
      }
    }
  }, [profile, loadingProfile, navigate]);

  // Lista de grados activos ordenados
  const activeGrades = useMemo(() => {
    if (!gradesData) return [];
    return [...gradesData]
      .filter((g: Grade) => g.state !== false)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [gradesData]);

  // Grados disponibles como destino (todos los activos excepto el de origen)
  const targetGrades = useMemo(() => {
    return activeGrades.filter((g) => g.id !== sourceGradeId);
  }, [activeGrades, sourceGradeId]);

  // Estudiantes del grupo de origen
  const studentsInSource = useMemo(() => {
    if (!studentsData || !sourceGradeId) return [];
    return [...studentsData]
      .filter((s: Student) => s.grade_id === sourceGradeId)
      .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || "", "es"));
  }, [studentsData, sourceGradeId]);

  // Estudiantes filtrados por búsqueda
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return studentsInSource;
    const term = searchTerm.toLowerCase();
    return studentsInSource.filter((s) =>
      `${s.last_name} ${s.first_name}`.toLowerCase().includes(term)
    );
  }, [studentsInSource, searchTerm]);

  // Limpiar selección de alumnos si cambia el grado de origen
  useEffect(() => {
    setSelectedStudentIds(new Set());
    setSearchTerm("");
  }, [sourceGradeId]);

  const isAllSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every((s) => selectedStudentIds.has(s.id));
  }, [filteredStudents, selectedStudentIds]);

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (isAllSelected) {
        filteredStudents.forEach((s) => next.delete(s.id));
      } else {
        filteredStudents.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const handleConfirmMove = async () => {
    if (selectedStudentIds.size === 0) {
      toast.error("Selecciona al menos un estudiante.");
      return;
    }
    if (!targetGradeId) {
      toast.error("Selecciona el grupo de destino.");
      return;
    }

    const sourceGradeName = activeGrades.find(g => g.id === sourceGradeId)?.name || "Grupo de origen";
    const targetGradeName = activeGrades.find(g => g.id === targetGradeId)?.name || "Grupo de destino";

    const confirmMsg = `¿Estás seguro de trasladar ${selectedStudentIds.size} estudiante(s) de "${sourceGradeName}" a "${targetGradeName}"?`;
    if (!confirm(confirmMsg)) return;

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const studentIds = Array.from(selectedStudentIds);

      studentIds.forEach((id) => {
        const studentRef = doc(db, "students", id);
        batch.update(studentRef, {
          grade_id: targetGradeId,
          updated_at: serverTimestamp(),
        });
      });

      await batch.commit();

      // Sincronizar el caché local de React Query
      queryClient.setQueryData(["students"], (old: any) => {
        if (!old) return old;
        return old.map((s: any) =>
          selectedStudentIds.has(s.id) ? { ...s, grade_id: targetGradeId } : s
        );
      });

      toast.success(
        `${selectedStudentIds.size} estudiante(s) trasladado(s) a "${targetGradeName}" correctamente.`
      );

      // Resetear estados
      setSelectedStudentIds(new Set());
      setSourceGradeId("");
      setTargetGradeId("");
      setSearchTerm("");
    } catch (error: any) {
      toast.error("Error al trasladar estudiantes", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const loading = loadingProfile || loadingStudents || loadingGrades;
  if (loading) return <LoadingSpinner message="Cargando datos de traslado..." />;

  const sourceGradeName = activeGrades.find((g) => g.id === sourceGradeId)?.name || "";
  const targetGradeName = activeGrades.find((g) => g.id === targetGradeId)?.name || "";

  return (
    <FormView>
      <div className="space-y-6">
        {/* Panel de Configuración de Grupos */}
        <div className="bg-white dark:bg-[#151b2d] rounded-lg p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Configurar traslado
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Grupo de Origen
              </label>
              <EduSelect
                value={sourceGradeId}
                onChange={(e) => setSourceGradeId(e.target.value)}
                disabled={isSaving}
              >
                <option value="">Selecciona el grupo de origen</option>
                {activeGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </EduSelect>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Grupo de Destino
              </label>
              <EduSelect
                value={targetGradeId}
                onChange={(e) => setTargetGradeId(e.target.value)}
                disabled={!sourceGradeId || isSaving}
              >
                <option value="">Selecciona el grupo de destino</option>
                {targetGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </EduSelect>
            </div>
          </div>
        </div>

        {/* Panel de Estudiantes */}
        {sourceGradeId && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#151b2d] p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex-grow">
                <EduInput
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar estudiante por nombre o apellido..."
                  icon={Search}
                  className="h-10"
                  disabled={isSaving}
                />
              </div>

              {filteredStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-4 h-10 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors w-full sm:w-auto shrink-0"
                >
                  {isAllSelected ? (
                    <>
                      <CheckSquare className="w-4 h-4 text-primary" />
                      Deseleccionar Todos
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 text-slate-400" />
                      Seleccionar Todos
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Listado de Estudiantes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStudents.length === 0 ? (
                <div className="col-span-full text-center py-10 bg-white dark:bg-[#151b2d] rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 shadow-sm">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium">No se encontraron estudiantes para trasladar.</p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isChecked = selectedStudentIds.has(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => !isSaving && handleToggleStudent(student.id)}
                      className={`relative flex items-center justify-between p-4 rounded-lg border transition-all duration-200 cursor-pointer select-none ${
                        isChecked
                          ? "bg-primary/5 dark:bg-[#0099FE]/10 border-primary dark:border-[#0099FE] shadow-sm shadow-primary/5"
                          : "bg-white dark:bg-[#151b2d] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox Visual */}
                        <div className="shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="h-10 w-10 rounded-full bg-[#C6E7FC] flex items-center justify-center text-[#0099FE] font-semibold text-sm shrink-0">
                          {student.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt=""
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            `${(student.last_name || " ").charAt(0)}${(student.first_name || " ").charAt(0)}`.toUpperCase()
                          )}
                        </div>

                        {/* Datos del estudiante */}
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-900 dark:text-white leading-tight truncate uppercase tracking-tight text-xs">
                            {student.last_name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {student.first_name}
                          </p>
                        </div>
                      </div>

                      {student.state === false && (
                        <span className="shrink-0 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                          Inactivo
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Panel de Resumen y Confirmación */}
        {sourceGradeId && targetGradeId && selectedStudentIds.size > 0 && (
          <div className="bg-primary/5 dark:bg-[#0099FE]/10 rounded-lg p-5 border border-primary/20 dark:border-[#0099FE]/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                Resumen del Traslado
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Se trasladarán <span className="font-bold text-primary">{selectedStudentIds.size}</span> estudiante(s) desde el grupo <span className="font-semibold text-slate-700 dark:text-slate-300">{sourceGradeName}</span> hacia el grupo <span className="font-semibold text-slate-700 dark:text-slate-300">{targetGradeName}</span>.
              </p>
            </div>

            <EduButton
              onClick={handleConfirmMove}
              disabled={isSaving}
              loading={isSaving}
              icon={ArrowRightLeft}
              className="w-full md:w-auto"
            >
              Confirmar traslado
            </EduButton>
          </div>
        )}

        {/* Sin origen seleccionado */}
        {!sourceGradeId && (
          <div className="text-center py-12 bg-white dark:bg-[#151b2d] rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 shadow-sm">
            <ArrowRightLeft className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-medium text-slate-700 dark:text-slate-300">Traslado de Estudiantes</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Selecciona un grupo de origen para ver a sus alumnos e iniciar el proceso de migración de grupo.
            </p>
          </div>
        )}
      </div>
    </FormView>
  );
}
