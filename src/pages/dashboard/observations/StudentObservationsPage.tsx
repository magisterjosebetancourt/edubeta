import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useStudents, useGrades } from '@/lib/hooks/useFirebaseData';
import { useObservationsList } from '@/lib/hooks/useObservador';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Filter, User, Loader2 } from 'lucide-react';

export default function StudentObservationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const studentDataFromState = location.state?.student;
  
  const { data: students = [], isLoading: loadingStudents } = useStudents();
  const { data: grades = [], isLoading: loadingGrades } = useGrades();
  const { data: observations = [], isLoading: loadingObs } = useObservationsList(id!);

  const [filterType, setFilterType] = useState<string>('all');

  const student = studentDataFromState || students.find((s: any) => s.id === id);
  const gradeName = studentDataFromState?.grades?.name || grades.find((g: any) => g.id === student?.grade_id)?.name;

  const filteredObservations = filterType === 'all' 
    ? observations 
    : observations.filter(obs => obs.type === filterType);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Reconocimiento Positivo': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Disciplinaria': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Academica': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  // Se muestra un loader a pantalla completa SOLO si no hay datos del State router ni de la BD en caché
  if (!studentDataFromState && (loadingStudents || loadingGrades)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="font-medium text-sm">Cargando perfil...</span>
      </div>
    );
  }

  if (!student) {
    return <div className="p-8 text-center text-red-500 font-semibold">Estudiante no encontrado.</div>;
  }

  return (
    <div className="bg-slate-50 dark:bg-[#0f121b] min-h-screen pb-24 font-sans">
      
      {/* HEADER BANNER */}
      <div className="bg-primary pt-12 pb-6 px-4 sm:px-6 rounded-b-3xl shadow-lg relative">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-bold shadow-inner shrink-0 leading-none">
            {student.last_name?.charAt(0)}{student.first_name?.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate leading-tight">
              {student.first_name} {student.last_name}
            </h1>
            <p className="text-primary-foreground/80 text-sm font-medium mt-0.5">
              {gradeName || 'Grado no asignado'} • ID: {student.id}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex bg-white/20 px-2 py-0.5 rounded text-xs text-white font-semibold backdrop-blur-sm">
                Anotaciones: {observations.length}
              </span>
              {(student.attendance_stats?.absent || 0) > 0 && (
                <span className="inline-flex bg-red-500/80 px-2 py-0.5 rounded text-xs text-white font-semibold backdrop-blur-sm">
                  Ausencias: {student.attendance_stats?.absent}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Observaciones</h2>
          
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select 
              className="pl-9 h-10 w-full sm:w-auto min-w-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none font-medium shadow-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="Academica">Académicas</option>
              <option value="Disciplinaria">Disciplinarias</option>
              <option value="Formativa">Formativas</option>
              <option value="Reconocimiento Positivo">Reconocimientos</option>
            </select>
          </div>
        </div>

        {/* CARDS LIST */}
        <div className="space-y-4">
          {loadingObs ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="font-medium text-sm">Cargando anotaciones...</span>
            </div>
          ) : filteredObservations.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center border shadow-sm">
              <p className="text-slate-500 text-sm font-medium">No se encontraron anotaciones de este tipo.</p>
            </div>
          ) : (
            filteredObservations.map((obs) => (
              <div key={obs.id} className="bg-white dark:bg-[#151b2d] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider ${getTypeColor(obs.type)}`}>
                    {obs.type}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {obs.createdAt ? format(new Date(obs.createdAt), "dd MMM yyyy, h:mm a", { locale: es }) : 'Sin fecha'}
                  </span>
                </div>
                
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {obs.law1620Category && obs.law1620Category !== 'No Aplica' ? `Reporte ${obs.law1620Category}` : `Anotación ${obs.type}`}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                    {obs.description}
                  </p>
                </div>

                <div className="mt-2 pt-3 border-t border-slate-50 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <User className="w-3 h-3 text-slate-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      Docente: {obs.creatorName || 'Desconocido'}
                    </span>
                  </div>
                  
                  {obs.status && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      ESTADO: {obs.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ACCIONES AL FINAL DE LA VISTA */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => navigate('/dashboard/observations/new', { 
              state: { prefill_student_id: student.id, prefill_grade_id: student.grade_id } 
            })}
            className="flex-1 px-4 py-3.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Crear Nueva Anotación
          </button>

          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-3.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
