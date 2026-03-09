import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ClipboardList, 
  Save, 
  ShieldAlert, 
  BookOpen, 
  HeartHandshake, 
  Medal,
  Users,
  X,
  Fingerprint,
  RotateCcw
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { FormView } from '@/components/ui/FormView';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from 'sonner';

import { useUserProfile } from '@/lib/context/UserProfileContext';
import { useCreateObservation } from '@/lib/hooks/useObservador';
import { ObservationType } from '@/types/observador';

import { useStudents, useGrades, useAssignments } from '@/lib/hooks/useFirebaseData';

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

const formSchema = z.object({
  studentId: z.string().min(1, "Debe seleccionar un estudiante"),
  type: z.enum(['Academica', 'Disciplinaria', 'Formativa', 'Reconocimiento Positivo'] as const),
  law1620Category: z.enum(['Tipo I', 'Tipo II', 'Tipo III', 'No Aplica'] as const),
  incidentDate: z.string().min(1, "La fecha de la situación es obligatoria"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  actionTaken: z.string().min(1, "Describa la acción adelantada"),
  suggestions: z.string().min(1, "Indique las sugerencias o recomendaciones"),
  commitmentStatus: z.enum(['Iniciada', 'En evaluación', 'Finalizada'] as const),
  agreements: z.string().min(5, "Especifique al menos un compromiso o acuerdo"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ObservadorForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useUserProfile();
  const createObservation = useCreateObservation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [signatureRef, setSignatureRef] = useState<SignatureCanvas | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Intentamos recuperar pre-fill parameters si vinenes de StudentObservationsPage
  const prefillStudentId = location.state?.prefill_student_id || '';
  const prefillGradeId = location.state?.prefill_grade_id || '';

  const { data: rawStudents = [], isLoading: loadingStudents } = useStudents();
  const { data: rawGrades = [], isLoading: loadingGrades } = useGrades();

  const isAdminOrCoord = profile?.role === 'admin' || profile?.role === 'coordinator';
  const { data: rawAssignments = [], isLoading: loadingAssignments } = useAssignments();

  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedGradeName, setSelectedGradeName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Auto-completado inteligente si hay prefijos proveídos
  useState(() => {
    if (prefillGradeId) {
      // Necesitamos esperar a la carga de grados para resolver (se hace en un useEffect mejor)
      setSelectedGroupId(prefillGradeId);
    }
  });

  // Grupos disponibles según rol
  const teacherGradeIds = rawAssignments
    .filter((a: any) => a.teacher_id === profile?.uid && a.state === true)
    .map((a: any) => a.grade_id);

  const availableGrades = isAdminOrCoord 
    ? rawGrades.filter((g: any) => {
        if (!selectedGradeName) return true;
        if (selectedGradeName === 'Transición') return g.name.includes('Transición');
        const prefix = GRADE_MAP[selectedGradeName];
        if (!prefix) return false;
        if (prefix === '1') return g.name.startsWith('1') && !g.name.startsWith('11');
        return g.name.startsWith(prefix);
      })
    : rawGrades.filter((g: any) => teacherGradeIds.includes(g.id));

  // Aquí filtramos garantizando que la comparación de string == string funcione bien.
  // En Firebase a veces guardan ref, a veces string directos. toString() por seguridad.
  const students = !selectedGroupId 
    ? [] // Si no hay grupo seleccionado, no mostramos a toda la escuela (mejora UX/Performance)
    : rawStudents.filter((s: any) => String(s.grade_id) === String(selectedGroupId));

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'Formativa',
      law1620Category: 'No Aplica',
      studentId: prefillStudentId,
      incidentDate: new Date().toISOString().split('T')[0],
      commitmentStatus: 'Iniciada',
    }
  });

  // Auto-rellena Nivel y Nombre de Grado usando el Group ID de Firebase cuando cargan los grados
  useEffect(() => {
    if (prefillGradeId && prefillStudentId && rawGrades.length > 0 && rawStudents.length > 0) {
      const g = rawGrades.find((gr: any) => gr.id === prefillGradeId);
      if (g) {
        // Obtenemos qué nivel y grado raíz tiene
        const rootGrade = Object.keys(GRADE_MAP).find(k => g.name.startsWith(GRADE_MAP[k]) && (GRADE_MAP[k] !== '1' || !g.name.startsWith('11')));
        if (rootGrade) {
          const levelObj = LEVELS.find(l => l.grades.includes(rootGrade));
          if (levelObj) {
            setSelectedLevelId(levelObj.id);
            setSelectedGradeName(rootGrade);
          } else if (g.name.includes('Transición')) {
            setSelectedLevelId('preescolar');
            setSelectedGradeName('Transición');
          }
        } else if (g.name.includes('Transición')) {
            setSelectedLevelId('preescolar');
            setSelectedGradeName('Transición');
        }
      }
      setValue('studentId', prefillStudentId);
    }
  }, [prefillGradeId, prefillStudentId, rawGrades, rawStudents, setValue]);

  const selectedType = watch('type');

  const onSubmit = async (data: FormValues) => {
    if (!profile) return toast.error("Error de sesión");

    // Validación de seguridad: el docente solo puede reportar estudiantes de sus grupos asignados
    if (!isAdminOrCoord) {
      const targetStudent = rawStudents.find((s: any) => s.id === data.studentId);
      if (!targetStudent || !teacherGradeIds.includes(targetStudent.grade_id)) {
        return toast.error("No tienes permisos para registrar observaciones para este estudiante.");
      }
    }

    setIsSubmitting(true);

    try {
      // Obtenemos el nombre del estudiante para denormalizarlo
      const targetStudent = rawStudents.find((s: any) => s.id === data.studentId);
      const studentName = targetStudent ? `${targetStudent.last_name}, ${targetStudent.first_name}` : '';

      // El agreements lo guardamos en array ya que el esquema lo pide así
      const agreementsArray = data.agreements.split('\n').filter((a: string) => a.trim().length > 0);

      let signatureData = '';
      let signatureDate = '';

      if (hasSignature && signatureRef) {
        // Corrección: Usar el canvas interno directamente si getTrimmedCanvas falla
        const canvas = signatureRef.getCanvas();
        signatureData = canvas.toDataURL('image/png');
        signatureDate = new Date().toISOString();
      }

      await createObservation.mutateAsync({
        studentId: data.studentId,
        studentName, // Persistimos el nombre para evitar búsquedas lentas en la lista
        createdBy: profile.full_name, // Usamos name en lugar de ID (la interface de firestore.ts usa email y role pero no ID explicit). Todo: Arreglar en firestore el .id
        creatorName: profile.full_name,
        date: data.incidentDate, // Usamos la fecha de la situación elegida
        type: data.type,
        law1620Category: data.law1620Category,
        description: data.description,
        actionTaken: data.actionTaken,
        suggestions: data.suggestions,
        commitmentStatus: data.commitmentStatus,
        agreements: agreementsArray.length > 0 ? agreementsArray : [data.agreements],
        status: 'Abierto',
        initialSignatureDataUrl: signatureData || undefined,
        initialSignatureDate: signatureDate || undefined
      });

      toast.success("Anotación registrada correctamente");
      setExiting(true);
      setTimeout(() => navigate('/dashboard/observations'), 220);
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar la observación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tipoIcons: Record<ObservationType, React.ReactNode> = {
    'Academica': <BookOpen className="w-5 h-5 text-blue-500" />,
    'Disciplinaria': <ShieldAlert className="w-5 h-5 text-red-500" />,
    'Formativa': <HeartHandshake className="w-5 h-5 text-amber-500" />,
    'Reconocimiento Positivo': <Medal className="w-5 h-5 text-emerald-500" />
  };

  return (
    <FormView exiting={exiting} className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Sección 1: Datos Básicos */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e1e2d]">
          <CardContent className="p-6 space-y-6">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 tracking-wide">
              <Users className="w-4 h-4 text-primary" /> 
              Identificación del estudiante
            </h2>
            
            <div className={`grid grid-cols-1 ${isAdminOrCoord ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
              {isAdminOrCoord && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nivel</label>
                    <select 
                      value={selectedLevelId}
                      onChange={(e) => {
                        setSelectedLevelId(e.target.value);
                        setSelectedGradeName('');
                        setSelectedGroupId('');
                      }}
                      className="pl-9 h-10 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all font-medium"
                    >
                      <option value="">Todos los niveles</option>
                      {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Grado</label>
                    <select 
                      value={selectedGradeName}
                      onChange={(e) => {
                        setSelectedGradeName(e.target.value);
                        setSelectedGroupId('');
                      }}
                      className="pl-9 h-10 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all disabled:opacity-50 font-medium"
                      disabled={!selectedLevelId}
                    >
                      <option value="">Todos los grados</option>
                      {LEVELS.find(l => l.id === selectedLevelId)?.grades.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Grupo / Curso</label>
                <select 
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="pl-9 h-10 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all font-medium"
                  disabled={loadingGrades || loadingAssignments || (isAdminOrCoord && !!selectedLevelId && !selectedGradeName)}
                >
                  <option value="">{isAdminOrCoord ? 'Todos los grupos' : 'Seleccionar grupo'}</option>
                  {availableGrades.sort((a: any, b: any) => a.name?.localeCompare(b.name || '')).map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estudiante implicado *</label>
                <select 
                  {...register('studentId')}
                  className={`pl-9 h-10 w-full bg-slate-50 dark:bg-slate-900/50 border ${errors.studentId ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all font-medium`}
                  disabled={loadingStudents || (!!selectedGradeName && !selectedGroupId) || students.length === 0}
                >
                  <option value="">
                    {students.length === 0 && selectedGroupId 
                      ? "Este grupo no tiene estudiantes matriculados" 
                      : !selectedGroupId 
                        ? "Primero seleccione un grupo..." 
                        : "Seleccione estudiante..."}
                  </option>
                  {students.sort((a: any, b: any) => a.last_name?.localeCompare(b.last_name || '')).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>
                  ))}
                </select>
                {errors.studentId && <p className="text-xs text-red-500 font-medium">{errors.studentId.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha de la situación *</label>
                <input 
                  type="date"
                  {...register('incidentDate')}
                  className={`w-full h-12 rounded-lg border ${errors.incidentDate ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50`}
                />
                {errors.incidentDate && <p className="text-xs text-red-500 font-medium">{errors.incidentDate.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección 2: Tipificación y Ley 1620 */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e1e2d]">
          <CardContent className="p-6 space-y-8">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 tracking-wide">
              <ShieldAlert className="w-4 h-4 text-primary" /> 
              Clasificación de la situación
            </h2>
            
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de anotación</label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <RadioGroup 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {(Object.keys(tipoIcons) as ObservationType[]).map((type) => (
                      <div key={type} className="relative">
                        <RadioGroupItem value={type} id={`type-${type}`} className="peer sr-only" />
                        <label 
                          htmlFor={`type-${type}`}
                          className="flex items-center gap-3 p-4 border-2 border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 dark:peer-data-[state=checked]:bg-primary/10 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          {tipoIcons[type]}
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{type}</span>
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>

            {selectedType === 'Disciplinaria' && (
              <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl">
                <label className="text-sm font-semibold text-amber-900 dark:text-amber-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Ruta de Atención Integral (Ley 1620)
                </label>
                <Controller
                  name="law1620Category"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="Tipo I" id="t1" className="mt-1" />
                        <label htmlFor="t1" className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">
                          <span className="font-semibold block mb-1">Situación Tipo I</span>
                          Conflictos manejables intraescolarmente. No generan daño al cuerpo o a la salud.
                        </label>
                      </div>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="Tipo II" id="t2" className="mt-1" />
                        <label htmlFor="t2" className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">
                          <span className="font-semibold block mb-1">Situación Tipo II</span>
                          Agresión escolar, acoso (bullying) o ciberacoso. Daño físico o psicológico que no requiere atención médica.
                        </label>
                      </div>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="Tipo III" id="t3" className="mt-1" />
                        <label htmlFor="t3" className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">
                          <span className="font-semibold block text-red-600 dark:text-red-400 mb-1">Situación Tipo III (Delito)</span>
                          Presuntos delitos contra la libertad, integridad o formación sexual. Requiere denuncia a ICBF / Policía de Infancia.
                        </label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sección 3: Descripción de Hechos */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e1e2d]">
          <CardContent className="p-6 space-y-6">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 tracking-wide">
              <ClipboardList className="w-4 h-4 text-primary" /> 
              Relato de los hechos y compromisos
            </h2>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Descripción Objetiva (¿Qué, cómo, cuándo y dónde pasó?)
              </label>
              <Textarea 
                {...register('description')}
                placeholder="Redacte de forma neutral lo sucedido..."
                className="min-h-[120px] bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 resize-none dark:text-white"
              />
              {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Acción Adelantada (¿Qué medidas se tomaron inicialmente?) *
              </label>
              <Textarea 
                {...register('actionTaken')}
                placeholder="Ej: Diálogo con el estudiante, citación inmediata..."
                className="min-h-[80px] bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 resize-none dark:text-white"
              />
              {errors.actionTaken && <p className="text-xs text-red-500 font-medium">{errors.actionTaken.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Sugerencias y Recomendaciones (Para el estudiante o docente) *
              </label>
              <Textarea 
                {...register('suggestions')}
                placeholder="Indique acciones preventivas o de mejora..."
                className="min-h-[80px] bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 resize-none dark:text-white"
              />
              {errors.suggestions && <p className="text-xs text-red-500 font-medium">{errors.suggestions.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Compromiso y Seguimiento *
              </label>
              <select 
                {...register('commitmentStatus')}
                className="pl-9 h-10 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all font-medium"
              >
                <option value="Iniciada">Iniciada</option>
                <option value="En evaluación">En evaluación</option>
                <option value="Finalizada">Finalizada</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Acuerdos y Compromisos (Acciones de mejora) *
              </label>
              <Textarea 
                {...register('agreements')}
                placeholder="Ej: El estudiante se compromete a... (separar por saltos de línea)"
                className="min-h-[100px] bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 resize-none dark:text-white"
              />
              <p className="text-xs text-slate-500">Puede agregar múltiples compromisos separándolos con la tecla Enter.</p>
              {errors.agreements && <p className="text-xs text-red-500 font-medium">{errors.agreements.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Sección 4: Firma Digital */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e1e2d]">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 tracking-wide">
              <Fingerprint className="w-4 h-4 text-primary" /> 
              Firma Digital de Conformidad
            </h2>
            
            <p className="text-xs text-slate-500 mb-2 leading-relaxed">
              El estudiante puede firmar en este recuadro si está presente durante el registro. Esta firma es opcional en este momento pero garantiza el inicio del debido proceso.
            </p>

            <div className="relative bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <SignatureCanvas
                ref={(ref) => setSignatureRef(ref)}
                penColor='currentColor'
                canvasProps={{
                  className: "signature-canvas w-full h-40 cursor-crosshair dark:text-white",
                  style: { width: '100%', height: '160px' }
                }}
                onBegin={() => setHasSignature(true)}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                  <span className="text-sm font-medium text-slate-400">Firmar aquí (Mouse o Táctil)</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 px-3 py-1.5 rounded-lg">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] sm:text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Firma encriptada y protegida con sello de tiempo
                </span>
              </div>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  signatureRef?.clear();
                  setHasSignature(false);
                }}
                className="text-slate-500 hover:text-red-500 text-xs gap-1.5"
                disabled={!hasSignature}
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notificación a padres */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong>Debido proceso:</strong> Al guardar esta anotación, el estudiante será notificado en su plataforma para presentar sus <span className="font-semibold">descargos</span>. Posteriormente, se enviará una notificación a la cuenta del acudiente.
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 shrink-0"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </div>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Registrar
              </>
            )}
          </Button>

          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => {
              setExiting(true);
              setTimeout(() => navigate(-1), 220);
            }}
            className="w-full h-14 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 gap-2 rounded-lg font-semibold tracking-widest text-xs"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
            Cancelar
          </Button>
        </div>
      </form>
    </FormView>
  );
}
