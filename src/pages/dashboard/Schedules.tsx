import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/lib/context/UserProfileContext";
import { useSchedules } from "@/lib/hooks/useFirebaseData";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EduButton } from "@/components/ui/EduButton";
import { EduSelect } from "@/components/ui/EduSelect";
import { CalendarDays, Plus, Clock, Users, BookOpen, AlertCircle, Edit, Trash2, CalendarCheck } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function SchedulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();
  const userRole = profile?.role || "user";
  const { data: schedulesData, isLoading: loadingSchedules } = useSchedules();

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Fetch teachers only for admin/coordinator
  useMemo(() => {
    if (userRole === "admin" || userRole === "coordinator") {
      setLoadingTeachers(true);
      getDocs(query(collection(db, "profiles"), where("role", "==", "teacher")))
        .then((snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name, "es"));
          setTeachers(list);
        })
        .finally(() => setLoadingTeachers(false));
    }
  }, [userRole]);

  // Determine active teacher ID based on role
  const activeTeacherId = userRole === "teacher" ? profile?.uid : selectedTeacherId;

  const teacherSchedules = useMemo(() => {
    if (!schedulesData || !activeTeacherId) return [];
    return schedulesData.filter((s: any) => s.teacher_id === activeTeacherId);
  }, [schedulesData, activeTeacherId]);

  const todayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday...
  const DAYS_MAP: Record<number, string> = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes" };
  const todayName = DAYS_MAP[todayIndex];

  const todaysClasses = useMemo(() => {
    if (!todayName) return [];
    const classes = teacherSchedules.filter((s: any) => s.day === todayName);
    return classes.sort((a: any, b: any) => Number(a.time_item) - Number(b.time_item));
  }, [teacherSchedules, todayName]);

  const weeklyClassesByDay = useMemo(() => {
    const map: Record<string, any[]> = { "Lunes": [], "Martes": [], "Miércoles": [], "Jueves": [], "Viernes": [] };
    teacherSchedules.forEach((s: any) => {
      if (map[s.day]) map[s.day].push(s);
    });
    Object.keys(map).forEach(day => {
      map[day].sort((a: any, b: any) => Number(a.time_item) - Number(b.time_item));
    });
    return map;
  }, [teacherSchedules]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta hora de clase?")) return;
    try {
      await deleteDoc(doc(db, "schedules", id));
      queryClient.setQueryData(['schedules'], (old: any) => old ? old.filter((s: any) => s.id !== id) : []);
      toast.success("Hora eliminada correctamente");
    } catch (error: any) {
      toast.error("Error al eliminar", { description: error.message });
    }
  };

  if (loadingSchedules || loadingTeachers) {
    return <LoadingSpinner message="Cargando horario..." />;
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24 transition-colors duration-300">
      <div className="p-4 lg:p-8 space-y-6">
        
        {/* Header / Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" />
              Horario de Clases
            </h1>
            <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
              Visualiza y gestiona el horario académico.
            </p>
          </div>

          {(userRole === "admin" || userRole === "coordinator") && (
            <div className="w-full sm:w-64">
              <EduSelect
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full sm:w-auto h-12"
              >
                <option value="">Selecciona un docente...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </EduSelect>
            </div>
          )}

          {activeTeacherId && (
            <EduButton
              onClick={() => navigate(`/dashboard/schedules/new${userRole !== 'teacher' ? `?teacher_id=${activeTeacherId}` : ''}`)}
              icon={Plus}
              className="h-12 px-6 w-full sm:w-auto"
            >
              Nueva hora de clase
            </EduButton>
          )}
        </div>

        {!activeTeacherId ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-slate-900/30">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Selecciona un docente para ver su horario.</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Today's Classes Card */}
            <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader className="pl-6 pb-2">
                <CardTitle className="text-primary flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4" />
                  Clases de Hoy {todayName ? `(${todayName})` : "(Fin de semana)"}
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">
                  Resumen de tu jornada actual.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-6 pt-2">
                {!todayName || todaysClasses.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-[#151b2d] p-3 rounded-md border border-slate-100 dark:border-slate-800">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    No hay clases programadas para hoy.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {todaysClasses.map((cls: any) => (
                      <div key={cls.id} className="bg-white dark:bg-[#151b2d] p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black tracking-widest text-slate-400">HORA {cls.time_item}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                            {cls.weight === 2 ? 'BLOQUE' : '1 HORA'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-sm">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                            {cls.subject_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {cls.group_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button onClick={() => navigate(`/dashboard/attendance/new?grade_id=${cls.group_id}&subject_id=${cls.subject_id}`)}
                            title="Tomar Asistencia"
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-all">
                            <CalendarCheck className="w-4 h-4" />
                          </button>
                          <button onClick={() => navigate(`/dashboard/schedules/${cls.id}/edit`)}
                            title="Editar"
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(cls.id)}
                            title="Eliminar"
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all ml-auto">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Schedule */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 px-1">Horario Semanal</h3>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {Object.keys(weeklyClassesByDay).map(day => (
                  <div key={day} className="flex flex-col gap-3">
                    <div className="bg-slate-100 dark:bg-slate-800/80 py-2 text-center rounded-lg border border-slate-200 dark:border-slate-700/50">
                      <span className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">{day}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {weeklyClassesByDay[day].length === 0 ? (
                        <div className="text-center py-4 text-[10px] font-medium text-slate-400 bg-white/50 dark:bg-[#151b2d]/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                          Sin clases
                        </div>
                      ) : (
                        weeklyClassesByDay[day].map((cls: any) => (
                          <div key={cls.id} className="bg-white dark:bg-[#151b2d] p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-colors group relative">
                             <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-primary/50 group-hover:bg-primary transition-colors rounded-l-lg" />
                             <div className="pl-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">Hora {cls.time_item}</span>
                                  {cls.weight === 2 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Bloque (2 horas)" />
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={cls.subject_name}>{cls.subject_name}</p>
                                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">{cls.group_name}</p>
                                <div className="flex items-center gap-0.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                  <button onClick={() => navigate(`/dashboard/attendance/new?grade_id=${cls.group_id}&subject_id=${cls.subject_id}`)}
                                    title="Tomar Asistencia"
                                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-all">
                                    <CalendarCheck className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => navigate(`/dashboard/schedules/${cls.id}/edit`)}
                                    title="Editar"
                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-all">
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete(cls.id)}
                                    title="Eliminar"
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all ml-auto">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
