import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("¡Bienvenido de nuevo!");
      navigate("/dashboard");
    } catch (error: any) {
      let errorMessage = "Ocurrió un error inesperado";
      let description = "Por favor, intenta de nuevo en unos momentos.";

      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Credenciales incorrectas";
        description = "El correo o la contraseña no son válidos. Verifica tus datos e intenta de nuevo.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Acceso bloqueado";
        description = "Demasiados intentos fallidos. Por seguridad, tu cuenta ha sido bloqueada temporalmente.";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "Cuenta desactivada";
        description = "Esta cuenta ha sido inhabilitada por el administrador. Contacta al soporte técnico.";
      }

      toast.error(errorMessage, {
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-start justify-center min-h-screen bg-[#F3F4F6] px-4 py-4 pt-6 md:pt-8">
      {/* Card Container - White, Shadowed, Rounded */}
      <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-xl p-8 md:p-10 relative overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-2 mb-8">
          {/* Logo Container */}
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-2 text-blue-600">
            <GraduationCap className="w-8 h-8" />
          </div>

          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            EduBeta
          </h1>
          <p className="text-[10px] font-semibold text-blue-600 tracking-widest">
            Por Betasoft
          </p>

          <div className="mt-4 space-y-1">
            <h2 className="text-sm font-medium text-slate-500">
              Transformación educativa
            </h2>
            <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
              Inicia sesión para gestionar la asistencia escolar y acceder a tu
              panel
            </p>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-semibold text-slate-500 ml-1"
            >
              Correo Electrónico
            </Label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@school.edu"
                required
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl focus-visible:ring-blue-500/20 focus-visible:border-blue-500 placeholder:text-slate-300 transition-all font-medium text-sm"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <Label
                htmlFor="password"
                className="text-xs font-semibold text-slate-500"
              >
                Contraseña
              </Label>
              <Link
                to="#"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                className="pl-10 pr-10 h-11 bg-white border-slate-200 rounded-xl focus-visible:ring-blue-500/20 focus-visible:border-blue-500 placeholder:text-slate-300 transition-all font-medium text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2 ml-1">
            <input
              type="checkbox"
              id="remember"
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
            />
            <label
              htmlFor="remember"
              className="text-xs text-slate-500 font-medium cursor-pointer"
            >
              Recordar este dispositivo
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#2C2CFF] hover:bg-[#1f1fe6] text-white rounded-xl shadow-lg shadow-blue-600/20 font-semibold text-sm transition-all transform active:scale-[0.98] group"
            disabled={isLoading}
          >
            {isLoading ? (
              "Iniciando..."
            ) : (
              <span className="flex items-center gap-2">
                Iniciar Sesión
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </Button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-6">
          <p className="text-xs text-slate-500 font-medium">
            ¿No tienes una cuenta? <br className="sm:hidden" />
            <a href="#" className="text-blue-600 font-semibold hover:underline">
              Contacta al Administrador
            </a>
            <br />
            <span className="text-slate-400 font-normal">o</span>
            <br />
            <Link
              to="/registro-docente"
              className="text-blue-600 font-semibold hover:underline"
            >
              Registrar con Código PIN
            </Link>
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex justify-center gap-4 text-[10px] text-slate-400 font-medium">
              <a href="#" className="hover:text-slate-600">
                Política de Privacidad
              </a>
              <a href="#" className="hover:text-slate-600">
                Términos de Servicio
              </a>
              <a href="#" className="hover:text-slate-600">
                Soporte
              </a>
            </div>
            <p className="text-[10px] text-slate-300">
              © 2026 EduBeta Systems by Betasoft. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
