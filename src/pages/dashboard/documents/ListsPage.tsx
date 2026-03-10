import { useState, useEffect } from 'react';
import { useUserProfile } from '@/lib/context/UserProfileContext';
import { useGrades, useStudents, useTeachers, usePeriods, useAssignments } from '@/lib/hooks/useFirebaseData';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { FormView } from '@/components/ui/FormView';
import { Label } from '@/components/ui/label';
import { Users, FileText, Printer, Layers, CheckSquare, Square, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EduButton } from '@/components/ui/EduButton';
import { EduSelect } from '@/components/ui/EduSelect';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LEVELS = [
  { id: 'preescolar', name: 'Preescolar', grades: ['Transición'] },
  { id: 'primaria', name: 'Básica Primaria', grades: ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'] },
  { id: 'secundaria', name: 'Básica Secundaria', grades: ['Sexto', 'Séptimo', 'Octavo', 'Noveno'] },
  { id: 'media', name: 'Educación Media', grades: ['Décimo', 'Once'] },
];

const GRADE_MAP: Record<string, string> = {
  Primero: '1', Segundo: '2', Tercero: '3', Cuarto: '4', Quinto: '5',
  Sexto: '6', Séptimo: '7', Octavo: '8', Noveno: '9', Décimo: '10', Once: '11',
};

export default function ListsPage() {
  // No longer using exiting state
  const { profile } = useUserProfile();
  
  // States para filtros
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedGradeName, setSelectedGradeName] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [institution, setInstitution] = useState<any>(null);
  
  const { data: gradesData = [] } = useGrades();
  const { data: studentsData = [] } = useStudents();
  const { data: teachersData = [] } = useTeachers();
  const { data: periodsData = [] } = usePeriods();
  const { data: assignmentsData = [] } = useAssignments();

  const isAdminOrCoord = ['admin', 'coordinator'].includes(profile?.role?.toLowerCase() || '');

  useEffect(() => {
    const fetchInstitution = async () => {
      const snap = await getDoc(doc(db, 'settings', 'institutional'));
      if (snap.exists()) setInstitution(snap.data());
    };
    fetchInstitution();
  }, []);

  if (gradesData.length === 0 && studentsData.length === 0) {
    return <LoadingSpinner message="Cargando datos escolares..." />;
  }

  const availableGrades = isAdminOrCoord
    ? gradesData.filter(g => {
        if (!selectedLevelId) return false;
        if (selectedLevelId === 'preescolar') return g.name.includes('Transición');
        const prefix = GRADE_MAP[selectedGradeName];
        return prefix ? g.name.startsWith(prefix) : false;
      })
    : gradesData.filter(g => assignmentsData.some((a: any) => a.teacher_id === profile?.uid && a.grade_id === g.id && a.state === true));

  const toggleGroupSelection = (id: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedGroupIds(availableGrades.map(g => g.id));
  };


  const generatePDF = async () => {
    if (selectedGroupIds.length === 0) {
      toast.error('Selecciona al menos un grupo para generar el PDF');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Periodo actual
    const today = new Date().toISOString().split('T')[0];
    const currentPeriod = periodsData.find((p: any) => today >= p.start_date && today <= p.end_date);
    const periodLabel = currentPeriod ? `Periodo ${currentPeriod.period_number}` : 'Periodo N/A';

    toast.loading(`Generando PDF para ${selectedGroupIds.length} grupos...`, { id: 'pdf-gen' });

    for (let i = 0; i < selectedGroupIds.length; i++) {
      const groupId = selectedGroupIds[i];
      const group = gradesData.find(g => g.id === groupId);
      if (!group) continue;

      if (i > 0) doc.addPage();

      const students = studentsData
        .filter(s => s.grade_id === groupId && s.state !== false)
        .sort((a, b) => {
          const nameA = `${a.last_name || ''} ${a.first_name || ''}`.toLowerCase();
          const nameB = `${b.last_name || ''} ${b.first_name || ''}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });

      const director = teachersData.find(t => t.id === group.director_id);

      // Logo
      if (institution?.logo_url) {
        try {
          doc.addImage(institution.logo_url, 'PNG', margin, margin, 20, 20);
        } catch (e) {
          console.error("Error adding logo to PDF", e);
        }
      }

      // Encabezado
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text((institution?.school_name || 'INSTITUCIÓN EDUCATIVA').toUpperCase(), pageWidth / 2, margin + 5, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      if (institution?.slogan) {
        doc.text(institution.slogan.toUpperCase(), pageWidth / 2, margin + 10, { align: 'center' });
      }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('LISTADO AUXILIAR DE ESTUDIANTES', pageWidth / 2, margin + 16, { align: 'center' });
      
      doc.setDrawColor(200);
      doc.line(margin, margin + 25, pageWidth - margin, margin + 25);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`GRADO: ${group.name}`, margin, margin + 32);
      doc.text(`${periodLabel} - AÑO: ${institution?.academic_year || new Date().getFullYear()}`, pageWidth / 2, margin + 32, { align: 'center' });
      doc.text(`DIRECTOR: ${director?.full_name || 'Sin asignar'}`, pageWidth - margin, margin + 32, { align: 'right' });

      // Tabla
      const tableData = students.map((s, index) => [
        index + 1,
        `${s.last_name || ''} ${s.first_name || ''}`.toUpperCase(),
        '', '', '', '', '', '', '', '', '', ''
      ]);

      const headers = [['#', 'ESTUDIANTE', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']];

      autoTable(doc, {
        startY: margin + 35,
        head: headers,
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [51, 65, 85], 
          textColor: [255, 255, 255],
          fontSize: 8,
          halign: 'center'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 1,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 65 },
          2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' },
          5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' },
          8: { halign: 'center' }, 9: { halign: 'center' }, 10: { halign: 'center' },
          11: { halign: 'center' }
        },
        margin: { left: margin, right: margin },
        didDrawPage: () => {
          const footerY = pageHeight - 10;
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text('Diseño: Edubeta | Empresa: Betasoft (c)', margin, footerY);
          
          const printDate = new Date().toLocaleString('es-ES', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          });
          doc.text(`Fecha de impresión: ${printDate}`, pageWidth - margin, footerY, { align: 'right' });
        }
      });
    }

    const fileName = selectedGroupIds.length === 1 
      ? `Lista_${availableGrades.find(g => g.id === selectedGroupIds[0])?.name}.pdf`
      : 'Listas_Escolares_Masivas.pdf';

    doc.save(fileName);
    toast.dismiss('pdf-gen');
    toast.success(`PDF generado correctamente (${selectedGroupIds.length} listas).`);
  };


  return (
    <FormView>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="space-y-1">
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Genere listados de asistencia personalizados por grado y grupo. Estos documentos facilitan el control diario y el seguimiento de asistencia en el aula.
          </p>
        </div>

        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isAdminOrCoord && (
                <>
                  <div className="space-y-2">
                    <Label>Nivel Educativo</Label>
                    <EduSelect 
                      value={selectedLevelId}
                      onChange={(e) => {
                        setSelectedLevelId(e.target.value);
                        setSelectedGradeName('');
                        setSelectedGroupIds([]);
                      }}
                      icon={Layers}
                    >
                      <option value="">Seleccionar Nivel</option>
                      {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </EduSelect>
                  </div>

                  <div className="space-y-2">
                    <Label>Grado Escolar</Label>
                    <EduSelect 
                      value={selectedGradeName}
                      onChange={(e) => {
                        setSelectedGradeName(e.target.value);
                        setSelectedGroupIds([]);
                      }}
                      disabled={!selectedLevelId}
                      icon={FileText}
                    >
                      <option value="">Seleccionar Grado</option>
                      {LEVELS.find(l => l.id === selectedLevelId)?.grades.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </EduSelect>
                  </div>
                </>
              )}
            </div>

            {availableGrades.length > 0 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#151b2d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Selección de Grupos
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium tracking-wider">
                        {selectedGroupIds.length} selección para impresión
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <EduButton 
                      onClick={selectAll}
                      variant="secondary"
                      className="h-9 px-4"
                      icon={ListChecks}
                    >
                      Todos
                    </EduButton>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {availableGrades.map(group => {
                    const isSelected = selectedGroupIds.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() => toggleGroupSelection(group.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                          isSelected 
                            ? "bg-primary/5 border-primary text-primary shadow-md shadow-primary/5 ring-1 ring-primary/20"
                            : "bg-white dark:bg-[#151b2d] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/50 hover:shadow-sm"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-black tracking-tight">{group.name}</span>
                          <span className="text-[10px] opacity-60 font-medium">{isSelected ? 'Seleccionado' : 'Pendiente'}</span>
                        </div>
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 shrink-0 animate-in zoom-in-50 duration-200" />
                        ) : (
                          <Square className="w-5 h-5 shrink-0 text-slate-300 dark:text-slate-700 group-hover:text-slate-400 transition-colors" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {!isAdminOrCoord && availableGrades.length === 0 && (
              <div className="p-12 text-center bg-white dark:bg-[#151b2d] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <Users className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto" />
                <p className="text-sm font-medium text-slate-500">No tienes grupos asignados actualmente.</p>
              </div>
            )}
        </div>
      </div>

      {/* Floating Action Bar */}
        <div>
          <EduButton 
            onClick={generatePDF}
            disabled={selectedGroupIds.length === 0}
            icon={Printer}
            fullWidth
          >
            Generar PDF
          </EduButton>
        </div>
    </FormView>
  );
}
