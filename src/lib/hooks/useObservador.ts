import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getObservationsByStudent, 
  getAllObservations,
  getObservationById, 
  createObservation, 
  updateObservation, 
  saveStudentDefense 
} from '../firebase/observador';
import { CreateObservationParams, UpdateObservationParams } from '../../types/observador';

// Keys para React Query
export const OBSERVADOR_KEYS = {
  all: ['observations'] as const,
  lists: () => [...OBSERVADOR_KEYS.all, 'list'] as const,
  listByStudent: (studentId: string) => [...OBSERVADOR_KEYS.lists(), { studentId }] as const,
  details: () => [...OBSERVADOR_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...OBSERVADOR_KEYS.details(), id] as const,
};

/**
 * Obtiene todas las anotaciones de un alumno en específico.
 */
export function useObservationsList(studentId: string) {
  return useQuery({
    queryKey: OBSERVADOR_KEYS.listByStudent(studentId),
    queryFn: () => getObservationsByStudent(studentId),
    enabled: !!studentId,
  });
}

/**
 * Obtiene todas las anotaciones a nivel institucional (útil para coordinadores).
 */
export function useAllObservationsList() {
  return useQuery({
    queryKey: OBSERVADOR_KEYS.lists(),
    queryFn: () => getAllObservations(),
  });
}

/**
 * Detalle individual.
 */
export function useObservationDetail(id: string) {
  return useQuery({
    queryKey: OBSERVADOR_KEYS.detail(id),
    queryFn: () => getObservationById(id),
    enabled: !!id,
  });
}

/**
 * Mutaciones
 */
export function useCreateObservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newObs: CreateObservationParams) => createObservation(newObs),
    onSuccess: (data) => {
      // Invalidate both the student's list and the global list
      queryClient.invalidateQueries({ queryKey: OBSERVADOR_KEYS.listByStudent(data.studentId) });
      queryClient.invalidateQueries({ queryKey: OBSERVADOR_KEYS.lists() });
    },
  });
}

export function useUpdateObservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, params, studentId }: { id: string, params: UpdateObservationParams, studentId: string }) => 
      updateObservation(id, params)
        .then(() => ({ id, studentId })), // Pasar de vuelta para invalidar caché preciso
    onSuccess: ({ id, studentId }) => {
      queryClient.invalidateQueries({ queryKey: OBSERVADOR_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: OBSERVADOR_KEYS.listByStudent(studentId) });
      queryClient.invalidateQueries({ queryKey: OBSERVADOR_KEYS.lists() });
    },
  });
}

export function useSaveStudentDefense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, defense, signatureDataUrl, studentId }: { id: string, defense: string, signatureDataUrl: string, studentId: string }) => 
      saveStudentDefense(id, defense, signatureDataUrl)
        .then(() => ({ id, studentId })),
    onSuccess: ({ id, studentId }) => {
      queryClient.invalidateQueries({ queryKey: OBSERVADOR_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: OBSERVADOR_KEYS.listByStudent(studentId) });
      queryClient.invalidateQueries({ queryKey: OBSERVADOR_KEYS.lists() });
    },
  });
}
