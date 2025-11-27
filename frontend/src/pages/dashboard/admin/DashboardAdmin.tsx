import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getSession, clearSession, type User } from "@/lib/auth"
import { authAPI, usuariosAPI, auditLogsAPI, fichasAPI, pacientesAPI, configuracionAPI, camasAPI } from "@/lib/api"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { GestionTurnos } from "@/components/gestion-turnos"
import { toast } from "@/hooks/use-toast"
import { 
  Bed, 
  Clock, 
  Users, 
  AlertTriangle,
  Save,
  RotateCcw,
  Shield,
  FileText,
  Activity,
  UserPlus,
  UserCheck,
  RefreshCw,
  HeartPulse,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Download,
  Timer,
  Check,
  Settings
} from "lucide-react"

export default function AdministradorDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  
  // Estados para dashboard
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [fichasActivas, setFichasActivas] = useState<any[]>([])
  const [fichasAtendidas, setFichasAtendidas] = useState<any[]>([])
  const [tiempoEsperaPromedio, setTiempoEsperaPromedio] = useState(0)
  
  // Estados para camas
  const [camas, setCamas] = useState<any[]>([])
  const [camasLoading, setCamasLoading] = useState(false)
  const [modalNuevaCama, setModalNuevaCama] = useState(false)
  const [modalGestionarCamas, setModalGestionarCamas] = useState(false)
  const [nuevaCama, setNuevaCama] = useState({ tipo: "box", cantidad: 1 })
  const [filtroCamaTipo, setFiltroCamaTipo] = useState("all")
  const [estadisticasCamas, setEstadisticasCamas] = useState<any>(null)
  const [camasSeleccionadas, setCamasSeleccionadas] = useState<number[]>([])
  const [tiposDisponibles, setTiposDisponibles] = useState<any[]>([])
  
  // Estados para usuarios
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [usuariosLoading, setUsuariosLoading] = useState(false)
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null)
  const [filtroRol, setFiltroRol] = useState("all")
  const [busqueda, setBusqueda] = useState("")
  
  // Estados para logs/auditoría
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [filtroAccion, setFiltroAccion] = useState("all")
  const [filtroModelo, setFiltroModelo] = useState("all")
  const [filtroUsuarioLog, setFiltroUsuarioLog] = useState("all")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  
  // Estados para reportes
  const [reporteFechaDesde, setReporteFechaDesde] = useState("")
  const [reporteFechaHasta, setReporteFechaHasta] = useState("")
  const [reporteData, setReporteData] = useState<any>(null)
  
  // Estados para configuración
  const [configuracion, setConfiguracion] = useState<any>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [camasTotales, setCamasTotales] = useState(50)
  const [camasUCI, setCamasUCI] = useState(10)
  const [salasEmergencia, setSalasEmergencia] = useState(5)
  const [boxesAtencion, setBoxesAtencion] = useState(15)
  const [configId, setConfigId] = useState<number | null>(null)
  
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
      navigate("/", { replace: true })
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
      
      // Cargar fichas atendidas (hoy)
      const fichasAtendidasResponse = await fichasAPI.atendidas()
      const fichasAtendidasArray = Array.isArray(fichasAtendidasResponse) ? fichasAtendidasResponse : []
      setFichasAtendidas(fichasAtendidasArray)
      
      // Calcular tiempo de espera promedio
      if (fichasAtendidasArray.length > 0) {
        let totalMinutos = 0
        let conteo = 0
        fichasAtendidasArray.forEach((ficha: any) => {
          if (ficha.fecha_llegada && ficha.fecha_atencion) {
            const llegada = new Date(ficha.fecha_llegada).getTime()
            const atencion = new Date(ficha.fecha_atencion).getTime()
            const minutos = Math.round((atencion - llegada) / 60000)
            if (minutos > 0 && minutos < 480) {
              totalMinutos += minutos
              conteo++
            }
          }
        })
        setTiempoEsperaPromedio(conteo > 0 ? Math.round(totalMinutos / conteo) : 0)
      }
      
      // Cargar estadísticas de camas
      try {
        const camasStats = await camasAPI.estadisticas()
        setEstadisticasCamas(camasStats)
      } catch (error) {
        console.error('Error cargando estadísticas de camas:', error)
      }
      
      // Cargar logs recientes para el dashboard
      try {
        const logsResponse = await auditLogsAPI.listar({})
        setLogs(logsResponse.results || logsResponse || [])
      } catch (error) {
        console.error('Error cargando logs:', error)
      }
      
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    }
  }

  const cargarCamas = async () => {
    try {
      setCamasLoading(true)
      const response = await camasAPI.listar()
      setCamas(Array.isArray(response) ? response : response.results || [])
      // Cargar estadísticas también
      const stats = await camasAPI.estadisticas()
      setEstadisticasCamas(stats)
      // Cargar tipos disponibles
      const tipos = await camasAPI.tiposDisponibles()
      setTiposDisponibles(tipos)
    } catch (error) {
      console.error('Error cargando camas:', error)
    } finally {
      setCamasLoading(false)
    }
  }

  const handleEliminarTipoCamas = async (tipo: string) => {
    const tipoInfo = tiposDisponibles.find(t => t.tipo === tipo)
    if (!tipoInfo) return
    
    if (tipoInfo.ocupadas > 0) {
      toast({ 
        title: "No se puede eliminar", 
        description: `Hay ${tipoInfo.ocupadas} camas ocupadas de tipo ${tipo.toUpperCase()}. Libere las camas primero.`, 
        variant: "destructive" 
      })
      return
    }
    
    if (!confirm(`¿Eliminar TODAS las ${tipoInfo.total} camas de tipo ${tipo.toUpperCase()}?`)) return
    
    try {
      await camasAPI.eliminarTipo(tipo)
      toast({ title: "Camas eliminadas", description: `Se eliminaron todas las camas de tipo ${tipo.toUpperCase()}` })
      cargarCamas()
      cargarConfiguracion()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudieron eliminar", variant: "destructive" })
    }
  }

  const handleCrearCama = async () => {
    try {
      if (nuevaCama.cantidad < 1 || nuevaCama.cantidad > 50) {
        toast({ title: "Error", description: "La cantidad debe estar entre 1 y 50", variant: "destructive" })
        return
      }
      await camasAPI.crearMultiple(nuevaCama.tipo, nuevaCama.cantidad)
      toast({ 
        title: "Camas creadas", 
        description: `Se crearon ${nuevaCama.cantidad} camas de tipo ${nuevaCama.tipo.toUpperCase()}` 
      })
      setModalNuevaCama(false)
      setNuevaCama({ tipo: "box", cantidad: 1 })
      cargarCamas()
      cargarConfiguracion()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudieron crear las camas", variant: "destructive" })
    }
  }

  const handleEliminarCama = async (id: number) => {
    if (!confirm("¿Eliminar esta cama? Solo se puede eliminar si está disponible.")) return
    try {
      await camasAPI.eliminar(id)
      toast({ title: "Cama eliminada", description: "La cama ha sido eliminada" })
      cargarCamas()
      cargarConfiguracion()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo eliminar", variant: "destructive" })
    }
  }

  const handleEliminarCamasSeleccionadas = async () => {
    if (camasSeleccionadas.length === 0) {
      toast({ title: "Error", description: "Seleccione camas para eliminar", variant: "destructive" })
      return
    }
    if (!confirm(`¿Eliminar ${camasSeleccionadas.length} camas seleccionadas? Solo se eliminarán las que estén disponibles.`)) return
    try {
      await camasAPI.eliminarMultiple(camasSeleccionadas)
      toast({ title: "Camas eliminadas", description: `Se eliminaron las camas seleccionadas` })
      setCamasSeleccionadas([])
      cargarCamas()
      cargarConfiguracion()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudieron eliminar", variant: "destructive" })
    }
  }

  const toggleSeleccionCama = (id: number) => {
    setCamasSeleccionadas(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
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
      if (fechaDesde) params.fecha_desde = fechaDesde
      if (fechaHasta) params.fecha_hasta = fechaHasta
      if (filtroUsuarioLog) params.usuario = filtroUsuarioLog
      
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
    }
  }, [activeTab, filtroRol, busqueda, filtroAccion, filtroModelo, filtroUsuarioLog, fechaDesde, fechaHasta])

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

  // Función para exportar reporte a CSV
  const handleExportarReporte = () => {
    const fechaReporte = new Date().toISOString().split('T')[0]
    
    // Crear contenido CSV
    let csv = "REPORTE DEL SISTEMA - HOSPITAL URGENCIAS\n"
    csv += `Fecha de generación: ${new Date().toLocaleString('es-CL')}\n`
    csv += `Período: ${reporteFechaDesde || 'Sin definir'} - ${reporteFechaHasta || 'Sin definir'}\n\n`
    
    csv += "=== RESUMEN DE ATENCIONES ===\n"
    csv += `Pacientes en urgencias,${fichasActivas.length}\n`
    csv += `Atendidos hoy,${fichasAtendidas.length}\n`
    csv += `Tiempo espera promedio,${tiempoEsperaPromedio || 0} min\n\n`
    
    csv += "=== ESTADO DE CAMAS ===\n"
    csv += `Total camas,${estadisticasCamas?.total || 0}\n`
    csv += `Ocupadas,${estadisticasCamas?.ocupadas || 0}\n`
    csv += `Disponibles,${estadisticasCamas?.disponibles || 0}\n`
    csv += `Porcentaje ocupación,${estadisticasCamas?.porcentaje_ocupacion || 0}%\n\n`
    
    csv += "=== PERSONAL ===\n"
    if (estadisticas?.usuarios_por_rol) {
      Object.entries(estadisticas.usuarios_por_rol).forEach(([rol, cantidad]) => {
        csv += `${rol},${cantidad}\n`
      })
    }
    csv += `Total,${estadisticas?.total_usuarios || 0}\n\n`
    
    csv += "=== DETALLE DE CAMAS ===\n"
    csv += "Número,Tipo,Estado,Paciente\n"
    camas.forEach(cama => {
      csv += `${cama.numero},${cama.tipo},${cama.estado},${cama.paciente_nombre || '-'}\n`
    })
    
    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reporte_hospital_${fechaReporte}.csv`
    link.click()
    
    toast({
      title: "✅ Reporte exportado",
      description: `Archivo descargado: reporte_hospital_${fechaReporte}.csv`,
    })
  }

  const handleCerrarSesion = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      clearSession()
      navigate("/", { replace: true })
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
          <TabsList className="grid w-full grid-cols-6 lg:w-[1000px]">
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="turnos" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Turnos
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
          </TabsList>

          {/* Tab: Turnos */}
          <TabsContent value="turnos" className="space-y-6">
            <GestionTurnos />
          </TabsContent>

          {/* Tab: Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
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
                title="Camas Disponibles"
                value={estadisticasCamas ? String(estadisticasCamas.disponibles) : '--'}
                icon={<Bed className="w-5 h-5 text-purple-400" />}
                description="Para nuevos pacientes"
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
                      <span className="text-sm font-medium">Fichas en ruta</span>
                      <span className="text-2xl font-bold text-orange-500">{estadisticas?.fichas_en_ruta || 0}</span>
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
                      <span className="text-2xl font-bold">{fichasActivas.length + fichasAtendidas.length}</span>
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
                  {logs && logs.length > 0 ? (
                    <div className="space-y-3">
                      {logs.slice(0, 5).map((log: any) => (
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

          {/* Tab: Camas */}
          <TabsContent value="camas" className="space-y-6">
            {/* Estadísticas de camas */}
            {estadisticasCamas && (
              <div className="grid gap-4 md:grid-cols-3">
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
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gestión de Camas</CardTitle>
                    <CardDescription>Administra las camas del hospital. Agrega o elimina camas según la capacidad.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={filtroCamaTipo} onValueChange={setFiltroCamaTipo}>
                      <SelectTrigger className="w-40 bg-slate-800 border-slate-600">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all" className="text-white">Todos los tipos</SelectItem>
                        <SelectItem value="box" className="text-white">Box</SelectItem>
                        <SelectItem value="uci" className="text-white">UCI</SelectItem>
                        <SelectItem value="uti" className="text-white">UTI</SelectItem>
                        <SelectItem value="cama_general" className="text-white">Cama General</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={cargarCamas} className="border-slate-600">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    {camasSeleccionadas.length > 0 && (
                      <Button variant="destructive" onClick={handleEliminarCamasSeleccionadas}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar ({camasSeleccionadas.length})
                      </Button>
                    )}
                    <Button onClick={() => setModalNuevaCama(true)} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Camas
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        cargarCamas()
                        setModalGestionarCamas(true)
                      }} 
                      className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Gestionar Tipos
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Resumen por tipo */}
                {estadisticasCamas?.por_tipo && (
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {Object.entries(estadisticasCamas.por_tipo).map(([tipo, stats]: [string, any]) => (
                      <div key={tipo} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <p className="text-sm font-medium text-white">{tipo.toUpperCase().replace('_', ' ')}</p>
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                        <p className="text-xs text-slate-400">
                          {stats.disponibles} disponibles / {stats.ocupadas} ocupadas
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {camasLoading ? (
                  <div className="text-center py-12 text-slate-400">Cargando camas...</div>
                ) : camas.length === 0 ? (
                  <div className="text-center py-12">
                    <Bed className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-lg font-medium text-white">No hay camas registradas</p>
                    <p className="text-sm text-slate-400 mt-1">Haz clic en "Agregar Camas" para crear</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                    {camas.map((cama: any) => (
                      <div 
                        key={cama.id} 
                        className={`rounded-xl p-3 border transition-all cursor-pointer ${
                          camasSeleccionadas.includes(cama.id) ? 'ring-2 ring-blue-500' : ''
                        } ${
                          cama.estado === 'disponible' ? 'bg-green-500/10 border-green-500/30' :
                          cama.estado === 'ocupada' ? 'bg-red-500/10 border-red-500/30' :
                          'bg-yellow-500/10 border-yellow-500/30'
                        }`}
                        onClick={() => cama.estado === 'disponible' && toggleSeleccionCama(cama.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white text-sm">{cama.numero}</span>
                          <Badge className={`text-xs ${
                            cama.estado === 'disponible' ? 'bg-green-500/20 text-green-400' :
                            cama.estado === 'ocupada' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {cama.estado}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {cama.tipo_display || cama.tipo.toUpperCase().replace('_', ' ')}
                        </p>
                        {cama.ficha_actual && (
                          <p className="text-xs text-slate-300 mt-1 truncate">
                            {cama.paciente_nombre || `Paciente`}
                          </p>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      Reportes del Sistema
                    </CardTitle>
                    <CardDescription>Estadísticas y análisis por rango de fechas</CardDescription>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Desde:</span>
                      <Input 
                        type="date" 
                        value={reporteFechaDesde}
                        onChange={(e) => setReporteFechaDesde(e.target.value)}
                        className="w-40 bg-slate-800 border-slate-600"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Hasta:</span>
                      <Input 
                        type="date" 
                        value={reporteFechaHasta}
                        onChange={(e) => setReporteFechaHasta(e.target.value)}
                        className="w-40 bg-slate-800 border-slate-600"
                      />
                    </div>
                    <Button variant="outline" className="border-slate-600" onClick={handleExportarReporte}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Reporte de Atenciones */}
                <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Reporte de Atenciones
                  </h3>
                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Atenciones Hoy</p>
                      <p className="text-3xl font-bold text-white">{fichasAtendidas.filter((f: any) => {
                        const hoy = new Date().toISOString().split('T')[0]
                        return f.fecha_atencion?.startsWith(hoy)
                      }).length}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Total del Período</p>
                      <p className="text-3xl font-bold text-white">{fichasAtendidas.length}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">En Espera Ahora</p>
                      <p className="text-3xl font-bold text-orange-400">{fichasActivas.length}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Tiempo Promedio</p>
                      <p className="text-3xl font-bold text-white">{tiempoEsperaPromedio || '--'}</p>
                      <p className="text-xs text-slate-500 mt-1">minutos de espera</p>
                    </div>
                  </div>
                </div>

                {/* Reporte de Camas */}
                <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Bed className="w-5 h-5 text-green-400" />
                    Estado de Camas
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Total Camas</p>
                      <p className="text-3xl font-bold text-white">{estadisticasCamas?.total || 0}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Ocupación Actual</p>
                      <p className="text-3xl font-bold text-blue-400">{estadisticasCamas?.porcentaje_ocupacion || 0}%</p>
                      <p className="text-xs text-slate-500 mt-1">{estadisticasCamas?.ocupadas || 0} ocupadas</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Disponibles</p>
                      <p className="text-3xl font-bold text-green-400">{estadisticasCamas?.disponibles || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Reporte de Personal */}
                <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Personal en Turno Hoy
                  </h3>
                  <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-400">Total personal en turno</p>
                    <p className="text-3xl font-bold text-emerald-400">{estadisticas?.personal_en_turno || 0}</p>
                  </div>
                  <div className="space-y-3">
                    {['medico', 'tens', 'paramedico'].map((rol) => (
                      <div key={rol} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            rol === 'medico' ? 'bg-blue-500/20 text-blue-400' :
                            rol === 'tens' ? 'bg-green-500/20 text-green-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {rol === 'medico' ? 'M' : rol === 'tens' ? 'T' : 'P'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{
                              rol === 'paramedico' ? 'Paramédicos' :
                              rol === 'tens' ? 'TENS' :
                              'Médicos'
                            }</p>
                            <p className="text-xs text-slate-400">En turno hoy</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">{estadisticas?.personal_turno_por_rol?.[rol] || 0}</p>
                          <p className="text-xs text-slate-400">de {estadisticas?.usuarios_por_rol?.[rol] || 0} totales</p>
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

          {/* Tab: Logs (Auditoría Completa) */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-400" />
                      Registro de Auditoría
                    </CardTitle>
                    <CardDescription>Todas las acciones realizadas en el sistema por todos los usuarios</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="w-40 bg-slate-800 border-slate-600"
                      placeholder="Desde"
                    />
                    <Input 
                      type="date" 
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="w-40 bg-slate-800 border-slate-600"
                      placeholder="Hasta"
                    />
                    <Button variant="outline" onClick={cargarLogs} className="border-slate-600">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtrar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtros adicionales */}
                <div className="flex gap-4 flex-wrap">
                  <Select value={filtroAccion} onValueChange={setFiltroAccion}>
                    <SelectTrigger className="w-[180px] bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Acción" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all" className="text-white">Todas las acciones</SelectItem>
                      <SelectItem value="crear" className="text-white">Crear</SelectItem>
                      <SelectItem value="editar" className="text-white">Editar</SelectItem>
                      <SelectItem value="eliminar" className="text-white">Eliminar</SelectItem>
                      <SelectItem value="asignar_cama" className="text-white">Asignar Cama</SelectItem>
                      <SelectItem value="liberar_cama" className="text-white">Liberar Cama</SelectItem>
                      <SelectItem value="alta" className="text-white">Dar de Alta</SelectItem>
                      <SelectItem value="login" className="text-white">Login</SelectItem>
                      <SelectItem value="logout" className="text-white">Logout</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filtroModelo} onValueChange={setFiltroModelo}>
                    <SelectTrigger className="w-[180px] bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Módulo" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all" className="text-white">Todos los módulos</SelectItem>
                      <SelectItem value="Usuario" className="text-white">Usuarios</SelectItem>
                      <SelectItem value="FichaEmergencia" className="text-white">Fichas</SelectItem>
                      <SelectItem value="Diagnostico" className="text-white">Diagnósticos</SelectItem>
                      <SelectItem value="Cama" className="text-white">Camas</SelectItem>
                      <SelectItem value="Sesion" className="text-white">Sesiones</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Buscar por usuario..."
                    value={filtroUsuarioLog}
                    onChange={(e) => setFiltroUsuarioLog(e.target.value)}
                    className="w-[200px] bg-slate-800 border-slate-600"
                  />
                </div>

                {/* Tabla de Logs */}
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Fecha/Hora</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Detalles</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                            Cargando registros...
                          </TableCell>
                        </TableRow>
                      ) : logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                            No se encontraron registros de auditoría
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id} className="hover:bg-slate-800/50">
                            <TableCell className="text-sm font-mono">
                              {new Date(log.timestamp).toLocaleString('es-CL')}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-white">{log.usuario_nombre || 'Sistema'}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                log.usuario_rol === 'administrador' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                log.usuario_rol === 'medico' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                log.usuario_rol === 'tens' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                log.usuario_rol === 'paramedico' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                'bg-gray-500/10 text-gray-400 border-gray-500/20'
                              }>
                                {log.usuario_rol || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                log.accion === 'crear' ? 'bg-green-500/20 text-green-400' :
                                log.accion === 'editar' ? 'bg-blue-500/20 text-blue-400' :
                                log.accion === 'eliminar' ? 'bg-red-500/20 text-red-400' :
                                log.accion === 'asignar_cama' ? 'bg-cyan-500/20 text-cyan-400' :
                                log.accion === 'liberar_cama' ? 'bg-yellow-500/20 text-yellow-400' :
                                log.accion === 'alta' ? 'bg-emerald-500/20 text-emerald-400' :
                                log.accion === 'login' ? 'bg-indigo-500/20 text-indigo-400' :
                                log.accion === 'logout' ? 'bg-gray-500/20 text-gray-400' :
                                'bg-purple-500/20 text-purple-400'
                              }>
                                {log.accion_display || log.accion}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-300">{log.modelo}</TableCell>
                            <TableCell className="max-w-[200px]">
                              <span className="text-sm text-slate-400 truncate block">
                                {log.descripcion || `ID: #${log.objeto_id || 'N/A'}`}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 font-mono">{log.ip_address || 'N/A'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
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

      {/* Modal Nueva Cama */}
      <Dialog open={modalNuevaCama} onOpenChange={setModalNuevaCama}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-blue-400" />
              Agregar Camas
            </DialogTitle>
            <DialogDescription>
              Crea múltiples camas del tipo seleccionado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_cama">Tipo de Cama *</Label>
              <Select value={nuevaCama.tipo} onValueChange={(value) => setNuevaCama({ ...nuevaCama, tipo: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="box" className="text-white">Box</SelectItem>
                  <SelectItem value="uci" className="text-white">UCI</SelectItem>
                  <SelectItem value="uti" className="text-white">UTI</SelectItem>
                  <SelectItem value="cama_general" className="text-white">Cama General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad_camas">Cantidad *</Label>
              <Input
                id="cantidad_camas"
                type="number"
                min={1}
                max={50}
                value={nuevaCama.cantidad}
                onChange={(e) => setNuevaCama({ ...nuevaCama, cantidad: parseInt(e.target.value) || 1 })}
                placeholder="1"
                className="bg-slate-800 border-slate-600"
              />
              <p className="text-xs text-slate-400">Ingrese un número entre 1 y 50</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalNuevaCama(false)} className="border-slate-600">
              Cancelar
            </Button>
            <Button onClick={handleCrearCama} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1" />
              Crear {nuevaCama.cantidad} Cama{nuevaCama.cantidad > 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Gestionar Camas por Tipo */}
      <Dialog open={modalGestionarCamas} onOpenChange={setModalGestionarCamas}>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Gestionar Camas por Tipo
            </DialogTitle>
            <DialogDescription>
              Administra las camas agrupadas por tipo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {tiposDisponibles.length === 0 ? (
              <p className="text-center text-slate-400 py-4">No hay camas registradas</p>
            ) : (
              <div className="space-y-3">
                {tiposDisponibles.map((tipo: any) => (
                  <div key={tipo.tipo} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-3">
                      <Bed className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="font-medium">{tipo.tipo.toUpperCase()}</p>
                        <p className="text-sm text-slate-400">
                          Total: {tipo.total} | Disponibles: {tipo.disponibles} | Ocupadas: {tipo.ocupadas}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tipo.ocupadas > 0 ? (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                          En uso
                        </Badge>
                      ) : (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleEliminarTipoCamas(tipo.tipo)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar todas
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="border-t border-slate-700 pt-4 mt-4">
              <p className="text-sm text-slate-400 mb-3">Agregar nuevas camas:</p>
              <div className="flex gap-2">
                <Select value={nuevaCama.tipo} onValueChange={(value) => setNuevaCama({ ...nuevaCama, tipo: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 flex-1">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="box" className="text-white">Box</SelectItem>
                    <SelectItem value="uci" className="text-white">UCI</SelectItem>
                    <SelectItem value="uti" className="text-white">UTI</SelectItem>
                    <SelectItem value="cama_general" className="text-white">Cama General</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={nuevaCama.cantidad}
                  onChange={(e) => setNuevaCama({ ...nuevaCama, cantidad: parseInt(e.target.value) || 1 })}
                  className="w-20 bg-slate-800 border-slate-600"
                  placeholder="Cant."
                />
                <Button onClick={handleCrearCama} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setModalGestionarCamas(false)} className="border-slate-600">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
