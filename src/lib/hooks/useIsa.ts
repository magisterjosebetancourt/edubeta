import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { saveISARecords, getISARecords } from '../firebase/isa';
import { CreateISARecordParams } from '@/types/isa';
import { toast } from 'sonner';

export function useSaveISA() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ records, idsToDelete }: { records: CreateISARecordParams[], idsToDelete?: string[] }) => 
      saveISARecords(records, idsToDelete),
    onSuccess: () => {
      // Invalidamos para forzar recarga
      queryClient.invalidateQueries({ queryKey: ['isa_records'] });
      toast.success('Registros de seguimiento procesados correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al procesar los registros', { description: error.message });
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
