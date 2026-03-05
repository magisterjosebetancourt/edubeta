import { useMutation } from '@tanstack/react-query';
import { saveISARecords } from '../firebase/isa';
import { CreateISARecordParams } from '@/types/isa';
import { toast } from 'sonner';

export function useSaveISA() {
  return useMutation({
    mutationFn: (records: CreateISARecordParams[]) => saveISARecords(records),
    onSuccess: () => {
      // Opcionalmente invalidar queries si tuviéramos una lista de historial ISA
      // queryClient.invalidateQueries({ queryKey: ['isa_records'] });
      toast.success('Registros de seguimiento guardados correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al guardar los registros', { description: error.message });
    }
  });
}
