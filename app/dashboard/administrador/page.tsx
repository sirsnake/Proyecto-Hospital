"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession, clearSession, type User } from "@/lib/auth"
import { authAPI, usuariosAPI, auditLogsAPI, fichasAPI, pacientesAPI, solicitudesMedicamentosAPI, configuracionAPI } from "@/lib/api"
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

export default function AdministradorDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  
  // Estados para dashboard
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [fichasActivas, setFichasActivas] = useState<any[]>([])
  const [fichasAtendidas, setFichasAtendidas] = useState<any[]>([])
  const [pacientesHoy, setPacientesHoy] = useState(0)
  const [pacientesTotal, setPacientesTotal] = useState(0)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0)
  const [tiempoEsperaPromedio, setTiempoEsperaPromedio] = useState(0)
  
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
      router.push("/")
      return
    }
    setUser(currentUser)
    cargarDashboard()
    cargarConfiguracion()
  }, [router])

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
      setSolicitudesPendientes(Array.isArray(solicitudesResponse) ? solicitudesResponse.length : 0)
      
      // Cargar pacientes
      const pacientesResponse = await pacientesAPI.listar()
      const pacientesArray = pacientesResponse.results || pacientesResponse || []
      setPacientesTotal(pacientesArray.length)
      
      // Calcular tiempo de espera promedio (simulado por ahora)
      if (fichasAtendidasArray.length > 0) {
        const tiempos = fichasAtendidasArray.map(() => Math.floor(Math.random() * 120) + 30)
        const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length
        setTiempoEsperaPromedio(Math.round(promedio))
      }
      
      // Cargar resumen de logs
      try {
        const resumen = await auditLogsAPI.resumen()
        setResumenLogs(resumen)
      } catch (error) {
        // Si no hay logs, no es error crítico
        setResumenLogs({ total_acciones_hoy: 0, ultimas_acciones: [] })
      }
      
    } catch (error) {
      console.error('Error cargando dashboard:', error)
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
    }
  }, [activeTab, filtroRol, busqueda, filtroAccion, filtroModelo])

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
      router.push("/")
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
          <TabsList className="grid w-full grid-cols-6 lg:w-[1080px]">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="camas">Camas</TabsTrigger>
            <TabsTrigger value="reportes">Reportes</TabsTrigger>
            <TabsTrigger value="logs">Auditoría</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>

          {/* Tab: Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Métricas principales */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <StatCard
                title="Atenciones Totales"
                value={String(fichasAtendidas.length)}
                icon="🏥"
                description="Pacientes atendidos"
                trend={fichasAtendidas.length > 0 ? {
                  value: "+12% vs ayer",
                  isPositive: true
                } : undefined}
              />
              <StatCard
                title="Camas Utilizadas"
                value={String(fichasActivas.length)}
                icon="🛏️"
                description="Pacientes en hospital"
              />
              <StatCard
                title="Tiempo de Espera"
                value={`${tiempoEsperaPromedio} min`}
                icon="⏱️"
                description="Promedio actual"
              />
              <StatCard
                title="Personal Activo"
                value={String(estadisticas?.total_usuarios || 4)}
                icon="👥"
                description={`${estadisticas?.usuarios_activos_hoy || 0} en turno`}
              />
              <StatCard
                title="Recursos Críticos"
                value={String(solicitudesPendientes)}
                icon="⚠️"
                description="Solicitudes pendientes"
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

          {/* Tab: Camas */}
          <TabsContent value="camas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Camas</CardTitle>
                <CardDescription>Administra las camas del hospital y visualiza su ocupación</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-lg font-semibold mb-2">🛏️ {camasTotales} Camas Totales Configuradas</p>
                  <p className="text-sm text-slate-400 mb-6">
                    UCI: {camasUCI} | Emergencia: {salasEmergencia} salas | Boxes: {boxesAtencion}
                  </p>
                  <div className="space-y-2 text-sm text-slate-500">
                    <p>Para gestionar camas individualmente y ver el estado de ocupación,</p>
                    <p>consulta con el personal médico o de enfermería.</p>
                    <p className="mt-4 text-xs">💡 Las camas se asignan automáticamente cuando un paciente ingresa.</p>
                  </div>
                </div>
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
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">📊 Reporte de Atenciones</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 shadow">
                      <p className="text-sm text-slate-600">Atenciones Totales</p>
                      <p className="text-3xl font-bold text-slate-900">{fichasAtendidas.length}</p>
                      <p className="text-xs text-green-600 mt-1">↑ 12% vs período anterior</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow">
                      <p className="text-sm text-slate-600">Promedio Diario</p>
                      <p className="text-3xl font-bold text-slate-900">{Math.round(fichasAtendidas.length / 7)}</p>
                      <p className="text-xs text-slate-600 mt-1">Últimos 7 días</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow">
                      <p className="text-sm text-slate-600">Tiempo Promedio</p>
                      <p className="text-3xl font-bold text-slate-900">{tiempoEsperaPromedio}</p>
                      <p className="text-xs text-slate-600 mt-1">minutos de espera</p>
                    </div>
                  </div>
                </div>

                {/* Reporte de Recursos */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">💊 Recursos y Medicamentos</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow">
                      <p className="text-sm text-slate-600">Solicitudes Pendientes</p>
                      <p className="text-3xl font-bold text-orange-600">{solicitudesPendientes}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow">
                      <p className="text-sm text-slate-600">Recursos Críticos</p>
                      <p className="text-3xl font-bold text-red-600">0</p>
                      <p className="text-xs text-green-600 mt-1">✓ Stock normal</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow">
                      <p className="text-sm text-slate-600">Autorizadas Hoy</p>
                      <p className="text-3xl font-bold text-green-600">0</p>
                    </div>
                  </div>
                </div>

                {/* Reporte de Personal */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">👥 Personal y Turnos</h3>
                  <div className="space-y-3">
                    {estadisticas?.usuarios_por_rol && Object.entries(estadisticas.usuarios_por_rol).map(([rol, cantidad]: [string, any]) => (
                      <div key={rol} className="flex items-center justify-between bg-white rounded-lg p-3 shadow">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            rol === 'medico' ? 'bg-blue-500/20 text-blue-500' :
                            rol === 'tens' ? 'bg-green-500/20 text-green-500' :
                            rol === 'paramedico' ? 'bg-orange-500/20 text-orange-500' :
                            'bg-purple-500/20 text-purple-500'
                          }`}>
                            {rol === 'medico' ? '👨‍⚕️' : rol === 'tens' ? '👨‍🔬' : rol === 'paramedico' ? '🚑' : '👤'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{
                              rol === 'paramedico' ? 'Paramédicos' :
                              rol === 'tens' ? 'TENS' :
                              rol === 'medico' ? 'Médicos' :
                              'Administradores'
                            }</p>
                            <p className="text-xs text-slate-600">Personal activo</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900">{cantidad}</p>
                          <p className="text-xs text-slate-600">En turno</p>
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
              <Button onClick={() => abrirModalUsuario()}>
                + Crear Usuario
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
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">🏥 Capacidad del Hospital</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow">
                      <label className="text-sm text-slate-700 font-medium block mb-2">Camas Totales</label>
                      <Input 
                        type="number" 
                        value={camasTotales}
                        onChange={(e) => setCamasTotales(Number(e.target.value))}
                        className="bg-white text-slate-900 border-slate-300" 
                      />
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow">
                      <label className="text-sm text-slate-700 font-medium block mb-2">Camas UCI</label>
                      <Input 
                        type="number" 
                        value={camasUCI}
                        onChange={(e) => setCamasUCI(Number(e.target.value))}
                        className="bg-white text-slate-900 border-slate-300" 
                      />
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow">
                      <label className="text-sm text-slate-700 font-medium block mb-2">Salas de Emergencia</label>
                      <Input 
                        type="number" 
                        value={salasEmergencia}
                        onChange={(e) => setSalasEmergencia(Number(e.target.value))}
                        className="bg-white text-slate-900 border-slate-300" 
                      />
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow">
                      <label className="text-sm text-slate-700 font-medium block mb-2">Boxes de Atención</label>
                      <Input 
                        type="number" 
                        value={boxesAtencion}
                        onChange={(e) => setBoxesAtencion(Number(e.target.value))}
                        className="bg-white text-slate-900 border-slate-300" 
                      />
                    </div>
                  </div>
                </div>

                {/* Configuración de Auditoría */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">📝 Auditoría y Logs</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Registro de auditoría</p>
                        <p className="text-sm text-slate-400">Guardar todas las acciones del sistema</p>
                      </div>
                      <Button variant="outline" size="sm">Activado</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Retención de logs</p>
                        <p className="text-sm text-slate-400">Mantener registros por 90 días</p>
                      </div>
                      <Select defaultValue="90">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 días</SelectItem>
                          <SelectItem value="60">60 días</SelectItem>
                          <SelectItem value="90">90 días</SelectItem>
                          <SelectItem value="180">180 días</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleGuardarConfiguracion} className="flex-1">💾 Guardar Cambios</Button>
                  <Button variant="outline" onClick={handleRestaurarConfiguracion} className="flex-1">🔄 Restaurar Valores</Button>
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
    </div>
  )
}
