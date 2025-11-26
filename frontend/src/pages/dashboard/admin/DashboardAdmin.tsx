import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getSession, clearSession, type User } from "@/lib/auth"
import { authAPI, usuariosAPI, auditLogsAPI, fichasAPI, pacientesAPI, solicitudesMedicamentosAPI, configuracionAPI, camasAPI } from "@/lib/api"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { 
  Building2, 
  Bed, 
  Clock, 
  Users, 
  AlertTriangle,
  Settings,
  Save,
  RotateCcw,
  Shield,
  FileText,
  Activity,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  LogOut,
  Lightbulb,
  Hospital,
  Pill,
  Check,
  X,
  Eye,
  Wrench,
  Sparkles,
  Timer,
  Ambulance,
  HeartPulse,
  Siren,
  ClipboardList
} from "lucide-react"

export default function AdministradorDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  
  // Estados para dashboard
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [fichasActivas, setFichasActivas] = useState<any[]>([])
  const [fichasAtendidas, setFichasAtendidas] = useState<any[]>([])
  const [pacientesTotal, setPacientesTotal] = useState(0)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<any[]>([])
  const [tiempoEsperaPromedio, setTiempoEsperaPromedio] = useState(0)
  
  // Estados para camas
  const [camas, setCamas] = useState<any[]>([])
  const [estadisticasCamas, setEstadisticasCamas] = useState<any>(null)
  const [camasLoading, setCamasLoading] = useState(false)
  const [filtroCamaEstado, setFiltroCamaEstado] = useState("all")
  const [filtroCamaTipo, setFiltroCamaTipo] = useState("all")
  
  // Estados para solicitudes de medicamentos
  const [solicitudesLoading, setSolicitudesLoading] = useState(false)
  const [modalSolicitudOpen, setModalSolicitudOpen] = useState(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null)
  const [respuestaSolicitud, setRespuestaSolicitud] = useState("")
  
  // Estados para usuarios
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [usuariosLoading, setUsuariosLoading] = useState(false)
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null)
  const [filtroRol, setFiltroRol] = useState("all")
  const [busqueda, setBusqueda] = useState("")
  
  // Estados para logs
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [resumenLogs, setResumenLogs] = useState<any>(null)
  const [filtroAccion, setFiltroAccion] = useState("all")
  const [filtroModelo, setFiltroModelo] = useState("all")
  
  // Estados para configuración
  const [camasTotales, setCamasTotales] = useState(50)
  const [camasUCI, setCamasUCI] = useState(10)
  const [salasEmergencia, setSalasEmergencia] = useState(5)
  const [boxesAtencion, setBoxesAtencion] = useState(15)
  const [, setConfigId] = useState<number | null>(null)
  
  // Formulario de usuario
  const [formUsuario, setFormUsuario] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    rut: "",
    rol: "",
    telefono: "",
    especialidad: "",
    registro_profesional: "",
  })

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "administrador") {
      navigate("/")
      return
    }
    setUser(currentUser)
    cargarDashboard()
    cargarConfiguracion()
  }, [navigate])

  const cargarDashboard = async () => {
    try {
      // Cargar estadísticas de usuarios
      const statsUsuarios = await usuariosAPI.estadisticas()
      setEstadisticas(statsUsuarios)
      
      // Cargar fichas activas
      const fichasResponse = await fichasAPI.enHospital()
      const fichasArray = Array.isArray(fichasResponse) ? fichasResponse : []
      setFichasActivas(fichasArray)
      
      // Cargar fichas atendidas
      const fichasAtendidasResponse = await fichasAPI.atendidas()
      const fichasAtendidasArray = Array.isArray(fichasAtendidasResponse) ? fichasAtendidasResponse : []
      setFichasAtendidas(fichasAtendidasArray)
      
      // Cargar solicitudes pendientes
      const solicitudesResponse = await solicitudesMedicamentosAPI.pendientes()
      const solicitudesArray = Array.isArray(solicitudesResponse) ? solicitudesResponse : []
      setSolicitudesPendientes(solicitudesArray)
      
      // Cargar estadísticas de camas
      try {
        const camasStats = await camasAPI.estadisticas()
        setEstadisticasCamas(camasStats)
      } catch {
        setEstadisticasCamas(null)
      }
      
      // Cargar pacientes
      const pacientesResponse = await pacientesAPI.listar()
      const pacientesArray = pacientesResponse.results || pacientesResponse || []
      setPacientesTotal(pacientesArray.length)
      
      // Calcular tiempo de espera promedio basado en fichas reales
      if (fichasAtendidasArray.length > 0) {
        let totalMinutos = 0
        let conteo = 0
        fichasAtendidasArray.forEach((ficha: any) => {
          if (ficha.fecha_llegada && ficha.fecha_atencion) {
            const llegada = new Date(ficha.fecha_llegada).getTime()
            const atencion = new Date(ficha.fecha_atencion).getTime()
            const minutos = Math.round((atencion - llegada) / 60000)
            if (minutos > 0 && minutos < 480) { // máximo 8 horas
              totalMinutos += minutos
              conteo++
            }
          }
        })
        setTiempoEsperaPromedio(conteo > 0 ? Math.round(totalMinutos / conteo) : 0)
      }
      
      // Cargar resumen de logs
      try {
        const resumen = await auditLogsAPI.resumen()
        setResumenLogs(resumen)
      } catch {
        setResumenLogs({ total_acciones_hoy: 0, ultimas_acciones: [] })
      }
      
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    }
  }

  const cargarCamas = async () => {
    try {
      setCamasLoading(true)
      const filtros: any = {}
      if (filtroCamaEstado !== 'all') filtros.estado = filtroCamaEstado
      if (filtroCamaTipo !== 'all') filtros.tipo = filtroCamaTipo
      
      const response = await camasAPI.listar(filtros)
      setCamas(Array.isArray(response) ? response : response.results || [])
      
      // También actualizar estadísticas
      const stats = await camasAPI.estadisticas()
      setEstadisticasCamas(stats)
    } catch (error) {
      console.error('Error cargando camas:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las camas",
        variant: "destructive",
      })
    } finally {
      setCamasLoading(false)
    }
  }

  const cargarSolicitudesPendientes = async () => {
    try {
      setSolicitudesLoading(true)
      const response = await solicitudesMedicamentosAPI.pendientes()
      setSolicitudesPendientes(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('Error cargando solicitudes:', error)
    } finally {
      setSolicitudesLoading(false)
    }
  }

  const handleAutorizarSolicitud = async (id: number) => {
    try {
      await solicitudesMedicamentosAPI.autorizar(id, respuestaSolicitud || 'Autorizado por administrador')
      toast({
        title: "Solicitud autorizada",
        description: "El medicamento ha sido autorizado para su dispensación",
      })
      setModalSolicitudOpen(false)
      setSolicitudSeleccionada(null)
      setRespuestaSolicitud("")
      cargarSolicitudesPendientes()
      cargarDashboard()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo autorizar la solicitud",
        variant: "destructive",
      })
    }
  }

  const handleRechazarSolicitud = async (id: number) => {
    if (!respuestaSolicitud.trim()) {
      toast({
        title: "Error",
        description: "Debe indicar un motivo para rechazar la solicitud",
        variant: "destructive",
      })
      return
    }
    try {
      await solicitudesMedicamentosAPI.rechazar(id, respuestaSolicitud)
      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada",
      })
      setModalSolicitudOpen(false)
      setSolicitudSeleccionada(null)
      setRespuestaSolicitud("")
      cargarSolicitudesPendientes()
      cargarDashboard()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo rechazar la solicitud",
        variant: "destructive",
      })
    }
  }

  const handleCambiarEstadoCama = async (id: number, nuevoEstado: string) => {
    try {
      await camasAPI.cambiarEstado(id, nuevoEstado)
      toast({
        title: "Estado actualizado",
        description: `La cama ahora está en estado: ${nuevoEstado}`,
      })
      cargarCamas()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar el estado",
        variant: "destructive",
      })
    }
  }

  const cargarUsuarios = async () => {
    try {
      setUsuariosLoading(true)
      const params: any = {}
      if (filtroRol && filtroRol !== 'all') params.rol = filtroRol
      if (busqueda) params.search = busqueda
      
      const response = await usuariosAPI.listar(params)
      setUsuarios(response.results || response || [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      })
    } finally {
      setUsuariosLoading(false)
    }
  }

  const cargarLogs = async () => {
    try {
      setLogsLoading(true)
      const params: any = {}
      if (filtroAccion && filtroAccion !== 'all') params.accion = filtroAccion
      if (filtroModelo && filtroModelo !== 'all') params.modelo = filtroModelo
      
      const response = await auditLogsAPI.listar(params)
      setLogs(response.results || response || [])
    } catch (error) {
      console.error('Error cargando logs:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los logs",
        variant: "destructive",
      })
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "usuarios") {
      cargarUsuarios()
    } else if (activeTab === "logs") {
      cargarLogs()
    } else if (activeTab === "camas") {
      cargarCamas()
    } else if (activeTab === "medicamentos") {
      cargarSolicitudesPendientes()
    }
  }, [activeTab, filtroRol, busqueda, filtroAccion, filtroModelo, filtroCamaEstado, filtroCamaTipo])

  const handleGuardarUsuario = async () => {
    try {
      if (usuarioSeleccionado) {
        await usuariosAPI.actualizar(usuarioSeleccionado.id, formUsuario)
        toast({
          title: "Usuario actualizado",
          description: "El usuario ha sido actualizado correctamente",
        })
      } else {
        await usuariosAPI.crear(formUsuario)
        toast({
          title: "Usuario creado",
          description: "El usuario ha sido creado correctamente",
        })
      }
      setModalUsuarioOpen(false)
      cargarUsuarios()
      limpiarFormulario()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el usuario",
        variant: "destructive",
      })
    }
  }

  const handleEliminarUsuario = async (id: number) => {
    if (!confirm("¿Estás seguro de desactivar este usuario?")) return
    
    try {
      await usuariosAPI.eliminar(id)
      toast({
        title: "Usuario desactivado",
        description: "El usuario ha sido desactivado correctamente",
      })
      cargarUsuarios()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo desactivar el usuario",
        variant: "destructive",
      })
    }
  }

  const abrirModalUsuario = (usuario?: any) => {
    if (usuario) {
      setUsuarioSeleccionado(usuario)
      setFormUsuario({
        username: usuario.username || "",
        email: usuario.email || "",
        password: "",
        first_name: usuario.first_name || "",
        last_name: usuario.last_name || "",
        rut: usuario.rut || "",
        rol: usuario.rol || "",
        telefono: usuario.telefono || "",
        especialidad: usuario.especialidad || "",
        registro_profesional: usuario.registro_profesional || "",
      })
    } else {
      limpiarFormulario()
    }
    setModalUsuarioOpen(true)
  }

  const limpiarFormulario = () => {
    setUsuarioSeleccionado(null)
    setFormUsuario({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      rut: "",
      rol: "",
      telefono: "",
      especialidad: "",
      registro_profesional: "",
    })
  }

  const cargarConfiguracion = async () => {
    try {
      const config = await configuracionAPI.actual()
      setCamasTotales(config.camas_totales)
      setCamasUCI(config.camas_uci)
      setSalasEmergencia(config.salas_emergencia)
      setBoxesAtencion(config.boxes_atencion)
      setConfigId(config.id)
    } catch (error) {
      console.error('Error cargando configuración:', error)
    }
  }

  const handleGuardarConfiguracion = async () => {
    try {
      await configuracionAPI.actualizar({
        camas_totales: camasTotales,
        camas_uci: camasUCI,
        salas_emergencia: salasEmergencia,
        boxes_atencion: boxesAtencion,
      })
      toast({
        title: "Configuración guardada",
        description: "Los cambios han sido guardados correctamente",
      })
      cargarConfiguracion()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      })
    }
  }

  const handleRestaurarConfiguracion = async () => {
    try {
      await configuracionAPI.actualizar({
        camas_totales: 50,
        camas_uci: 10,
        salas_emergencia: 5,
        boxes_atencion: 15,
      })
      toast({
        title: "Valores restaurados",
        description: "Se han restaurado los valores predeterminados",
      })
      cargarConfiguracion()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo restaurar la configuración",
        variant: "destructive",
      })
    }
  }

  const handleCerrarSesion = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      clearSession()
      navigate("/")
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
              <p className="text-sm text-slate-400">Sistema de Gestión Hospitalaria</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user.nombre_completo || `${user.first_name} ${user.last_name}`}</p>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                Administrador
              </Badge>
            </div>
            <Button onClick={handleCerrarSesion} variant="outline" className="border-slate-700">
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-[1200px]">
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="medicamentos" className="flex items-center gap-1">
              <Pill className="w-4 h-4" />
              Medicamentos
              {solicitudesPendientes.length > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5">{solicitudesPendientes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="camas" className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              Camas
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="reportes" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Reportes
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Auditoría
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-1">
              <Settings className="w-4 h-4" />
              Config
            </TabsTrigger>
          </TabsList>

          {/* Tab: Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Alerta de pacientes críticos */}
            {fichasActivas.filter((f: any) => f.prioridad === 'C1' || f.prioridad === 'C2').length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Siren className="w-6 h-6 text-red-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-400">Pacientes Críticos en Urgencias</h3>
                  <p className="text-sm text-slate-400">
                    {fichasActivas.filter((f: any) => f.prioridad === 'C1').length} pacientes C1 (urgencia vital) y{' '}
                    {fichasActivas.filter((f: any) => f.prioridad === 'C2').length} pacientes C2 (riesgo vital)
                  </p>
                </div>
                <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  Ver pacientes
                </Button>
              </div>
            )}

            {/* Métricas principales */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <StatCard
                title="En Urgencias"
                value={String(fichasActivas.length)}
                icon={<HeartPulse className="w-5 h-5 text-red-400" />}
                description="Pacientes activos"
              />
              <StatCard
                title="Ocupación Camas"
                value={estadisticasCamas ? `${estadisticasCamas.porcentaje_ocupacion}%` : '--'}
                icon={<Bed className="w-5 h-5 text-blue-400" />}
                description={estadisticasCamas ? `${estadisticasCamas.ocupadas}/${estadisticasCamas.total}` : 'Cargando...'}
              />
              <StatCard
                title="Espera Promedio"
                value={tiempoEsperaPromedio ? `${tiempoEsperaPromedio} min` : '--'}
                icon={<Timer className="w-5 h-5 text-orange-400" />}
                description="Tiempo de atención"
              />
              <StatCard
                title="Solicitudes"
                value={String(solicitudesPendientes.length)}
                icon={<Pill className="w-5 h-5 text-purple-400" />}
                description="Medicamentos pendientes"
                trend={solicitudesPendientes.length > 5 ? { value: "Atención requerida", isPositive: false } : undefined}
              />
              <StatCard
                title="Atendidos Hoy"
                value={String(fichasAtendidas.length)}
                icon={<UserCheck className="w-5 h-5 text-green-400" />}
                description="Pacientes dados de alta"
              />
              <StatCard
                title="Personal"
                value={String(estadisticas?.total_usuarios || 0)}
                icon={<Users className="w-5 h-5 text-cyan-400" />}
                description={`${Object.values(estadisticas?.usuarios_por_rol || {}).reduce((a: number, b: any) => a + b, 0)} activos`}
              />
            </div>

            {/* Distribución por prioridad */}
            <div className="grid gap-6 md:grid-cols-4">
              <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">C1 - Urgencia Vital</p>
                      <p className="text-3xl font-bold text-red-400">
                        {fichasActivas.filter((f: any) => f.prioridad === 'C1').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Siren className="w-6 h-6 text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">C2 - Riesgo Vital</p>
                      <p className="text-3xl font-bold text-orange-400">
                        {fichasActivas.filter((f: any) => f.prioridad === 'C2').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">C3 - Urgente</p>
                      <p className="text-3xl font-bold text-yellow-400">
                        {fichasActivas.filter((f: any) => f.prioridad === 'C3').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">C4/C5 - Menor</p>
                      <p className="text-3xl font-bold text-green-400">
                        {fichasActivas.filter((f: any) => f.prioridad === 'C4' || f.prioridad === 'C5').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Distribución de Personal */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal de Turno</CardTitle>
                  <CardDescription>Distribución por rol</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {estadisticas?.usuarios_por_rol && Object.entries(estadisticas.usuarios_por_rol).map(([rol, cantidad]: [string, any]) => (
                      <div key={rol} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            rol === 'medico' ? 'bg-blue-500' :
                            rol === 'tens' ? 'bg-green-500' :
                            rol === 'paramedico' ? 'bg-orange-500' :
                            'bg-purple-500'
                          }`} />
                          <span className="text-sm font-medium">{
                            rol === 'paramedico' ? 'Paramédicos' :
                            rol === 'tens' ? 'TENS' :
                            rol === 'medico' ? 'Médicos' :
                            'Administradores'
                          }</span>
                        </div>
                        <span className="text-2xl font-bold">{cantidad}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Estado de Atención */}
              <Card>
                <CardHeader>
                  <CardTitle>Estado del Servicio</CardTitle>
                  <CardDescription>Capacidad actual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pacientes en espera</span>
                      <span className="text-2xl font-bold text-orange-500">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">En atención</span>
                      <span className="text-2xl font-bold text-blue-500">{fichasActivas.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Finalizados hoy</span>
                      <span className="text-2xl font-bold text-green-500">{fichasAtendidas.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total pacientes</span>
                      <span className="text-2xl font-bold">{pacientesTotal}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actividad Reciente */}
              <Card>
                <CardHeader>
                  <CardTitle>Actividad Reciente</CardTitle>
                  <CardDescription>Últimas acciones</CardDescription>
                </CardHeader>
                <CardContent>
                  {resumenLogs?.ultimas_acciones && resumenLogs.ultimas_acciones.length > 0 ? (
                    <div className="space-y-3">
                      {resumenLogs.ultimas_acciones.slice(0, 5).map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 text-sm">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            log.accion === 'crear' ? 'bg-green-500' :
                            log.accion === 'editar' ? 'bg-blue-500' :
                            log.accion === 'eliminar' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-slate-300">
                              <span className="font-medium">{log.usuario_nombre || 'Sistema'}</span>
                              {' '}{log.accion_display?.toLowerCase() || log.accion}{' '}
                              <span className="text-slate-400">{log.modelo}</span>
                            </p>
                            <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm">No hay actividad reciente</p>
                      <p className="text-xs mt-1">Los logs se registrarán automáticamente</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Medicamentos (Solicitudes Pendientes) */}
          <TabsContent value="medicamentos" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="w-5 h-5 text-purple-400" />
                      Solicitudes de Medicamentos
                    </CardTitle>
                    <CardDescription>Autoriza o rechaza solicitudes de medicamentos del personal médico</CardDescription>
                  </div>
                  <Button variant="outline" onClick={cargarSolicitudesPendientes} className="border-slate-600">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {solicitudesLoading ? (
                  <div className="text-center py-12 text-slate-400">Cargando solicitudes...</div>
                ) : solicitudesPendientes.length === 0 ? (
                  <div className="text-center py-12">
                    <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-white">Sin solicitudes pendientes</p>
                    <p className="text-sm text-slate-400 mt-1">Todas las solicitudes han sido procesadas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {solicitudesPendientes.map((solicitud: any) => (
                      <div key={solicitud.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={
                                solicitud.urgencia === 'urgente' ? 'bg-red-500/20 text-red-400' :
                                solicitud.urgencia === 'alta' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-blue-500/20 text-blue-400'
                              }>
                                {solicitud.urgencia || 'Normal'}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {new Date(solicitud.fecha_solicitud || solicitud.created_at).toLocaleString('es-CL')}
                              </span>
                            </div>
                            <h4 className="font-semibold text-white mb-1">{solicitud.medicamento}</h4>
                            <p className="text-sm text-slate-400 mb-2">
                              Cantidad: {solicitud.cantidad} | Paciente: {solicitud.paciente_nombre || `Ficha #${solicitud.ficha}`}
                            </p>
                            {solicitud.justificacion && (
                              <p className="text-sm text-slate-500 italic">"{solicitud.justificacion}"</p>
                            )}
                            <p className="text-xs text-slate-500 mt-2">
                              Solicitado por: {solicitud.solicitante_nombre || 'Personal médico'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSolicitudSeleccionada(solicitud)
                                setRespuestaSolicitud("")
                                setModalSolicitudOpen(true)
                              }}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Autorizar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => {
                                setSolicitudSeleccionada(solicitud)
                                setRespuestaSolicitud("")
                                setModalSolicitudOpen(true)
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Camas */}
          <TabsContent value="camas" className="space-y-6">
            {/* Estadísticas de camas */}
            {estadisticasCamas && (
              <div className="grid gap-4 md:grid-cols-5">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Total Camas</p>
                        <p className="text-2xl font-bold text-white">{estadisticasCamas.total}</p>
                      </div>
                      <Bed className="w-8 h-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Ocupadas</p>
                        <p className="text-2xl font-bold text-red-400">{estadisticasCamas.ocupadas}</p>
                      </div>
                      <HeartPulse className="w-8 h-8 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Disponibles</p>
                        <p className="text-2xl font-bold text-green-400">{estadisticasCamas.disponibles}</p>
                      </div>
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Mantenimiento</p>
                        <p className="text-2xl font-bold text-yellow-400">{estadisticasCamas.mantenimiento}</p>
                      </div>
                      <Wrench className="w-8 h-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Limpieza</p>
                        <p className="text-2xl font-bold text-purple-400">{estadisticasCamas.limpieza}</p>
                      </div>
                      <Sparkles className="w-8 h-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gestión de Camas</CardTitle>
                    <CardDescription>Visualiza y administra el estado de todas las camas</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={filtroCamaTipo} onValueChange={setFiltroCamaTipo}>
                      <SelectTrigger className="w-40 bg-slate-800 border-slate-600">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all" className="text-white">Todos los tipos</SelectItem>
                        <SelectItem value="general" className="text-white">General</SelectItem>
                        <SelectItem value="uci" className="text-white">UCI</SelectItem>
                        <SelectItem value="box" className="text-white">Box</SelectItem>
                        <SelectItem value="aislamiento" className="text-white">Aislamiento</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filtroCamaEstado} onValueChange={setFiltroCamaEstado}>
                      <SelectTrigger className="w-40 bg-slate-800 border-slate-600">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all" className="text-white">Todos</SelectItem>
                        <SelectItem value="disponible" className="text-white">Disponible</SelectItem>
                        <SelectItem value="ocupada" className="text-white">Ocupada</SelectItem>
                        <SelectItem value="mantenimiento" className="text-white">Mantenimiento</SelectItem>
                        <SelectItem value="limpieza" className="text-white">Limpieza</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={cargarCamas} className="border-slate-600">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {camasLoading ? (
                  <div className="text-center py-12 text-slate-400">Cargando camas...</div>
                ) : camas.length === 0 ? (
                  <div className="text-center py-12">
                    <Bed className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-lg font-medium text-white">No hay camas registradas</p>
                    <p className="text-sm text-slate-400 mt-1">Configura las camas en la pestaña de Configuración</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {camas.map((cama: any) => (
                      <div 
                        key={cama.id} 
                        className={`rounded-xl p-4 border transition-all ${
                          cama.estado === 'disponible' ? 'bg-green-500/10 border-green-500/30' :
                          cama.estado === 'ocupada' ? 'bg-red-500/10 border-red-500/30' :
                          cama.estado === 'mantenimiento' ? 'bg-yellow-500/10 border-yellow-500/30' :
                          'bg-purple-500/10 border-purple-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white">{cama.numero}</span>
                          <Badge className={
                            cama.estado === 'disponible' ? 'bg-green-500/20 text-green-400' :
                            cama.estado === 'ocupada' ? 'bg-red-500/20 text-red-400' :
                            cama.estado === 'mantenimiento' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-purple-500/20 text-purple-400'
                          }>
                            {cama.estado}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">
                          Tipo: {cama.tipo} | Piso: {cama.piso}
                        </p>
                        {cama.ficha_actual && (
                          <div className="bg-slate-800/50 rounded-lg p-2 mb-2">
                            <p className="text-sm text-white">{cama.paciente_nombre || `Paciente #${cama.ficha_actual}`}</p>
                            <p className="text-xs text-slate-400">Desde: {new Date(cama.fecha_asignacion).toLocaleDateString('es-CL')}</p>
                          </div>
                        )}
                        {cama.estado !== 'ocupada' && (
                          <Select onValueChange={(value) => handleCambiarEstadoCama(cama.id, value)}>
                            <SelectTrigger className="w-full h-8 text-xs bg-slate-800 border-slate-600">
                              <SelectValue placeholder="Cambiar estado" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="disponible" className="text-white text-xs">Disponible</SelectItem>
                              <SelectItem value="mantenimiento" className="text-white text-xs">Mantenimiento</SelectItem>
                              <SelectItem value="limpieza" className="text-white text-xs">Limpieza</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Reportes */}
          <TabsContent value="reportes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reportes del Sistema</CardTitle>
                <CardDescription>Estadísticas y análisis detallados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Reporte de Atenciones */}
                <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Reporte de Atenciones
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Atenciones Totales</p>
                      <p className="text-3xl font-bold text-white">{fichasAtendidas.length}</p>
                      {fichasAtendidas.length > 0 && (
                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Activo
                        </p>
                      )}
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Promedio Diario</p>
                      <p className="text-3xl font-bold text-white">{Math.max(1, Math.round(fichasAtendidas.length / 7))}</p>
                      <p className="text-xs text-slate-500 mt-1">Últimos 7 días</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Tiempo Promedio</p>
                      <p className="text-3xl font-bold text-white">{tiempoEsperaPromedio || '--'}</p>
                      <p className="text-xs text-slate-500 mt-1">minutos de espera</p>
                    </div>
                  </div>
                </div>

                {/* Reporte de Recursos */}
                <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    Recursos y Medicamentos
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Solicitudes Pendientes</p>
                      <p className="text-3xl font-bold text-orange-400">{solicitudesPendientes}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Recursos Críticos</p>
                      <p className="text-3xl font-bold text-green-400">0</p>
                      <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Stock normal
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Autorizadas Hoy</p>
                      <p className="text-3xl font-bold text-blue-400">0</p>
                    </div>
                  </div>
                </div>

                {/* Reporte de Personal */}
                <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Personal y Turnos
                  </h3>
                  <div className="space-y-3">
                    {estadisticas?.usuarios_por_rol && Object.entries(estadisticas.usuarios_por_rol).map(([rol, cantidad]: [string, any]) => (
                      <div key={rol} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            rol === 'medico' ? 'bg-blue-500/20 text-blue-400' :
                            rol === 'tens' ? 'bg-green-500/20 text-green-400' :
                            rol === 'paramedico' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {rol === 'medico' ? 'M' : rol === 'tens' ? 'T' : rol === 'paramedico' ? 'P' : 'A'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{
                              rol === 'paramedico' ? 'Paramédicos' :
                              rol === 'tens' ? 'TENS' :
                              rol === 'medico' ? 'Médicos' :
                              'Administradores'
                            }</p>
                            <p className="text-xs text-slate-400">Personal activo</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">{cantidad}</p>
                          <p className="text-xs text-slate-400">En turno</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Usuarios */}
          <TabsContent value="usuarios" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="w-[200px]">
                  <Select value={filtroRol} onValueChange={setFiltroRol}>
                    <SelectTrigger className="bg-slate-800 text-white">
                      <SelectValue placeholder="Filtrar por rol" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800">
                      <SelectItem value="all" className="text-white hover:bg-slate-700 focus:bg-slate-700">Todos los roles</SelectItem>
                      <SelectItem value="paramedico" className="text-white hover:bg-slate-700 focus:bg-slate-700">Paramédico</SelectItem>
                      <SelectItem value="tens" className="text-white hover:bg-slate-700 focus:bg-slate-700">TENS</SelectItem>
                      <SelectItem value="medico" className="text-white hover:bg-slate-700 focus:bg-slate-700">Médico</SelectItem>
                      <SelectItem value="administrador" className="text-white hover:bg-slate-700 focus:bg-slate-700">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Buscar usuario..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-[300px]"
                />
              </div>
              <Button onClick={() => abrirModalUsuario()} className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Crear Usuario
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>RUT</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuariosLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                          Cargando usuarios...
                        </TableCell>
                      </TableRow>
                    ) : usuarios.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                          No se encontraron usuarios
                        </TableCell>
                      </TableRow>
                    ) : (
                      usuarios.map((usuario) => (
                        <TableRow key={usuario.id}>
                          <TableCell className="font-medium">{usuario.username}</TableCell>
                          <TableCell>{usuario.first_name} {usuario.last_name}</TableCell>
                          <TableCell>{usuario.rut}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              usuario.rol === 'medico' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              usuario.rol === 'tens' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              usuario.rol === 'paramedico' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                              'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }>
                              {usuario.rol === 'paramedico' ? 'Paramédico' :
                               usuario.rol === 'tens' ? 'TENS' :
                               usuario.rol === 'medico' ? 'Médico' :
                               'Administrador'}
                            </Badge>
                          </TableCell>
                          <TableCell>{usuario.email}</TableCell>
                          <TableCell>
                            {usuario.is_active ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                                Activo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">
                                Inactivo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => abrirModalUsuario(usuario)}>
                                Editar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-400 border-red-500/20"
                                onClick={() => handleEliminarUsuario(usuario.id)}
                              >
                                Desactivar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Logs */}
          <TabsContent value="logs" className="space-y-6">
            <div className="flex gap-4">
              <div className="w-[200px]">
                <Select value={filtroAccion} onValueChange={setFiltroAccion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por acción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las acciones</SelectItem>
                    <SelectItem value="crear">Crear</SelectItem>
                    <SelectItem value="editar">Editar</SelectItem>
                    <SelectItem value="eliminar">Eliminar</SelectItem>
                    <SelectItem value="autorizar">Autorizar</SelectItem>
                    <SelectItem value="rechazar">Rechazar</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[200px]">
                <Select value={filtroModelo} onValueChange={setFiltroModelo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los modelos</SelectItem>
                    <SelectItem value="Usuario">Usuario</SelectItem>
                    <SelectItem value="FichaEmergencia">Ficha</SelectItem>
                    <SelectItem value="Diagnostico">Diagnóstico</SelectItem>
                    <SelectItem value="SolicitudMedicamento">Solicitud Medicamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>ID Objeto</TableHead>
                      <TableHead>Fecha/Hora</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          Cargando logs...
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          No se encontraron logs
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{log.usuario_nombre || 'Sistema'}</p>
                              <p className="text-xs text-slate-500 capitalize">{log.usuario_rol}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              log.accion === 'crear' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              log.accion === 'editar' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              log.accion === 'eliminar' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-gray-500/10 text-gray-400 border-gray-500/20'
                            }>
                              {log.accion_display || log.accion}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.modelo}</TableCell>
                          <TableCell>#{log.objeto_id || 'N/A'}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(log.timestamp).toLocaleString('es-CL')}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{log.ip_address}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Configuración */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
                <CardDescription>Ajustes generales y parámetros del hospital</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Configuración de Capacidad */}
                <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Hospital className="w-5 h-5 text-blue-400" />
                    Capacidad del Hospital
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <label className="text-sm text-slate-300 font-medium block mb-2">Camas Totales</label>
                      <Input 
                        type="number" 
                        value={camasTotales}
                        onChange={(e) => setCamasTotales(Number(e.target.value))}
                        className="bg-slate-900 text-white border-slate-600" 
                      />
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <label className="text-sm text-slate-300 font-medium block mb-2">Camas UCI</label>
                      <Input 
                        type="number" 
                        value={camasUCI}
                        onChange={(e) => setCamasUCI(Number(e.target.value))}
                        className="bg-slate-900 text-white border-slate-600" 
                      />
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <label className="text-sm text-slate-300 font-medium block mb-2">Salas de Emergencia</label>
                      <Input 
                        type="number" 
                        value={salasEmergencia}
                        onChange={(e) => setSalasEmergencia(Number(e.target.value))}
                        className="bg-slate-900 text-white border-slate-600" 
                      />
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <label className="text-sm text-slate-300 font-medium block mb-2">Boxes de Atención</label>
                      <Input 
                        type="number" 
                        value={boxesAtencion}
                        onChange={(e) => setBoxesAtencion(Number(e.target.value))}
                        className="bg-slate-900 text-white border-slate-600" 
                      />
                    </div>
                  </div>
                </div>

                {/* Configuración de Auditoría */}
                <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    Auditoría y Logs
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">Registro de auditoría</p>
                        <p className="text-sm text-slate-400">Guardar todas las acciones del sistema</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Activado</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">Retención de logs</p>
                        <p className="text-sm text-slate-400">Mantener registros por 90 días</p>
                      </div>
                      <Select defaultValue="90">
                        <SelectTrigger className="w-32 bg-slate-800 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="30" className="text-white">30 días</SelectItem>
                          <SelectItem value="60" className="text-white">60 días</SelectItem>
                          <SelectItem value="90" className="text-white">90 días</SelectItem>
                          <SelectItem value="180" className="text-white">180 días</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleGuardarConfiguracion} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                  <Button variant="outline" onClick={handleRestaurarConfiguracion} className="flex-1 border-slate-600 hover:bg-slate-800">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restaurar Valores
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal Crear/Editar Usuario */}
      <Dialog open={modalUsuarioOpen} onOpenChange={setModalUsuarioOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{usuarioSeleccionado ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
            <DialogDescription>
              {usuarioSeleccionado ? 'Modifica los datos del usuario' : 'Completa el formulario para crear un nuevo usuario'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario *</Label>
                <Input
                  id="username"
                  value={formUsuario.username}
                  onChange={(e) => setFormUsuario({ ...formUsuario, username: e.target.value })}
                  placeholder="usuario123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formUsuario.email}
                  onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })}
                  placeholder="usuario@hospital.cl"
                />
              </div>
            </div>

            {!usuarioSeleccionado && (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formUsuario.password}
                  onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  id="first_name"
                  value={formUsuario.first_name}
                  onChange={(e) => setFormUsuario({ ...formUsuario, first_name: e.target.value })}
                  placeholder="Juan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido *</Label>
                <Input
                  id="last_name"
                  value={formUsuario.last_name}
                  onChange={(e) => setFormUsuario({ ...formUsuario, last_name: e.target.value })}
                  placeholder="Pérez"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rut">RUT *</Label>
                <Input
                  id="rut"
                  value={formUsuario.rut}
                  onChange={(e) => setFormUsuario({ ...formUsuario, rut: e.target.value })}
                  placeholder="12.345.678-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rol">Rol *</Label>
                <Select value={formUsuario.rol} onValueChange={(value) => setFormUsuario({ ...formUsuario, rol: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paramedico">Paramédico</SelectItem>
                    <SelectItem value="tens">TENS</SelectItem>
                    <SelectItem value="medico">Médico</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formUsuario.telefono}
                onChange={(e) => setFormUsuario({ ...formUsuario, telefono: e.target.value })}
                placeholder="+56 9 1234 5678"
              />
            </div>

            {(formUsuario.rol === 'medico' || formUsuario.rol === 'tens') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="especialidad">Especialidad</Label>
                  <Input
                    id="especialidad"
                    value={formUsuario.especialidad}
                    onChange={(e) => setFormUsuario({ ...formUsuario, especialidad: e.target.value })}
                    placeholder="Medicina de Urgencias"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registro_profesional">Registro Profesional</Label>
                  <Input
                    id="registro_profesional"
                    value={formUsuario.registro_profesional}
                    onChange={(e) => setFormUsuario({ ...formUsuario, registro_profesional: e.target.value })}
                    placeholder="123456"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalUsuarioOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarUsuario}>
              {usuarioSeleccionado ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Autorizar/Rechazar Solicitud */}
      <Dialog open={modalSolicitudOpen} onOpenChange={setModalSolicitudOpen}>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-400" />
              Procesar Solicitud de Medicamento
            </DialogTitle>
            <DialogDescription>
              Revisa la solicitud y decide si autorizarla o rechazarla
            </DialogDescription>
          </DialogHeader>
          {solicitudSeleccionada && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Medicamento</p>
                    <p className="font-semibold text-white">{solicitudSeleccionada.medicamento}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Cantidad</p>
                    <p className="font-semibold text-white">{solicitudSeleccionada.cantidad}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Paciente</p>
                    <p className="text-white">{solicitudSeleccionada.paciente_nombre || `Ficha #${solicitudSeleccionada.ficha}`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Urgencia</p>
                    <Badge className={
                      solicitudSeleccionada.urgencia === 'urgente' ? 'bg-red-500/20 text-red-400' :
                      solicitudSeleccionada.urgencia === 'alta' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-blue-500/20 text-blue-400'
                    }>
                      {solicitudSeleccionada.urgencia || 'Normal'}
                    </Badge>
                  </div>
                </div>
                {solicitudSeleccionada.justificacion && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-500">Justificación</p>
                    <p className="text-sm text-slate-300 italic">"{solicitudSeleccionada.justificacion}"</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Respuesta / Comentario</Label>
                <Input
                  placeholder="Agregar comentario (obligatorio para rechazar)"
                  value={respuestaSolicitud}
                  onChange={(e) => setRespuestaSolicitud(e.target.value)}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalSolicitudOpen(false)} className="border-slate-600">
              Cancelar
            </Button>
            <Button 
              variant="outline" 
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => solicitudSeleccionada && handleRechazarSolicitud(solicitudSeleccionada.id)}
            >
              <X className="w-4 h-4 mr-1" />
              Rechazar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => solicitudSeleccionada && handleAutorizarSolicitud(solicitudSeleccionada.id)}
            >
              <Check className="w-4 h-4 mr-1" />
              Autorizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
