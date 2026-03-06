import { useState } from 'react'
import { auth, db } from '@/lib/firebase/config'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { GraduationCap, ArrowRight, Loader2, CheckCircle } from 'lucide-react'

export default function TeacherRegister() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const token = formData.get('token') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
        toast.error('Las contraseñas no coinciden')
        setLoading(false)
        return
    }

    if (password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres')
        setLoading(false)
        return
    }

    try {
        // 1. Verify invitation token
        const q = query(
            collection(db, "teacher_invites"), 
            where("email", "==", email), 
            where("token", "==", token)
        );
        const inviteSnap = await getDocs(q);
        
        if (inviteSnap.empty) {
            toast.error('Código de invitación o correo inválido');
            setLoading(false);
            return;
        }

        const inviteData = inviteSnap.docs[0].data();
        const inviteDocId = inviteSnap.docs[0].id;

        // 2. Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 3. Create Profile in Firestore
        await setDoc(doc(db, "profiles", user.uid), {
            full_name: inviteData.full_name || email.split('@')[0],
            email: email,
            role: 'teacher',
            state: true,
            created_at: serverTimestamp()
        });

        // 4. Delete Invitation
        await deleteDoc(doc(db, "teacher_invites", inviteDocId));

        setSuccess(true)
        toast.success('Cuenta creada exitosamente')
        setTimeout(() => navigate('/login'), 3000)
    } catch (error: any) {
        console.error("Register Error:", error);
        toast.error('Error en el registro', { description: error.message })
    } finally {
        setLoading(false)
    }
  }

  if (success) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <Card className="w-full max-w-md border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                <CardContent className="pt-6 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center text-green-600 dark:text-green-300">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-semibold text-green-800 dark:text-green-300">¡Registro Exitoso!</h2>
                    <p className="text-green-700 dark:text-green-400">
                        Tu cuenta de docente ha sido creada. Redirigiendo al inicio de sesión...
                    </p>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => navigate('/login')}>
                        Ir al Login ahora
                    </Button>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-2">
           <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
               <GraduationCap className="w-6 h-6" />
           </div>
           <CardTitle className="text-2xl font-semibold">Registro Docente</CardTitle>
           <CardDescription>
               Ingresa tu código de invitación para crear tu cuenta.
           </CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Correo Institucional</Label>
                    <Input id="email" name="email" type="email" placeholder="tucorreo@edubeta.com" required disabled={loading} />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="token">Código de Invitación (PIN)</Label>
                    <Input 
                        id="token" 
                        name="token" 
                        placeholder="Ej. 12345" 
                        className="font-mono tracking-widest text-center text-lg" 
                        maxLength={5}
                        required 
                        disabled={loading}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Crear Contraseña</Label>
                    <Input id="password" name="password" type="password" placeholder="******" required disabled={loading} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="******" required disabled={loading} />
                </div>

                <Button type="submit" className="w-full mt-4" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                    {loading ? 'Validando...' : 'Crear Cuenta'}
                </Button>
            </form>
        </CardContent>
        <CardFooter className="justify-center border-t bg-slate-50/50 dark:bg-slate-900/50 p-4">
            <p className="text-sm text-slate-500">
                ¿Ya tienes cuenta? <Link to="/login" className="text-primary font-medium hover:underline">Inicia Sesión</Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  )
}
