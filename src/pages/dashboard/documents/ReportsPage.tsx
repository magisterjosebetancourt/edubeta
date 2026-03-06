import { useState, useEffect } from 'react';
import { useGrades, useStudents } from '@/lib/hooks/useFirebaseData';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { FormView } from '@/components/ui/FormView';
import { 
  FileSearch, 
  Calendar, 
  Printer, 
  ChevronRight,
  ClipboardList,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'attendance_group' | 'academic_summary' | 'observador';

export default function ReportsPage() {
  const [exiting, setExiting] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>('attendance_group');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [institution, setInstitution] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const { data: gradesData = [] } = useGrades();
  const { data: studentsData = [] } = useStudents();

  if (gradesData.length === 0 && studentsData.length === 0) {
    return <LoadingSpinner message="Preparando generador de informes..." />;
  }

  useEffect(() => {
    const fetchInstitution = async () => {
      const snap = await getDoc(doc(db, 'settings', 'institutional'));
      if (snap.exists()) setInstitution(snap.data());
    };
    fetchInstitution();
  }, []);

  const handleGenerate = async () => {
    if (exportFormat === 'excel') {
      toast.info('Exportación a Excel estará disponible próximamente');
      return;
    }
    await generateAttendanceReport();
  };

  const generateAttendanceReport = async () => {
    if (!selectedGroupId) {
      toast.error('Selecciona un grupo');
      return;
    }

    setGenerating(true);
    const toastId = toast.loading('Generando reporte...');

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Header Helper (Sincronizado)
      const drawHeader = (pdf: jsPDF, title: string) => {
          if (institution?.logo_url) {
            try { pdf.addImage(institution.logo_url, 'PNG', margin, margin, 20, 20); } catch (e) {}
          }
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.text((institution?.school_name || 'INSTITUCIÓN EDUCATIVA').toUpperCase(), pageWidth / 2, margin + 5, { align: 'center' });
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'italic');
          if (institution?.slogan) pdf.text(institution.slogan.toUpperCase(), pageWidth / 2, margin + 10, { align: 'center' });
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(title.toUpperCase(), pageWidth / 2, margin + 16, { align: 'center' });
          pdf.setDrawColor(200);
          pdf.line(margin, margin + 25, pageWidth - margin, margin + 25);
          
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          const groupName = gradesData.find(g => g.id === selectedGroupId)?.name || '';
          pdf.text(`GRUPO: ${groupName}`, margin, margin + 32);
          pdf.text(`AÑO: ${institution?.academic_year || new Date().getFullYear()}`, pageWidth / 2, margin + 32, { align: 'center' });
          if (startDate && endDate) {
            pdf.text(`${startDate.split('-').reverse().join('/')} - ${endDate.split('-').reverse().join('/')}`, pageWidth - margin, margin + 32, { align: 'right' });
          }
      };

      const groupName = gradesData.find(g => g.id === selectedGroupId)?.name || '';
      
      // Query attendance
      let q = query(collection(db, "attendance_records"));
      if (startDate && endDate) {
        q = query(q, where("date", ">=", startDate), where("date", "<=", endDate));
      }
      const snap = await getDocs(q);
      let records = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const groupStudents = studentsData.filter(s => s.grade_id === selectedGroupId).map(s => s.id);
      records = records.filter(r => groupStudents.includes(r.student_id));

      drawHeader(doc, `REPORTE DE ASISTENCIA - GRUPO ${groupName}`);
      
      const studentStats = studentsData
        .filter(s => s.grade_id === selectedGroupId && s.state !== false)
        .map(s => {
          const studentRecords = records.filter(r => r.student_id === s.id);
          return [
            `${s.last_name || ''} ${s.first_name || ''}`.toUpperCase(),
            studentRecords.filter(r => r.status === 'present').length,
            studentRecords.filter(r => r.status === 'absent').length,
            studentRecords.filter(r => r.status === 'late').length,
            studentRecords.filter(r => r.status === 'absent' && r.justified).length
          ];
        })
        .sort((a, b) => (a[0] as string).localeCompare(b[0] as string));

      autoTable(doc, {
        startY: margin + 35,
        head: [['ESTUDIANTE', 'PRES.', 'AUS.', 'TARD.', 'JUST.']],
        body: studentStats,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 1, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
      });

      const footerY = pageHeight - 10;
      doc.setFontSize(7);
      doc.text('Diseño: Edubeta | Empresa: Betasoft (c)', margin, footerY);
      doc.text(`Fecha de impresión: ${new Date().toLocaleString()}`, pageWidth - margin, footerY, { align: 'right' });

      doc.save(`Reporte_Asistencia_${groupName}.pdf`);
      toast.dismiss(toastId);
      toast.success('Reporte generado correctamente');
    } catch (error) {
       console.error(error);
       toast.dismiss(toastId);
       toast.error('Error generando reporte');
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    { id: 'attendance_group', label: 'Asistencia', icon: Calendar },
    { id: 'academic_summary', label: 'AcadÃ©mico', icon: ClipboardList },
    { id: 'observador', label: 'Observador', icon: FileSearch },
  ];

  const fieldClass = "w-full bg-slate-100 dark:bg-[#1e2536] border dark:border-slate-800 rounded-lg py-3 px-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 appearance-none transition-all placeholder:text-slate-500";

  const handleCancel = () => {
    setExiting(true);
    setTimeout(() => {
        // Redirigir al dashboard o donde corresponda
        window.history.back();
    }, 220);
  };

  return (
    <FormView exiting={exiting}>
      <div className="max-w-md mx-auto bg-white dark:bg-[#151b2d] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 p-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 font-sans mt-4 mb-24">
        
        {/* Tipo de Informe */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide ml-1">Tipo de informe</h3>
          <div className="grid grid-cols-3 gap-3">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id as ReportType)}
                className={cn(
                  "flex flex-col items-center justify-center py-5 px-2 rounded-2xl border transition-all duration-300 gap-2.5",
                  selectedType === type.id 
                    ? "bg-white border-primary text-primary shadow-lg shadow-primary/10 ring-[0.5px] ring-primary" 
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200"
                )}
              >
                <div className={cn("p-2 rounded-lg transition-colors", selectedType === type.id ? "bg-primary text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400")}>
                  <type.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold tracking-tight">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rango de Fechas */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide ml-1">Rango de fechas</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-400 ml-1 uppercase">Desde</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={fieldClass} 
                  placeholder="dd/mm/aaaa"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-400 ml-1 uppercase">Hasta</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={fieldClass} 
                  placeholder="dd/mm/aaaa"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide ml-1">Filtros</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-400 ml-1 uppercase">Grado</label>
              <div className="relative">
                <select 
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className={cn(fieldClass, "cursor-pointer pr-10")}
                >
                  <option value="">Seleccionar grado</option>
                  {gradesData.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-400 ml-1 uppercase">SecciÃ³n</label>
              <div className="relative">
                <select className={cn(fieldClass, "opacity-60 cursor-not-allowed pr-10")} disabled>
                  <option>Seleccionar secciÃ³n</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Formato de Exportación */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide ml-1">Formato de exportaciÃ³n</h3>
          <div className="bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl flex border border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setExportFormat('pdf')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2.5 py-3 rounded-lg transition-all duration-300 font-semibold text-[13px]",
                exportFormat === 'pdf' 
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none" 
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <span className="text-red-500">📄</span> PDF
            </button>
            <button
              onClick={() => setExportFormat('excel')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2.5 py-3 rounded-lg transition-all duration-300 font-semibold text-[13px]",
                exportFormat === 'excel' 
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none" 
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <span className="text-emerald-500">📗</span> Excel
            </button>
          </div>
        </div>

        {/* Botones de Acción - Orden Vertical Limpio y Sin Fondo de Contenedor */}
        <div className="flex flex-col gap-4 mt-10 pb-12 max-w-md mx-auto w-full">
            <button 
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-[5px] h-14 flex items-center justify-center gap-3 font-semibold text-[11px] tracking-widest shadow-lg shadow-primary/25 active:scale-[0.98] transition-all uppercase"
            >
                <Printer className="w-5 h-5 text-white" />
                {generating ? 'GENERANDO...' : 'GENERAR INFORME'}
            </button>
            
            <button 
                onClick={handleCancel}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-[5px] h-14 flex items-center justify-center gap-3 font-semibold text-[11px] tracking-widest shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase"
            >
                <X className="w-5 h-5 text-slate-400" />
                Cancelar
            </button>
        </div>

      </div>
    </FormView>
  );
}
