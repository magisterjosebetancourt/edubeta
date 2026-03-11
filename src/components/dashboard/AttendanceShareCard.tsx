import React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, Clock, XCircle, CheckCircle } from 'lucide-react'

interface AttendanceShareCardProps {
  session: {
    grade_name: string;
    subject_name: string;
    teacher_name: string;
    date: string;
    present_count: number;
    absent_count: number;
    late_count: number;
    total_students: number;
  };
  absentStudents: Array<{
    name: string;
    status: 'absent' | 'late';
    justified: boolean;
  }>;
  schoolBranding?: {
    name: string;
    logo?: string;
  };
}

export const AttendanceShareCard: React.FC<AttendanceShareCardProps> = ({ 
  session, 
  absentStudents,
  schoolBranding 
}) => {
  const dateFormatted = format(new Date(session.date + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: es })
  
  return (
    <div id="attendance-share-card" className="w-[500px] bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="flex items-center gap-3">
          {schoolBranding?.logo ? (
            <img src={schoolBranding.logo} alt="School Logo" className="w-12 h-12 object-contain" />
          ) : (
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
              {schoolBranding?.name?.[0] || 'E'}
            </div>
          )}
          <div>
            <h1 className="text-lg font-black text-slate-800 leading-tight uppercase tracking-tight">
              {schoolBranding?.name || 'EDUBETA'}
            </h1>
            <p className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">
              Informe de Asistencia
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dateFormatted}</div>
          <div className="text-xs font-bold text-slate-600 mt-1">{session.grade_name}</div>
        </div>
      </div>

      {/* Main Info Box */}
      <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">{session.subject_name}</h2>
            <p className="text-xs text-slate-500 font-medium">Docente: {session.teacher_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 flex flex-col items-center justify-center">
            <CheckCircle className="w-4 h-4 text-green-500 mb-1" />
            <span className="text-lg font-black text-green-700 leading-none">{session.present_count}</span>
            <span className="text-[8px] font-bold text-green-600 uppercase tracking-tighter mt-1">Presentes</span>
          </div>
          <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex flex-col items-center justify-center">
            <XCircle className="w-4 h-4 text-red-500 mb-1" />
            <span className="text-lg font-black text-red-700 leading-none">{session.absent_count}</span>
            <span className="text-[8px] font-bold text-red-600 uppercase tracking-tighter mt-1">Ausentes</span>
          </div>
          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex flex-col items-center justify-center">
            <Clock className="w-4 h-4 text-amber-500 mb-1" />
            <span className="text-lg font-black text-amber-700 leading-none">{session.late_count}</span>
            <span className="text-[8px] font-bold text-amber-600 uppercase tracking-tighter mt-1">Tardes</span>
          </div>
        </div>
      </div>

      {/* Absent List */}
      <div className="relative z-10">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">
          Lista de Inasistencias
        </h3>
        <div className="space-y-2">
          {absentStudents.length > 0 ? (
            absentStudents.map((student, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${student.status === 'absent' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <span className="text-sm font-bold text-slate-700 truncate max-w-[280px]">
                    {student.name.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                    student.status === 'absent' 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-amber-100 text-amber-600'
                  }`}>
                    {student.status === 'absent' ? 'Ausente' : 'Tarde'}
                  </span>
                  {student.justified && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-md text-[8px] font-black uppercase">
                      Justificada
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle className="w-8 h-8 text-green-500/20 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sin inasistencias hoy</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white font-black text-[10px]">E</div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">EduBeta Digital</span>
        </div>
        <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest text-right">
          Reporte generado automáticamente
        </div>
      </div>
    </div>
  )
}
