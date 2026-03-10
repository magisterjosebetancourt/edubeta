import { useState, useEffect } from 'react';
import { useUserProfile } from '@/lib/context/UserProfileContext';
import { useGrades, useStudents, usePeriods, useSubjects } from '@/lib/hooks/useFirebaseData';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { FormView } from '@/components/ui/FormView';
import { 
  Printer, 
  ClipboardList,
  Calendar,
  FileSearch
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { EduInput } from "@/components/ui/EduInput";
import { EduSelect } from "@/components/ui/EduSelect";
import { EduButton } from "@/components/ui/EduButton";
import jsPDF from 'jspdf';
import { ISA_INDICATORS } from '@/types/isa';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

type ReportType = 'attendance_group' | 'academic_summary' | 'observador' | 'isa' | 'isa_list';

export default function ReportsPage() {
  const { profile } = useUserProfile();
  const [selectedType, setSelectedType] = useState<ReportType>('attendance_group');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [groupFilterMode, setGroupFilterMode] = useState<'all_groups' | 'all_grade' | 'single_group'>('all_groups');
  const [selectedGradeName, setSelectedGradeName] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  
  const [institution, setInstitution] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const { data: gradesData = [] } = useGrades();
  const { data: studentsData = [] } = useStudents();
  const { data: periodsData = [] } = usePeriods();
  const { data: subjectsData = [] } = useSubjects();

  useEffect(() => {
    const fetchInstitution = async () => {
      const snap = await getDoc(doc(db, 'settings', 'institutional'));
      if (snap.exists()) setInstitution(snap.data());
    };
    fetchInstitution();
  }, []);

  if (gradesData.length === 0 && studentsData.length === 0) {
    return <LoadingSpinner message="Preparando generador de informes..." />;
  }

  const handleGenerate = async () => {
    if (exportFormat === 'excel') {
      toast.info('Exportación a Excel estará disponible próximamente');
      return;
    }
    if (selectedType === 'isa') {
      await generateISAReport();
      return;
    }

    if (selectedType === 'isa_list') {
      await generateISAList();
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

  const generateISAReport = async () => {
    if (!selectedPeriodId) {
      toast.error('Selecciona el periodo');
      return;
    }

    setGenerating(true);
    const toastId = toast.loading('Generando informes ISA...');

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // 1. Filtrar Grupos
      let targetGrades = [];
      if (groupFilterMode === 'all_groups') {
        targetGrades = gradesData;
      } else if (groupFilterMode === 'all_grade') {
        if (!selectedGradeName) { toast.error('Selecciona un grado'); setGenerating(false); return; }
        targetGrades = gradesData.filter((g: any) => {
          if (selectedGradeName === 'Transición') return g.name.includes('Transición');
          const prefix = GRADE_MAP[selectedGradeName];
          if (!prefix) return false;
          if (prefix === '1') return g.name.startsWith('1') && !g.name.startsWith('11');
          return g.name.startsWith(prefix);
        });
      } else {
        if (!selectedLevelId) { toast.error('Selecciona el nivel'); setGenerating(false); return; }
        if (!selectedGradeName) { toast.error('Selecciona el grado'); setGenerating(false); return; }
        if (!selectedGroupId) { toast.error('Selecciona el grupo'); setGenerating(false); return; }
        const g = gradesData.find(g => g.id === selectedGroupId);
        if (g) targetGrades = [g];
      }

      if (targetGrades.length === 0) {
        toast.error('No se encontraron grupos para el filtro seleccionado');
        setGenerating(false);
        toast.dismiss(toastId);
        return;
      }

      const targetGradeIds = targetGrades.map(g => g.id);
      const period = periodsData.find(p => p.id === selectedPeriodId);
      const periodNum = period?.period_number || '?';

      // 2. Cargar Datos ISA (en paralelo por grupos para optimizar)
      const allISARecords: any[] = [];
      for (const gradeId of targetGradeIds) {
        const q = query(
          collection(db, 'isa_records'),
          where('grade_id', '==', gradeId),
          where('period_id', '==', selectedPeriodId)
        );
        const snap = await getDocs(q);
        snap.forEach(d => allISARecords.push({ id: d.id, ...d.data() }));
      }

      // 3. Agrupar por Estudiante y filtrar solo registros con indicadores
      const studentsMap = new Map();
      allISARecords.forEach(rec => {
        const hasIndicators = rec.i1 || rec.i2 || rec.i3;
        if (!hasIndicators) return;

        if (!studentsMap.has(rec.student_id)) {
          studentsMap.set(rec.student_id, []);
        }
        studentsMap.get(rec.student_id).push(rec);
      });

      // Lista de estudiantes que tienen al menos un ISA
      const studentsToPrint = Array.from(studentsMap.entries())
        .map(([id, records]) => {
          const student = studentsData.find(s => s.id === id);
          const grade = gradesData.find(g => g.id === student?.grade_id);
          return { student, grade, records };
        })
        .filter(item => item.student && item.student.state !== false)
        .sort((a, b) => {
          // Ordenar por grupo (natural: 601 antes de 1101) y luego por nombre completo
          const gradeComp = (a.grade?.name || '').localeCompare(b.grade?.name || '', undefined, { numeric: true, sensitivity: 'base' });
          if (gradeComp !== 0) return gradeComp;
          
          const lastNameComp = (a.student.last_name || '').localeCompare(b.student.last_name || '', 'es', { sensitivity: 'base' });
          if (lastNameComp !== 0) return lastNameComp;
          
          return (a.student.first_name || '').localeCompare(b.student.first_name || '', 'es', { sensitivity: 'base' });
        });

      if (studentsToPrint.length === 0) {
        toast.error('No hay registros ISA para los filtros seleccionados');
        setGenerating(false);
        toast.dismiss(toastId);
        return;
      }

      // 4. Generar PDF (1 por página)
      const drawReportInstance = (pdf: jsPDF, item: any) => {
        const currentY = 10;
        
        // Header
        const logoSize = 18;
        if (institution?.logo_url) {
          try { pdf.addImage(institution.logo_url, 'PNG', margin, currentY + 2, logoSize, logoSize); } catch (e) {}
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text((institution?.school_name || 'COLEGIO').toUpperCase(), pageWidth / 2, currentY + 8, { align: 'center' });
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        if (institution?.slogan) pdf.text(institution.slogan, pageWidth / 2, currentY + 13, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.text(`PERIODO ${periodNum}`, pageWidth / 2, currentY + 18, { align: 'center' });

        // Divider
        pdf.setDrawColor(200);
        pdf.line(margin, currentY + 22, pageWidth - margin, currentY + 22);

        // Student Info
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Estudiante:', margin, currentY + 28);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${item.student.last_name}, ${item.student.first_name}`.toUpperCase(), margin + 22, currentY + 28);
        
        pdf.setFont('helvetica', 'normal');
        pdf.text('Grupo:', pageWidth - margin - 35, currentY + 28);
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.grade?.name || '', pageWidth - margin, currentY + 28, { align: 'right' });

        // Table
        const tableBody = item.records.map((rec: any, index: number) => {
          const subjectName = rec.subject_name || subjectsData.find(s => s.id === rec.subject_id)?.name || 'Asignatura';
          return [
            index + 1,
            subjectName.toUpperCase(),
            rec.i1 ? 'X' : '',
            rec.i2 ? 'X' : '',
            rec.i3 ? 'X' : ''
          ];
        });

        autoTable(pdf, {
          startY: currentY + 32,
          margin: { left: margin, right: margin },
          head: [[
            { content: 'No.', styles: { halign: 'center', valign: 'middle' } },
            { content: 'ASIGNATURAS E INDICADORES A MEJORAR', styles: { halign: 'left', valign: 'middle' } },
            { content: ISA_INDICATORS[0].description.toUpperCase(), styles: { halign: 'center', valign: 'middle' } },
            { content: ISA_INDICATORS[1].description.toUpperCase(), styles: { halign: 'center', valign: 'middle' } },
            { content: ISA_INDICATORS[2].description.toUpperCase(), styles: { halign: 'center', valign: 'middle' } }
          ]],
          body: tableBody,
          theme: 'grid',
          headStyles: { 
            fillColor: [240, 240, 240], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold', 
            fontSize: 7,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
          },
          styles: { 
            fontSize: 8, 
            cellPadding: 2,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 30, halign: 'center' }
          }
        });

        // After Table Line
        const finalY = (pdf as any).lastAutoTable.finalY + 5;
        pdf.line(margin, finalY, pageWidth - margin, finalY);

        // Footer
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('DIRECTOR DE GRUPO', margin + 30, finalY + 12, { align: 'center' });
        pdf.line(margin + 5, finalY + 8, margin + 55, finalY + 8);

        pdf.text('COORDINADOR', pageWidth - margin - 30, finalY + 12, { align: 'center' });
        pdf.line(pageWidth - margin - 55, finalY + 8, pageWidth - margin - 5, finalY + 8);

        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Diseño: EduBeta | Empresa: BetaSoft | Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      };

      for (let i = 0; i < studentsToPrint.length; i++) {
        const item = studentsToPrint[i];
        if (i > 0) {
          doc.addPage();
        }
        drawReportInstance(doc, item);
      }

      let fileName = `Informe_ISA_P${periodNum}.pdf`;
      if (groupFilterMode === 'all_groups') {
        fileName = `Informe_ISA_Todos_P${periodNum}.pdf`;
      } else if (groupFilterMode === 'all_grade') {
        fileName = `Informe_ISA_${selectedGradeName}_P${periodNum}.pdf`;
      } else {
        const groupName = targetGrades[0]?.name || 'Grupo';
        fileName = `Informe_ISA_${groupName}_P${periodNum}.pdf`;
      }

      doc.save(fileName);
      toast.dismiss(toastId);
      toast.success('Informes generados correctamente');

    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error('Error al generar Informes ISA');
    } finally {
      setGenerating(false);
    }
  };

  const handleFixIsaNames = async () => {
    if (profile?.role !== 'admin' && profile?.role !== 'coordinator') return;
     
    const toastId = toast.loading('Corrigiendo nombres de asignaturas ISA...');
    try {
      const { writeBatch } = await import('firebase/firestore');
      
      const isaSnap = await getDocs(collection(db, 'isa_records'));
      const subjectsSnap = await getDocs(collection(db, 'subjects'));
      
      const subjectsMap: Record<string, string> = {};
      subjectsSnap.forEach(docSnap => {
        subjectsMap[docSnap.id] = docSnap.data().name;
      });

      const batch = writeBatch(db);
      let count = 0;

      isaSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.subject_name && data.subject_id) {
          const realName = subjectsMap[data.subject_id];
          if (realName) {
            batch.update(docSnap.ref, { subject_name: realName });
            count++;
          }
        }
      });

      if (count > 0) {
        await batch.commit();
        toast.success(`Se corrigieron ${count} registros.`);
      } else {
        toast.info('No se encontraron registros para corregir.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al corregir registros');
    } finally {
      toast.dismiss(toastId);
    }
  };

  const generateISAList = async () => {
    if (!selectedPeriodId) {
      toast.error('Selecciona el periodo');
      return;
    }

    setGenerating(true);
    const toastId = toast.loading('Generando lista ISA...');

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // 1. Filtrar Grupos
      let targetGrades = [];
      if (groupFilterMode === 'all_groups') {
        targetGrades = gradesData;
      } else if (groupFilterMode === 'all_grade') {
        if (!selectedGradeName) { toast.error('Selecciona un grado'); setGenerating(false); return; }
        targetGrades = gradesData.filter((g: any) => {
          if (selectedGradeName === 'Transición') return g.name.includes('Transición');
          const prefix = GRADE_MAP[selectedGradeName];
          if (!prefix) return false;
          if (prefix === '1') return g.name.startsWith('1') && !g.name.startsWith('11');
          return g.name.startsWith(prefix);
        });
      } else {
        if (!selectedLevelId) { toast.error('Selecciona el nivel'); setGenerating(false); return; }
        if (!selectedGradeName) { toast.error('Selecciona el grado'); setGenerating(false); return; }
        if (!selectedGroupId) { toast.error('Selecciona el grupo'); setGenerating(false); return; }
        const g = gradesData.find(g => g.id === selectedGroupId);
        if (g) targetGrades = [g];
      }

      if (targetGrades.length === 0) {
        toast.error('No se encontraron grupos');
        setGenerating(false);
        toast.dismiss(toastId);
        return;
      }

      const period = periodsData.find(p => p.id === selectedPeriodId);
      const periodNum = period?.period_number || '?';

      // 2. Cargar Datos y Agrupar por Grupo (Ordenado natural)
      targetGrades.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
      
      let pagesAdded = 0;
      for (const grade of targetGrades) {
        const q = query(
          collection(db, 'isa_records'),
          where('grade_id', '==', grade.id),
          where('period_id', '==', selectedPeriodId)
        );
        const snap = await getDocs(q);
        const records = snap.docs.map(d => d.data());
        
        const activeRecords = records.filter((r: any) => r.i1 || r.i2 || r.i3);
        if (activeRecords.length === 0 && targetGrades.length > 1) continue;

        if (pagesAdded > 0) doc.addPage();
        pagesAdded++;

        // Header
        const currentY = 10;
        const logoSize = 18;
        if (institution?.logo_url) {
          try { doc.addImage(institution.logo_url, 'PNG', margin, currentY + 2, logoSize, logoSize); } catch (e) {}
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text((institution?.school_name || 'COLEGIO').toUpperCase(), pageWidth / 2, currentY + 8, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        if (institution?.slogan) doc.text(institution.slogan, pageWidth / 2, currentY + 13, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`LISTADO DE SEGUIMIENTO (ISA) - PERIODO ${periodNum}`, pageWidth / 2, currentY + 18, { align: 'center' });

        doc.setDrawColor(200);
        doc.line(margin, currentY + 22, pageWidth - margin, currentY + 22);

        doc.setFont('helvetica', 'bold');
        doc.text(`GRUPO: ${grade.name}`, margin, currentY + 28);

        // Group by student
        const studentMap = new Map();
        activeRecords.forEach(rec => {
          if (!studentMap.has(rec.student_id)) studentMap.set(rec.student_id, []);
          studentMap.get(rec.student_id).push(rec);
        });

        const studentsInGrade = Array.from(studentMap.entries())
          .map(([id, recs]) => {
            const student = studentsData.find(s => s.id === id);
            const subjects = recs.map((r: any) => r.subject_name || subjectsData.find(s => s.id === r.subject_id)?.name || 'Asignatura');
            const uniqueSubjects = Array.from(new Set(subjects)).sort();
            return { student, uniqueSubjects };
          })
          .filter(s => s.student)
          .sort((a, b) => {
            const lnComp = (a.student.last_name || '').localeCompare(b.student.last_name || '', 'es', { sensitivity: 'base' });
            if (lnComp !== 0) return lnComp;
            return (a.student.first_name || '').localeCompare(b.student.first_name || '', 'es', { sensitivity: 'base' });
          });

        const tableBody = studentsInGrade.map((item, idx) => [
          idx + 1,
          `${item.student.last_name}, ${item.student.first_name}`.toUpperCase(),
          item.uniqueSubjects.join(', ').toUpperCase()
        ]);

        autoTable(doc, {
          startY: currentY + 32,
          margin: { left: margin, right: margin },
          head: [['No.', 'ESTUDIANTE', 'ASIGNATURAS CON REGISTROS']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, halign: 'center' },
          styles: { fontSize: 8, cellPadding: 1.5 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 70 },
            2: { cellWidth: 'auto' }
          }
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('DIRECTOR DE GRUPO', margin + 30, finalY + 12, { align: 'center' });
        doc.line(margin + 5, finalY + 8, margin + 55, finalY + 8);
        doc.text('COORDINADOR', pageWidth - margin - 30, finalY + 12, { align: 'center' });
        doc.line(pageWidth - margin - 55, finalY + 8, pageWidth - margin - 5, finalY + 8);
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Diseño: EduBeta | Empresa: BetaSoft | Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      let fileName = `Lista_ISA_P${periodNum}.pdf`;
      if (groupFilterMode === 'all_groups') fileName = `Lista_ISA_Todos_P${periodNum}.pdf`;
      else if (groupFilterMode === 'all_grade') fileName = `Lista_ISA_${selectedGradeName}_P${periodNum}.pdf`;
      else fileName = `Lista_ISA_${targetGrades[0]?.name || 'Grupo'}_P${periodNum}.pdf`;

      doc.save(fileName);
      toast.dismiss(toastId);
      toast.success('Lista generada correctamente');

    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error('Error al generar Lista ISA');
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    { id: 'attendance_group', label: 'Asistencia', icon: Calendar },
    { id: 'academic_summary', label: 'Académico', icon: ClipboardList },
    { id: 'observador', label: 'Observador', icon: FileSearch },
    { id: 'isa', label: 'Informe ISA', icon: ClipboardList },
    { id: 'isa_list', label: 'Lista ISA', icon: ClipboardList },
  ];

  const LEVELS = [
    { id: 'preescolar', name: 'Preescolar', grades: ['Transición'] },
    { id: 'primaria', name: 'Básica Primaria', grades: ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'] },
    { id: 'secundaria', name: 'Básica Secundaria', grades: ['Sexto', 'Séptimo', 'Octavo', 'Noveno'] },
    { id: 'media', name: 'Educación Media', grades: ['Décimo', 'Once'] },
  ];

  const GRADE_MAP: Record<string, string> = {
    Primero:'1',Segundo:'2',Tercero:'3',Cuarto:'4',Quinto:'5',
    Sexto:'6','Séptimo':'7',Octavo:'8',Noveno:'9','Décimo':'10',Once:'11',
  };



  return (
    <FormView>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Card className="border-none shadow-none bg-transparent">
          <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
            Configura los filtros y el tipo de informe que deseas generar.
          </p>
          <CardContent className="p-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Tipo de Informe */}
              <div className="space-y-2 lg:col-span-3">
                <Label>Tipo de informe</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {reportTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id as ReportType)}
                      className={cn(
                        "flex flex-col items-center justify-center py-4 px-2 rounded-2xl border transition-all duration-300 gap-2",
                        selectedType === type.id 
                          ? "bg-white border-primary text-primary shadow-lg shadow-primary/10 ring-[0.5px] ring-primary" 
                          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg transition-colors", selectedType === type.id ? "bg-primary text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400")}>
                        <type.icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold tracking-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rango de Fechas */}
              <div className="space-y-2">
                <Label>Desde</Label>
                <EduInput 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <EduInput 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* Filtros dinámicos según el tipo de informe */}
              {(selectedType === 'isa' || selectedType === 'isa_list') ? (
                <>
                  <div className="space-y-2">
                    <Label>Periodo</Label>
                    <EduSelect 
                      value={selectedPeriodId}
                      onChange={(e) => setSelectedPeriodId(e.target.value)}
                    >
                      <option value="">Seleccionar periodo</option>
                      {periodsData.map((p: any) => (
                        <option key={p.id} value={p.id}>Periodo {p.period_number}</option>
                      ))}
                    </EduSelect>
                  </div>

                  <div className="space-y-2">
                    <Label>Alcance del informe</Label>
                    <EduSelect 
                      value={groupFilterMode}
                      onChange={(e) => {
                        setGroupFilterMode(e.target.value as any);
                        setSelectedGradeName('');
                        setSelectedLevelId('');
                        setSelectedGroupId('');
                      }}
                    >
                      <option value="all_groups">Todos los grupos del colegio</option>
                      <option value="all_grade">Todo el grado</option>
                      <option value="single_group">Un grupo específico</option>
                    </EduSelect>
                  </div>

                  {groupFilterMode === 'all_grade' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <Label>Seleccionar Grado</Label>
                      <EduSelect 
                        value={selectedGradeName}
                        onChange={(e) => setSelectedGradeName(e.target.value)}
                      >
                        <option value="">Cualquier grado...</option>
                        {Object.keys(GRADE_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                        <option value="Transición">Transición</option>
                      </EduSelect>
                    </div>
                  )}

                  {groupFilterMode === 'single_group' && (
                    <>
                      <div className="space-y-2">
                        <Label>Nivel</Label>
                        <EduSelect 
                          value={selectedLevelId}
                          onChange={(e) => {
                            setSelectedLevelId(e.target.value);
                            setSelectedGradeName('');
                            setSelectedGroupId('');
                          }}
                        >
                          <option value="">Seleccionar nivel...</option>
                          {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </EduSelect>
                      </div>

                      <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label>Grado</Label>
                        <EduSelect 
                          value={selectedGradeName}
                          onChange={(e) => {
                            setSelectedGradeName(e.target.value);
                            setSelectedGroupId('');
                          }}
                        >
                          <option value="">Cualquier grado...</option>
                          {LEVELS.find(l => l.id === selectedLevelId)?.grades.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </EduSelect>
                      </div>

                      <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label>Grupo Final</Label>
                        <EduSelect 
                          value={selectedGroupId}
                          onChange={(e) => setSelectedGroupId(e.target.value)}
                        >
                          <option value="">Seleccionar grupo...</option>
                          {gradesData
                            .filter((g: any) => {
                              if (selectedGradeName === 'Transición') return g.name.includes('Transición');
                              const prefix = GRADE_MAP[selectedGradeName];
                              if (!prefix) return false;
                              if (prefix === '1') return g.name.startsWith('1') && !g.name.startsWith('11');
                              return g.name.startsWith(prefix);
                            })
                            .sort((a: any, b: any) => a.name.localeCompare(b.name))
                            .map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)
                          }
                        </EduSelect>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Grado</Label>
                    <EduSelect 
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                    >
                      <option value="">Seleccionar grado</option>
                      {gradesData.sort((a,b) => a.name.localeCompare(b.name)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </EduSelect>
                  </div>
                  <div className="space-y-2">
                    <Label>Sección</Label>
                    <EduSelect disabled>
                      <option>Seleccionar sección</option>
                    </EduSelect>
                  </div>
                </>
              )}

              {/* Formato de Exportación */}
              <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                <Label>Formato de exportación</Label>
                <div className="bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl flex border border-slate-100 dark:border-slate-800 h-12">
                  <button
                    onClick={() => setExportFormat('pdf')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-lg transition-all duration-300 font-semibold text-sm",
                      exportFormat === 'pdf' 
                        ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" 
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    <span className="text-red-500 text-xs">📄</span> PDF
                  </button>
                  <button
                    onClick={() => setExportFormat('excel')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-lg transition-all duration-300 font-semibold text-sm",
                      exportFormat === 'excel' 
                        ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" 
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    <span className="text-emerald-500 text-xs">📗</span> Excel
                  </button>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <EduButton 
          onClick={handleGenerate}
          disabled={generating}
          icon={Printer}
          fullWidth
        >
          {generating ? 'Generando...' : 'Generar informe'}
        </EduButton>
      </div>
    </FormView>
  );
}
