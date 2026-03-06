export interface ISAIndicator {
  id: 'I1' | 'I2' | 'I3';
  label: string;
  description: string;
}

export const ISA_INDICATORS: ISAIndicator[] = [
  {
    id: 'I1',
    label: 'PPTE',
    description: 'Producción y Presentación de Trabajo Escolares'
  },
  {
    id: 'I2',
    label: 'DEAC',
    description: 'Desempeño en Evaluaciones y Aplicación de Conocimiento'
  },
  {
    id: 'I3',
    label: 'ARTC',
    description: 'Actitud, Responsabilidad y Trabajo en Equipo'
  }
];

export interface ISARecord {
  id: string;
  student_id: string;
  student_full_name: string;
  student_last_name: string;
  student_first_name: string;
  student_avatar_url?: string;
  grade_id: string;
  teacher_id: string;
  subject_id: string; 
  period_id: string;  
  date: string; // ISO format YYYY-MM-DD
  i1: boolean;
  i2: boolean;
  i3: boolean;
  created_at: any;
  updated_at: any;
}

export type CreateISARecordParams = Omit<ISARecord, 'id' | 'created_at' | 'updated_at'>;
