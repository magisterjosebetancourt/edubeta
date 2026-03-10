import { useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { FormView } from '@/components/ui/FormView'
import { CsvUploader } from '@/components/students/CsvUploader'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/config'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { toast } from 'sonner'

type Grade = { id: string; name: string }

export default function ImportStudentsPage() {
  const navigate = useNavigate()
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'grades'), where('state', '==', true)))
      .then(snap => setGrades(snap.docs.map(d => ({ id: d.id, name: d.data().name }))))
      .catch(e => toast.error('Error al cargar grados', { description: e.message }))
      .finally(() => setLoading(false))
  }, [])


  const handleComplete = () => {
    navigate('/dashboard/students', { replace: true })
  }

  if (loading) return <LoadingSpinner message="Cargando grados..." />;

  return (
    <FormView>
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Carga masiva de estudiantes
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sube un archivo CSV o pega una lista de texto. Formato:{' '}
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              apellido, nombre, grado, barrio (opcional)
            </span>
          </p>
        </div>

        <CsvUploader grades={grades} onComplete={handleComplete} />

      </div>
    </FormView>
  )
}
