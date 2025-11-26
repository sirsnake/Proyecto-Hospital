import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authAPI } from "@/lib/api"
import { setSession, getRoleDashboardPath } from "@/lib/auth"
import { Activity } from "lucide-react"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await authAPI.login(email, password)
      setSession(response.user)
      navigate(getRoleDashboardPath(response.user.rol))
    } catch (err: any) {
      setError(err.message || "Credenciales inválidas. Por favor, verifica tu email y contraseña.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-emerald-600 rounded-xl">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Hospital</h1>
            <p className="text-sm text-slate-400">Sistema de Urgencias</p>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-white">Iniciar Sesión</CardTitle>
            <CardDescription className="text-slate-400">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@salud.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700" 
                disabled={loading}
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm font-medium text-white mb-2">Usuarios de prueba:</p>
              <div className="space-y-1 text-xs text-slate-400">
                <p><strong className="text-slate-300">Paramédico:</strong> paramedico@salud.cl / para123</p>
                <p><strong className="text-slate-300">TENS:</strong> tens@salud.cl / tens123</p>
                <p><strong className="text-slate-300">Médico:</strong> medico@salud.cl / medico123</p>
                <p><strong className="text-slate-300">Admin:</strong> admin@salud.cl / admin123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
