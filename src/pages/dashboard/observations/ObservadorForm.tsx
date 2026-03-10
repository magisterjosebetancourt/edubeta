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
  Fingerprint,
  RotateCcw
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { FormView } from '@/components/ui/FormView';
import { EduButton } from '@/components/ui/EduButton';
import { EduInput } from '@/components/ui/EduInput';
import { EduSelect } from '@/components/ui/EduSelect';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
      navigate('/dashboard/observations');
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
    <FormView>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Contenedor Principal de Datos */}
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header Info Bar */}
          <p className="text-ms text-slate-700 dark:text-slate-300 leading-tight">
            Registro oficial de seguimiento convivencial y pedagógico. Toda anotación debe seguir los principios de objetividad y debido proceso (Ley 1098).
          </p>

          <div className="space-y-8">
            {/* Sección 1: Datos Básicos */}
            <div className="space-y-6">
              <h2 className="text-ms font-semibold text-slate-900 dark:text-white flex items-center gap-2   tracking-wider">
                <Users className="w-4 h-4 text-primary" /> 
                1. Identificación del estudiante
              </h2>
              
              <div className={`grid grid-cols-1 ${isAdminOrCoord ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'} gap-6`}>
                {isAdminOrCoord && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-ms font-semibold text-slate-500 dark:text-slate-400   tracking-tight">Nivel</Label>
                      <EduSelect 
                        value={selectedLevelId}
                        onChange={(e) => {
                          setSelectedLevelId(e.target.value);
                          setSelectedGradeName('');
                          setSelectedGroupId('');
                        }}
                      >
                        <option value="">Todos los niveles</option>
                        {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </EduSelect>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-ms font-semibold text-slate-500 dark:text-slate-400   tracking-tight">Grado</Label>
                      <EduSelect 
                        value={selectedGradeName}
                        onChange={(e) => {
                          setSelectedGradeName(e.target.value);
                          setSelectedGroupId('');
                        }}
                        disabled={!selectedLevelId}
                      >
                        <option value="">Todos los grados</option>
                        {LEVELS.find(l => l.id === selectedLevelId)?.grades.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </EduSelect>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-ms font-semibold text-slate-500 dark:text-slate-400   tracking-tight">Grupo / Curso</Label>
                  <EduSelect 
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    disabled={loadingGrades || loadingAssignments || (isAdminOrCoord && !!selectedLevelId && !selectedGradeName)}
                  >
                    <option value="">{isAdminOrCoord ? 'Todos los grupos' : 'Seleccionar grupo'}</option>
                    {availableGrades.sort((a: any, b: any) => a.name?.localeCompare(b.name || '')).map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </EduSelect>
                </div>

                <div className="space-y-2">
                  <Label className="text-ms font-semibold text-slate-500 dark:text-slate-400   tracking-tight">Estudiante implicado *</Label>
                  <EduSelect 
                    {...register('studentId')}
                    disabled={loadingStudents || (!!selectedGradeName && !selectedGroupId) || students.length === 0}
                    className={errors.studentId ? 'border-red-500' : ''}
                  >
                    <option value="">
                      {students.length === 0 && selectedGroupId 
                        ? "Sin estudiantes matriculados" 
                        : !selectedGroupId 
                          ? "Seleccione grupo primero..." 
                          : "Seleccionar estudiante..."}
                    </option>
                    {students.sort((a: any, b: any) => a.last_name?.localeCompare(b.last_name || '')).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>
                    ))}
                  </EduSelect>
                  {errors.studentId && <p className="text-[10px] text-red-500 font-semibold mt-1  ">{errors.studentId.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-ms font-semibold text-slate-500 dark:text-slate-400 tracking-tight">Fecha de la situación *</Label>
                  <EduInput 
                    type="date"
                    {...register('incidentDate')}
                    className={errors.incidentDate ? 'border-red-500' : ''}
                  />
                  {errors.incidentDate && <p className="text-[10px] text-red-500 font-semibold mt-1  ">{errors.incidentDate.message}</p>}
                </div>
              </div>
            </div>

            {/* Sección 2: Clasificación */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
              <h2 className="text-ms font-semibold text-slate-900 dark:text-white flex items-center gap-2   tracking-wider">
                <ShieldAlert className="w-4 h-4 text-primary" /> 
                2. Clasificación de la situación
              </h2>
              
              <div className="space-y-4">
                <Label className="text-ms text-slate-500 dark:text-slate-400 tracking-tight">Tipo de anotación</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                      {(Object.keys(tipoIcons) as ObservationType[]).map((type) => (
                        <div key={type} className="relative">
                          <RadioGroupItem value={type} id={`type-${type}`} className="peer sr-only" />
                          <label 
                            htmlFor={`type-${type}`}
                            className="flex items-center gap-3 p-3 border-2 border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 dark:peer-data-[state=checked]:bg-primary/10 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            {tipoIcons[type]}
                            <span className="text-ms font-semibold text-slate-700 dark:text-slate-200   tracking-tight">{type}</span>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                />
              </div>

              {selectedType === 'Disciplinaria' && (
                <div className="space-y-4 p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl">
                  <Label className="text-ms font-semibold text-amber-900 dark:text-amber-400 flex items-center gap-2  ">
                    <ShieldAlert className="w-4 h-4" />
                    Ruta de Atención Integral (Ley 1620)
                  </Label>
                  <Controller
                    name="law1620Category"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        className="flex flex-col gap-4"
                      >
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="Tipo I" id="t1" className="mt-1" />
                          <label htmlFor="t1" className="text-ms font-medium text-slate-700 dark:text-slate-300 leading-normal">
                            <span className="font-semibold block mb-1   tracking-tight">Situación Tipo I</span>
                            Conflictos manejables intraescolarmente. No generan daño al cuerpo o a la salud.
                          </label>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="Tipo II" id="t2" className="mt-1" />
                          <label htmlFor="t2" className="text-ms font-medium text-slate-700 dark:text-slate-300 leading-normal">
                            <span className="font-semibold block mb-1   tracking-tight">Situación Tipo II</span>
                            Agresión escolar, acoso (bullying) o ciberacoso. Daño físico o psicológico que no requiere atención médica.
                          </label>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="Tipo III" id="t3" className="mt-1" />
                          <label htmlFor="t3" className="text-ms font-medium text-slate-700 dark:text-slate-300 leading-normal">
                            <span className="font-semibold block text-red-600 dark:text-red-400 mb-1   tracking-tight">Situación Tipo III (Delito)</span>
                            Presuntos delitos contra la libertad, integridad o formación sexual. Requiere denuncia a ICBF / Policía de Infancia.
                          </label>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Sección 3: Descripción y Compromisos */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
              <h2 className="text-ms text-slate-900 dark:text-white flex items-center gap-2   tracking-wider">
                <ClipboardList className="w-4 h-4 text-primary" /> 
                3. Relato de los hechos y compromisos
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-ms text-slate-500 dark:text-slate-400   tracking-tight">
                    Descripción Objetiva (¿Qué, cómo, cuándo y dónde pasó?)
                  </Label>
                  <Textarea 
                    {...register('description')}
                    placeholder="Redacte de forma neutral lo sucedido..."
                    className="min-h-[120px] bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 resize-none dark:text-white text-ms"
                  />
                  {errors.description && <p className="text-[10px] text-red-500 font-semibold mt-1  ">{errors.description.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-ms text-slate-500 dark:text-slate-400   tracking-tight">
                    Acción Adelantada (¿Qué medidas se tomaron inicialmente?) *
                  </Label>
                  <Textarea 
                    {...register('actionTaken')}
                    placeholder="Ej: Diálogo con el estudiante, citación inmediata..."
                    className="min-h-[120px] bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 resize-none dark:text-white text-ms"
                  />
                  {errors.actionTaken && <p className="text-[10px] text-red-500 font-semibold mt-1  ">{errors.actionTaken.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-ms text-slate-500 dark:text-slate-400   tracking-tight">
                    Sugerencias de mejora / Recomendaciones *
                  </Label>
                  <Textarea 
                    {...register('suggestions')}
                    placeholder="Indique acciones preventivas o de mejora..."
                    className="min-h-[100px] bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 resize-none dark:text-white text-ms"
                  />
                  {errors.suggestions && <p className="text-[10px] text-red-500 font-semibold mt-1  ">{errors.suggestions.message}</p>}
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-ms text-slate-500 dark:text-slate-400   tracking-tight">
                      Estado de los compromisos *
                    </Label>
                    <EduSelect {...register('commitmentStatus')}>
                      <option value="Iniciada">Iniciada</option>
                      <option value="En evaluación">En evaluación</option>
                      <option value="Finalizada">Finalizada</option>
                    </EduSelect>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-ms text-slate-500 dark:text-slate-400   tracking-tight">
                      Acuerdos y Compromisos Alcanzados *
                    </Label>
                    <Textarea 
                      {...register('agreements')}
                      placeholder="Ej: El estudiante se compromete a... (separar por saltos de línea)"
                      className="min-h-[80px] bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 resize-none dark:text-white text-ms"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Use 'Enter' para múltiples compromisos.</p>
                    {errors.agreements && <p className="text-[10px] text-red-500 mt-1 ">{errors.agreements.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 4: Firma Digital */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <h2 className="text-ms font-semibold text-slate-900 dark:text-white flex items-center gap-2   tracking-wider">
                <Fingerprint className="w-4 h-4 text-primary" /> 
                4. Firma Digital de Conformidad
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
                <div className="space-y-4">
                  <p className="text-ms text-slate-500 leading-relaxed font-medium py-2">
                    El estudiante puede firmar en este recuadro si está presente durante el registro. Esta firma es opcional en este momento pero garantiza el inicio del debido proceso convivencial.
                  </p>
                </div>

                <div className="relative bg-white dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
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
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <span className="text-ms text-slate-400   tracking-widest">ESPACIO PARA FIRMA</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 px-3 py-2 rounded-lg flex-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 tracking-tight">
                        Firma encriptada y protegida
                      </span>
                    </div>
                    
                    <EduButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        signatureRef?.clear();
                        setHasSignature(false);
                      }}
                      disabled={!hasSignature}
                      icon={RotateCcw}
                      fullWidth={true}
                    >
                      Reiniciar firma
                    </EduButton>
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notificación y Acción Final (Diseño Padre de Listas) */}
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-4 rounded-xl flex items-start gap-3 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="text-ms text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              <span className="text-amber-700 dark:text-amber-500  ">Debido proceso:</span> Al guardar esta anotación, el estudiante será notificado para presentar sus descargos según el Manual de Convivencia.
            </div>
          </div>

          <EduButton 
            type="submit" 
            disabled={isSubmitting}
            icon={Save}
            fullWidth
          >
            {isSubmitting ? 'Registrando...' : 'Registrar caso en el observador'}
          </EduButton>
        </div>
      </form>
    </FormView>
  );
}
