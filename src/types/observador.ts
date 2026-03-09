export type ObservationType = 'Academica' | 'Disciplinaria' | 'Formativa' | 'Reconocimiento Positivo';
export type Law1620Category = 'Tipo I' | 'Tipo II' | 'Tipo III' | 'No Aplica';
export type ObservationStatus = 'Abierto' | 'En proceso' | 'Cerrado';

export interface StudentObservation {
  id: string;                      // ID del documento en Firestore
  studentId: string;               // Referencia al ID del estudiante
  studentName?: string;            // Nombre denormalizado del estudiante
  createdBy: string;               // ID del docente, coordinador o admin que lo creó
  creatorName: string;             // Nombre parcial denormalizado para UI rápida
  date: string;                    // Fecha en formato ISO (o serializado para UI)
  type: ObservationType;
  law1620Category: Law1620Category;
  
  description: string;             // Relato objetivo de los hechos
  agreements: string[];            // Acuerdos y compromisos a los que se llega
  
  actionTaken?: string;            // Acción adelantada
  suggestions?: string;            // Sugerencias
  commitmentStatus: 'Iniciada' | 'En evaluación' | 'Finalizada'; // Compromiso y seguimiento
  
  // Ley 1098 - Descargos
  studentDefense?: string;         // Versión libre del estudiante
  studentSignatureDataUrl?: string; // Firma capturada en el canvas (Base64)
  studentDefenseDate?: string;     // Cuándo llenó el estudiante la defensa

  status: ObservationStatus;

  // Firma Digital Inicial (opcional en la creación)
  initialSignatureDataUrl?: string; // Firma capturada en el canvas (Base64)
  initialSignatureDate?: string;    // Fecha y hora de la firma

  // Notificaciones o registros de contacto a padres
  notificationsSent: {
    parentsApp?: boolean;          // ¿Se mandó la notificación a la app de padres?
    whatsappAdmins?: boolean;      // ¿Se notificó al comité / coord por WhatsApp?
  };
  
  createdAt: string;
  updatedAt: string;
}

export type CreateObservationParams = Omit<StudentObservation, 'id' | 'createdAt' | 'updatedAt' | 'notificationsSent'>;
export type UpdateObservationParams = Partial<Omit<StudentObservation, 'id' | 'createdAt' | 'updatedAt'>>;
