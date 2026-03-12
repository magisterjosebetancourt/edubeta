import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore'
import { useUserProfile } from '@/lib/context/UserProfileContext'
import { Bell, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function NotificationsPage() {
  const { firebaseUser } = useUserProfile()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!firebaseUser) return
    const fetchNotifs = async () => {
      try {
        const q = query(
          collection(db, "notifications"), 
          where("user_id", "==", firebaseUser.uid),
          orderBy("createdAt", "desc")
        )
        const snap = await getDocs(q)
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifs()
  }, [firebaseUser])

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (e) {
      toast.error('Error al marcar como leída')
    }
  }

  if (loading) return <LoadingSpinner message="Cargando alertas..." />

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark p-4 max-w-2xl mx-auto w-full pb-24">
      <header className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aquí puedes visualizar y gestionar las notificaciones de la institución.
        </p>
        <div className="mt-4 inline-flex bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
          {notifications.filter(n => !n.read).length} pendientes
        </div>
      </header>

      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map(notif => (
            <div key={notif.id} 
              className={`p-4 rounded-2xl border transition-all shadow-sm ${
                notif.read ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-70' : 'bg-white dark:bg-slate-900 border-primary/20 ring-1 ring-primary/5 shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl ${
                  notif.type === 'alert' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                }`}>
                  {notif.type === 'alert' ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{notif.title}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {notif.createdAt ? format(notif.createdAt.toDate(), 'HH:mm', { locale: es }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  
                  <div className="mt-4 flex items-center justify-between">
                    {!notif.read && (
                      <button onClick={() => markAsRead(notif.id)} className="text-[10px] font-black text-primary tracking-widest hover:underline">
                        Marcar como leída
                      </button>
                    )}
                    {notif.link && (
                      <button onClick={() => navigate(notif.link)} className="flex items-center gap-1 text-[10px] font-black text-slate-400 tracking-widest hover:text-primary transition-colors">
                        Ver detalles <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
             <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-slate-300" />
             </div>
             <p className="text-slate-500 font-bold tracking-widest text-xs">No tienes alertas nuevas</p>
             <p className="text-[10px] text-slate-400 mt-1">Todo está en orden por aquí.</p>
          </div>
        )}
      </div>
    </div>
  )
}
