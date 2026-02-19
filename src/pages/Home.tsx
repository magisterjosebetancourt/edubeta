import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Aquí podríamos verificar sesión, por ahora redirigimos al login
    navigate('/login')
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirigiendo...</p>
    </div>
  )
}
