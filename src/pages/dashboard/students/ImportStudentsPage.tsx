import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { CsvUploader } from '@/components/students/CsvUploader'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/config'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { toast } from 'sonner'
import { X } from 'lucide-react'

type Grade = { id: string; name: string }

export default function ImportStudentsPage() {
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'grades'), where('state', '==', true)))
      .then(snap => setGrades(snap.docs.map(d => ({ id: d.id, name: d.data().name }))))
      .catch(e => toast.error('Error al cargar grados', { description: e.message }))
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 200)
  }

  const handleComplete = () => {
    setExiting(true)
    setTimeout(() => navigate('/dashboard/students', { replace: true }), 200)
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Cargando grados...</div>

  return (
    <FormView exiting={exiting}>
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

        {/* Botón Cancelar — patrón estándar FormView */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          className="w-full rounded-lg h-auto py-3.5 px-6 font-semibold text-sm
            text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700
            hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <X className="w-4 h-4 mr-1.5" />
          Cancelar
        </Button>
      </div>
    </FormView>
  )
}
