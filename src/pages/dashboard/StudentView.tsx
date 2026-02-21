import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  User, 
  CalendarDays, 
  CheckCircle, 
  XCircle, 
  Clock, 
  History,
  TrendingUp,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Student = {
  id: number;
  first_name: string;
  last_name: string;
  grade_id: number;
  grades: { name: string };
  neighborhood?: string;
  attendance_stats?: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    rate: number;
  };
};

type AttendanceRecord = {
  id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  justified: boolean;
  subjects: { name: string };
};

export default function StudentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (id) {
      fetchStudentData();
    }
  }, [id]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      if (!id) return;

      // 1. Fetch student info
      const { data: studentData, error: sError } = await supabase
        .from("students")
        .select(`*, grades (name)`)
        .eq("id", id)
        .single();

      if (sError) throw sError;

      // 2. Fetch attendance records
      const { data: attData, error: aError } = await supabase
        .from("attendance_records")
        .select(`*, subjects (name)`)
        .eq("student_id", id)
        .order("date", { ascending: false });

      if (aError) throw aError;

      const records = (attData as any[]) || [];
      const stats = {
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        excused: records.filter(r => r.status === 'excused').length,
        total: records.length,
        rate: records.length > 0 ? Math.round((records.filter(r => r.status === 'present').length / records.length) * 100) : 0
      };

      if (studentData) {
        setStudent({ ...(studentData as any), attendance_stats: stats } as Student);
        setAttendance(records);
      }
    } catch (error: any) {
      toast.error("Error al cargar datos", { description: error.message });
      navigate("/dashboard/students");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando perfil del estudiante...</div>;
  }

  if (!student) return null;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#151b2d]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase">
              {student.first_name?.toLowerCase()}, {student.last_name?.toLowerCase()}
            </h1>
            <p className="text-xs text-slate-500 font-medium">Perfil del Estudiante</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Profile Card */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 border-none shadow-sm dark:bg-[#151b2d]">
            <CardHeader className="flex flex-col items-center border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 border-4 border-white dark:border-slate-800 shadow-lg">
                <User className="w-12 h-12" />
              </div>
              <CardTitle className="text-center uppercase">{student.first_name}, {student.last_name}</CardTitle>
              {student.neighborhood && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {student.neighborhood}
                </div>
              )}
              <CardDescription className="text-center font-bold text-primary uppercase text-[10px] tracking-widest mt-2">
                Grado: {student.grades?.name || 'No asignado'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Estado Académico</span>
                  <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Activo</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">ID Estudiante</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">#{student.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Bar */}
          <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Asistencias</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{student.attendance_stats?.present}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Inasistencias</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{student.attendance_stats?.absent}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Tardanzas</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{student.attendance_stats?.late}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Tasa Asistencia</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{student.attendance_stats?.rate}%</h3>
            </div>
          </div>
        </section>

        {/* History Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Historial de Asistencia
            </h2>
          </div>
          
          <div className="bg-white dark:bg-[#151b2d] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {attendance.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-medium">No hay registros de asistencia para este estudiante.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Asignatura</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Estado</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Justificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {format(new Date(record.date + 'T00:00:00'), 'PPP', { locale: es })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{record.subjects?.name || 'Materia no registrada'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                            record.status === 'present' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                            record.status === 'absent' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                            record.status === 'late' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                            record.status === 'excused' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                          )}>
                            {record.status === 'present' ? 'Presente' : record.status === 'absent' ? 'Ausente' : record.status === 'late' ? 'Tarde' : 'Excusa'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {record.justified ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
