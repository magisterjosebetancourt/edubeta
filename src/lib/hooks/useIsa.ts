import { useMutation, useQuery } from '@tanstack/react-query';
import { saveISARecords, getISARecords } from '../firebase/isa';
import { CreateISARecordParams } from '@/types/isa';
import { toast } from 'sonner';

export function useSaveISA() {
  return useMutation({
    mutationFn: (records: CreateISARecordParams[]) => saveISARecords(records),
    onSuccess: () => {
      toast.success('Registros de seguimiento guardados correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al guardar los registros', { description: error.message });
    }
  });
}

export function useISARecords(gradeId: string, subjectId: string, periodId: string) {
  return useQuery({
    queryKey: ['isa_records', gradeId, subjectId, periodId],
    queryFn: () => getISARecords(gradeId, subjectId, periodId),
    enabled: !!gradeId && !!subjectId && !!periodId,
  });
}
