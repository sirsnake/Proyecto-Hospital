"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/auth"
import { authAPI, fichasAPI, signosVitalesAPI, camasAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ModalBuscarPaciente } from "@/components/modal-buscar-paciente"
import { toast } from "@/hooks/use-toast"

export default function TensDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("ambulancias")
  const [modalBuscarOpen, setModalBuscarOpen] = useState(false)
  const [fichasEnRuta, setFichasEnRuta] = useState<any[]>([])
  const [fichasEnHospital, setFichasEnHospital] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fichaEditando, setFichaEditando] = useState<number | null>(null)
  const [nuevosSignos, setNuevosSignos] = useState({
    presionSistolica: "",
    presionDiastolica: "",
    frecuenciaCardiaca: "",
    frecuenciaRespiratoria: "",
    saturacionO2: "",
    temperatura: "",
    glucosa: "",
    escalaGlasgow: "",
    eva: ""
  })

  // Estados para asignación de camas
  const [camasDisponibles, setCamasDisponibles] = useState<any[]>([])
  const [modalCamasOpen, setModalCamasOpen] = useState(false)
  const [fichaParaCama, setFichaParaCama] = useState<any>(null)
  const [tipoCamaFiltro, setTipoCamaFiltro] = useState('all')

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "tens") {
      router.push("/")
      return
    }
    setUser(currentUser)
    cargarFichas()
    
    // Recargar fichas cada 60 segundos
    const interval = setInterval(cargarFichas, 60000)
    return () => clearInterval(interval)
  }, [router])

  const cargarFichas = async () => {
    try {
      setLoading(true)
      setError("")
      
      // Cargar fichas en ruta
      const enRuta = await fichasAPI.enRuta()
      console.log('🚑 Fichas en ruta:', enRuta)
      setFichasEnRuta(Array.isArray(enRuta) ? enRuta : [])
      
      // Cargar fichas en hospital
      const enHospital = await fichasAPI.enHospital()
      console.log('🏥 Fichas en hospital:', enHospital)
      
      // Log detallado de signos vitales
      if (Array.isArray(enHospital) && enHospital.length > 0) {
        enHospital.forEach((ficha: any) => {
          console.log(`📋 Ficha ${ficha.id} tiene ${ficha.signos_vitales?.length || 0} mediciones de signos vitales:`, ficha.signos_vitales)
        })
      }
      
      setFichasEnHospital(Array.isArray(enHospital) ? enHospital : [])
      
      console.log(`📊 Total: ${enRuta.length || 0} en ruta, ${enHospital.length || 0} en hospital`)
    } catch (err: any) {
      console.error('Error al cargar fichas:', err)
      setError(err.message || "Error al cargar fichas")
      setFichasEnRuta([])
      setFichasEnHospital([])
    } finally {
      setLoading(false)
    }
  }

  const cargarCamasDisponibles = async (tipo?: string) => {
    try {
      const camas = await camasAPI.disponibles(tipo)
      setCamasDisponibles(Array.isArray(camas) ? camas : [])
    } catch (err: any) {
      console.error('Error al cargar camas:', err)
      toast({ title: "Error", description: "No se pudieron cargar las camas disponibles", variant: "destructive" })
    }
  }

  const abrirModalCamas = async (ficha: any) => {
    setFichaParaCama(ficha)
    setModalCamasOpen(true)
    await cargarCamasDisponibles()
  }

  const handleAsignarCama = async (camaId: number) => {
    if (!fichaParaCama) return

    try {
      await camasAPI.asignar(camaId, fichaParaCama.id)
      toast({ title: "✅ Cama asignada", description: `Cama asignada exitosamente al paciente` })
      setModalCamasOpen(false)
      setFichaParaCama(null)
      setCamasDisponibles([])
      await cargarFichas()
    } catch (err: any) {
      console.error('Error al asignar cama:', err)
      toast({ title: "Error", description: err.message || "No se pudo asignar la cama", variant: "destructive" })
    }
  }

  const handleMarcarLlegada = async (fichaId: number) => {
    try {
      setLoading(true)
      setError("")
      
      await fichasAPI.actualizar(fichaId, { estado: 'en_hospital' })
      setSuccess("✅ Paciente marcado como llegado al hospital")
      
      // Recargar fichas para actualizar la lista
      await cargarFichas()
      
      // Cambiar a tab de hospital
      setActiveTab("hospital")
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      console.error('Error al marcar llegada:', err)
      setError(err.message || "Error al marcar llegada del paciente")
    } finally {
      setLoading(false)
    }
  }

  const handleGuardarSignosVitales = async (fichaId: number) => {
    console.log('🔵 handleGuardarSignosVitales llamado con fichaId:', fichaId)
    console.log('🔵 Estado actual nuevosSignos:', nuevosSignos)
    try {
      console.log('🔵 Iniciando try block...')
      setLoading(true)
      setError("")
      
      // Validar que al menos un campo esté completo
      const algunCampoCompleto = Object.values(nuevosSignos).some(val => val !== "")
      console.log('🔵 Campo completo?', algunCampoCompleto)
      if (!algunCampoCompleto) {
        console.log('❌ Validación falló: no hay campos completos')
        setError("Debe completar al menos un signo vital")
        setLoading(false)
        return
      }
      
      // Validar escala de Glasgow (debe estar entre 3 y 15)
      console.log('🔵 Validando Glasgow:', nuevosSignos.escalaGlasgow)
      if (nuevosSignos.escalaGlasgow && (parseInt(nuevosSignos.escalaGlasgow) < 3 || parseInt(nuevosSignos.escalaGlasgow) > 15)) {
        console.log('❌ Validación falló: Glasgow fuera de rango')
        setError("La Escala de Glasgow debe estar entre 3 y 15")
        setLoading(false)
        return
      }
      
      // Validar EVA (debe estar entre 0 y 10)
      console.log('🔵 Validando EVA:', nuevosSignos.eva)
      if (nuevosSignos.eva && (parseInt(nuevosSignos.eva) < 0 || parseInt(nuevosSignos.eva) > 10)) {
        console.log('❌ Validación falló: EVA fuera de rango')
        setError("La escala EVA debe estar entre 0 y 10")
        setLoading(false)
        return
      }
      
      console.log('✅ Validaciones pasadas, preparando datos...')
      
      const data = {
        ficha: fichaId,
        presion_sistolica: nuevosSignos.presionSistolica || null,
        presion_diastolica: nuevosSignos.presionDiastolica || null,
        frecuencia_cardiaca: nuevosSignos.frecuenciaCardiaca || null,
        frecuencia_respiratoria: nuevosSignos.frecuenciaRespiratoria || null,
        saturacion_o2: nuevosSignos.saturacionO2 || null,
        temperatura: nuevosSignos.temperatura || null,
        glucosa: nuevosSignos.glucosa || null,
        escala_glasgow: nuevosSignos.escalaGlasgow || null,
        eva: nuevosSignos.eva || null
      }
      
      console.log('📊 Guardando nuevos signos vitales:', data)
      
      const resultado = await signosVitalesAPI.crear(data)
      console.log('✅ Respuesta del servidor:', resultado)
      setSuccess("✅ Signos vitales actualizados exitosamente")
      
      // Limpiar formulario
      setNuevosSignos({
        presionSistolica: "",
        presionDiastolica: "",
        frecuenciaCardiaca: "",
        frecuenciaRespiratoria: "",
        saturacionO2: "",
        temperatura: "",
        glucosa: "",
        escalaGlasgow: "",
        eva: ""
      })
      setFichaEditando(null)
      
      // Recargar fichas
      console.log('🔄 Recargando fichas después de guardar signos...')
      await cargarFichas()
      console.log('✅ Fichas recargadas')
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      console.error('❌ Error al guardar signos vitales:', err)
      console.error('❌ Stack:', err.stack)
      setError(err.message || "Error al guardar signos vitales")
    } finally {
      console.log('🔵 Finally block - setLoading(false)')
      setLoading(false)
    }
  }

  if (!user) return null

  // Funciones auxiliares para formatear datos
  const formatearSignosVitales = (ficha: any) => {
    const signos = ficha.signos_vitales?.[0] // Tomar el primer registro de signos vitales
    if (!signos) return null
    
    return {
      presion: `${signos.presion_sistolica}/${signos.presion_diastolica}`,
      fc: signos.frecuencia_cardiaca.toString(),
      fr: signos.frecuencia_respiratoria.toString(),
      sato2: `${signos.saturacion_o2}%`,
      temperatura: `${signos.temperatura}°C`,
      glasgow: signos.escala_glasgow?.toString() || "N/A",
      eva: signos.eva ? `${signos.eva}/10` : "N/A",
    }
  }

  const calcularEdad = (paciente: any) => {
    if (paciente.es_nn) {
      return paciente.edad_aproximada ? `~${paciente.edad_aproximada}` : "Desconocida"
    }
    if (paciente.fecha_nacimiento) {
      const hoy = new Date()
      const nacimiento = new Date(paciente.fecha_nacimiento)
      let edad = hoy.getFullYear() - nacimiento.getFullYear()
      const mes = hoy.getMonth() - nacimiento.getMonth()
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--
      }
      return edad
    }
    return "N/A"
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "C1":
        return "bg-red-500"
      case "C2":
        return "bg-orange-500"
      case "C3":
        return "bg-yellow-500"
      case "C4":
        return "bg-green-500"
      case "C5":
        return "bg-slate-500"
      default:
        return "bg-slate-500"
    }
  }

  const getPrioridadLabel = (prioridad: string) => {
    switch (prioridad) {
      case "C1":
        return "C1: Urgencia vital"
      case "C2":
        return "C2: Riesgo vital"
      case "C3":
        return "C3: Patología urgente"
      case "C4":
        return "C4: Urgencia relativa"
      case "C5":
        return "C5: No urgente"
      default:
        return prioridad
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Sistema de Urgencias</h1>
              <p className="text-sm text-slate-400">TENS: {user.nombre_completo || user.first_name + ' ' + user.last_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setModalBuscarOpen(true)}
              className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar Paciente
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await authAPI.logout()
                } catch (error) {
                  console.error('Error al cerrar sesión:', error)
                } finally {
                  localStorage.removeItem("medical_system_user")
                  router.push("/")
                }
              }}
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Mensajes de éxito y error */}
        {success && (
          <Alert className="mb-6 bg-emerald-500/10 border-emerald-500/30 text-emerald-500">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/30 text-red-500">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="ambulancias">
              Ambulancias en Ruta
              {fichasEnRuta.length > 0 && <Badge className="ml-2 bg-red-500">{fichasEnRuta.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="hospital">En Hospital</TabsTrigger>
          </TabsList>

          <TabsContent value="ambulancias" className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {loading && fichasEnRuta.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Cargando fichas...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <svg className="w-6 h-6 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-500">Alerta: {fichasEnRuta.length} ambulancia(s) en ruta</p>
                    <p className="text-sm text-slate-400">Monitoreo en tiempo real - Preparar recepción de pacientes</p>
                  </div>
                  <Button 
                    onClick={cargarFichas} 
                    disabled={loading}
                    variant="outline" 
                    size="sm"
                    className="ml-auto"
                  >
                    {loading ? "Actualizando..." : "Actualizar"}
                  </Button>
                </div>

                {fichasEnRuta.length === 0 ? (
                  <Card className="border-slate-800 bg-slate-900/50">
                    <CardContent className="py-8 text-center">
                      <p className="text-slate-400">No hay ambulancias en ruta en este momento</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {fichasEnRuta.map((ficha) => {
                      const signosVitales = formatearSignosVitales(ficha)
                      return (
                      <Card key={ficha.id} className="border-slate-800 bg-slate-900/50">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                                {ficha.paciente?.es_nn 
                                  ? `Paciente NN (${ficha.paciente.id_temporal})`
                                  : `${ficha.paciente?.nombres || 'Sin nombre'} ${ficha.paciente?.apellidos || ''}`
                                }
                              </CardTitle>
                              <CardDescription className="text-slate-400 mt-1">
                                {ficha.paciente?.sexo} • {calcularEdad(ficha.paciente)} años • Paramédico: {ficha.paramedico_nombre || 'N/A'}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={getPrioridadColor(ficha.prioridad)}>
                                {getPrioridadLabel(ficha.prioridad)}
                              </Badge>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-white">ETA: {ficha.eta}</p>
                                <p className="text-xs text-slate-400">Tiempo estimado</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-white mb-2">Motivo de Consulta:</h4>
                            <p className="text-sm text-slate-300">{ficha.motivo_consulta}</p>
                          </div>

                          {ficha.circunstancias && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">Circunstancias:</h4>
                              <p className="text-sm text-slate-300">{ficha.circunstancias}</p>
                            </div>
                          )}

                          {signosVitales && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">Signos Vitales (Paramédico):</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">Presión Arterial</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.presion}</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">FC</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.fc} lpm</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">FR</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.fr} rpm</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">SatO₂</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.sato2}</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">Temperatura</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.temperatura}</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">Glasgow</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.glasgow}</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg col-span-2">
                                  <p className="text-xs text-slate-400">EVA (Escala de Dolor)</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.eva}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-sm text-blue-400">
                              📋 Ambulancia en tránsito - Los datos se actualizan automáticamente cada 60 segundos
                            </p>
                          </div>

                          <div className="flex gap-3 mt-4">
                            <Button 
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleMarcarLlegada(ficha.id)}
                              disabled={loading}
                            >
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              ✅ Paciente Ya Llegó
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="hospital" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Pacientes en Hospital</CardTitle>
                <CardDescription className="text-slate-400">
                  Verifique signos vitales de pacientes que llegaron al hospital
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fichasEnHospital.map((ficha) => {
                    const signosFormateados = formatearSignosVitales(ficha.signos_vitales)
                    const edad = calcularEdad(ficha.paciente)
                    const nombrePaciente = ficha.paciente.es_nn 
                      ? `NN - ${ficha.paciente.id_temporal || 'Sin ID'}`
                      : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`
                    
                    return (
                      <div key={ficha.id} className="p-4 border border-slate-700 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-white">{nombrePaciente}</h3>
                            <p className="text-sm text-slate-400">
                              {edad} • Llegó: {new Date(ficha.fecha_actualizacion).toLocaleString('es-CL')}
                            </p>
                          </div>
                          <Badge className={getPrioridadColor(ficha.nivel_prioridad)}>
                            {getPrioridadLabel(ficha.nivel_prioridad)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300 mb-3">{ficha.motivo_consulta}</p>

                        {/* Mostrar TODOS los signos vitales */}
                        {ficha.signos_vitales && ficha.signos_vitales.length > 0 ? (
                          <div className="mb-4 space-y-3">
                            {ficha.signos_vitales.map((signos: any, index: number) => (
                              <div key={signos.id} className="p-3 bg-slate-800/30 rounded-lg">
                                <p className="text-xs font-semibold text-slate-400 mb-2">
                                  {index === 0 ? '📋 Signos Vitales - Paramédico' : `📊 Signos Vitales - TENS (Medición ${index})`}
                                  <span className="ml-2 text-slate-500">
                                    {signos.timestamp ? new Date(signos.timestamp).toLocaleString('es-CL', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : 'N/A'}
                                  </span>
                                </p>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                  <div>
                                    <p className="text-slate-500">PA</p>
                                    <p className="text-white font-semibold">{signos.presion_sistolica}/{signos.presion_diastolica}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">FC</p>
                                    <p className="text-white font-semibold">{signos.frecuencia_cardiaca}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">FR</p>
                                    <p className="text-white font-semibold">{signos.frecuencia_respiratoria}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">SatO₂</p>
                                    <p className="text-white font-semibold">{signos.saturacion_o2}%</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Temp</p>
                                    <p className="text-white font-semibold">{signos.temperatura}°C</p>
                                  </div>
                                  {signos.escala_glasgow && (
                                    <div>
                                      <p className="text-slate-500">Glasgow</p>
                                      <p className="text-white font-semibold">{signos.escala_glasgow}</p>
                                    </div>
                                  )}
                                  {signos.eva !== null && signos.eva !== undefined && (
                                    <div>
                                      <p className="text-slate-500">EVA</p>
                                      <p className="text-white font-semibold">{signos.eva}/10</p>
                                    </div>
                                  )}
                                  {signos.glucosa && (
                                    <div>
                                      <p className="text-slate-500">Glucosa</p>
                                      <p className="text-white font-semibold">{signos.glucosa}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <p className="text-sm text-amber-500">⚠️ Sin signos vitales registrados</p>
                          </div>
                        )}

                        {fichaEditando === ficha.id ? (
                          <div className="mt-4 p-4 border border-blue-500/30 bg-blue-500/5 rounded-lg space-y-4">
                            <h4 className="font-semibold text-white mb-3">📊 Nuevos Signos Vitales (TENS)</h4>
                            
                            {error && (
                              <Alert className="bg-red-500/10 border-red-500 text-red-500">
                                <AlertDescription className="font-semibold">
                                  ⚠️ {error}
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-slate-300 text-xs">Presión Sistólica (mmHg)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="120"
                                  value={nuevosSignos.presionSistolica}
                                  onChange={(e) => setNuevosSignos({...nuevosSignos, presionSistolica: e.target.value})}
                                  className="bg-slate-800 border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs">Presión Diastólica (mmHg)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="80"
                                  value={nuevosSignos.presionDiastolica}
                                  onChange={(e) => setNuevosSignos({...nuevosSignos, presionDiastolica: e.target.value})}
                                  className="bg-slate-800 border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs">FC (lpm)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="75"
                                  value={nuevosSignos.frecuenciaCardiaca}
                                  onChange={(e) => setNuevosSignos({...nuevosSignos, frecuenciaCardiaca: e.target.value})}
                                  className="bg-slate-800 border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs">FR (rpm)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="16"
                                  value={nuevosSignos.frecuenciaRespiratoria}
                                  onChange={(e) => setNuevosSignos({...nuevosSignos, frecuenciaRespiratoria: e.target.value})}
                                  className="bg-slate-800 border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs">SatO₂ (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="98"
                                  value={nuevosSignos.saturacionO2}
                                  onChange={(e) => setNuevosSignos({...nuevosSignos, saturacionO2: e.target.value})}
                                  className="bg-slate-800 border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs">Temperatura (°C)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="36.5"
                                  value={nuevosSignos.temperatura}
                                  onChange={(e) => setNuevosSignos({...nuevosSignos, temperatura: e.target.value})}
                                  className="bg-slate-800 border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs">Glucosa (mg/dL)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="90"
                                  value={nuevosSignos.glucosa}
                                  onChange={(e) => setNuevosSignos({...nuevosSignos, glucosa: e.target.value})}
                                  className="bg-slate-800 border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs">Escala Glasgow</Label>
                                <Select
                                  value={nuevosSignos.escalaGlasgow}
                                  onValueChange={(value) => setNuevosSignos({...nuevosSignos, escalaGlasgow: value})}
                                >
                                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Seleccionar nivel de consciencia" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="15" className="text-white hover:bg-slate-700">15 - Consciente y orientado</SelectItem>
                                    <SelectItem value="14" className="text-white hover:bg-slate-700">14 - Confuso</SelectItem>
                                    <SelectItem value="13" className="text-white hover:bg-slate-700">13 - Respuesta verbal inapropiada</SelectItem>
                                    <SelectItem value="8" className="text-white hover:bg-slate-700">8 - Semiconsciente</SelectItem>
                                    <SelectItem value="3" className="text-white hover:bg-slate-700">3 - Inconsciente</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs">EVA - Escala Visual Análoga del Dolor</Label>
                                <Select
                                  value={nuevosSignos.eva}
                                  onValueChange={(value) => setNuevosSignos({...nuevosSignos, eva: value})}
                                >
                                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Seleccionar nivel de dolor" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="0" className="text-white hover:bg-slate-700">0 - Sin dolor</SelectItem>
                                    <SelectItem value="1" className="text-white hover:bg-slate-700">1/10 - Dolor leve</SelectItem>
                                    <SelectItem value="2" className="text-white hover:bg-slate-700">2/10 - Dolor leve</SelectItem>
                                    <SelectItem value="3" className="text-white hover:bg-slate-700">3/10 - Dolor leve</SelectItem>
                                    <SelectItem value="4" className="text-white hover:bg-slate-700">4/10 - Dolor moderado</SelectItem>
                                    <SelectItem value="5" className="text-white hover:bg-slate-700">5/10 - Dolor moderado</SelectItem>
                                    <SelectItem value="6" className="text-white hover:bg-slate-700">6/10 - Dolor moderado</SelectItem>
                                    <SelectItem value="7" className="text-white hover:bg-slate-700">7/10 - Dolor severo</SelectItem>
                                    <SelectItem value="8" className="text-white hover:bg-slate-700">8/10 - Dolor severo</SelectItem>
                                    <SelectItem value="9" className="text-white hover:bg-slate-700">9/10 - Dolor severo</SelectItem>
                                    <SelectItem value="10" className="text-white hover:bg-slate-700">10/10 - Dolor insoportable</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                type="button"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleGuardarSignosVitales(ficha.id)}
                                disabled={loading}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Guardar Signos Vitales
                              </Button>
                              <Button 
                                type="button"
                                variant="outline" 
                                onClick={() => {
                                  setFichaEditando(null)
                                  setNuevosSignos({
                                    presionSistolica: "", presionDiastolica: "", frecuenciaCardiaca: "",
                                    frecuenciaRespiratoria: "", saturacionO2: "", temperatura: "",
                                    glucosa: "", escalaGlasgow: "", eva: ""
                                  })
                                }}
                                className="border-slate-700"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              onClick={() => setFichaEditando(ficha.id)}
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              📊 Medir Signos Vitales
                            </Button>
                            <Button
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-700"
                              onClick={() => abrirModalCamas(ficha)}
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 12h18M3 12l4-4m-4 4l4 4m10-4l-4-4m4 4l-4 4"
                                />
                              </svg>
                              🛏️ Asignar Cama
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <ModalBuscarPaciente 
        open={modalBuscarOpen} 
        onOpenChange={setModalBuscarOpen} 
      />

      {/* Modal Asignación de Camas */}
      <Dialog open={modalCamasOpen} onOpenChange={setModalCamasOpen}>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-800" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white">
              🛏️ Asignar Cama - {fichaParaCama && (fichaParaCama.paciente.es_nn 
                ? `NN - ${fichaParaCama.paciente.id_temporal || 'Sin ID'}`
                : `${fichaParaCama.paciente.nombres} ${fichaParaCama.paciente.apellidos}`)}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Seleccione una cama disponible para asignar al paciente
            </DialogDescription>
          </DialogHeader>

          {/* Filtro por tipo de cama */}
          <div className="mb-4">
            <Label htmlFor="tipoCamaFiltro" className="text-slate-300 mb-2 block">
              Filtrar por tipo de cama
            </Label>
            <Select
              value={tipoCamaFiltro}
              onValueChange={async (value) => {
                setTipoCamaFiltro(value)
                await cargarCamasDisponibles(value !== 'all' ? value : undefined)
              }}
            >
              <SelectTrigger className="bg-slate-800 text-white border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">Todas las camas</SelectItem>
                <SelectItem value="general" className="text-white">🛏️ Camas Generales</SelectItem>
                <SelectItem value="uci" className="text-white">🏥 Camas UCI</SelectItem>
                <SelectItem value="emergencia" className="text-white">🚨 Salas de Emergencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de camas disponibles */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {camasDisponibles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No hay camas disponibles del tipo seleccionado</p>
              </div>
            ) : (
              camasDisponibles.map((cama: any) => (
                <Card
                  key={cama.id}
                  className="border-slate-700 bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
                  onClick={() => handleAsignarCama(cama.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-white">{cama.numero}</span>
                          <Badge variant="outline" className="border-blue-500 text-blue-400">
                            {cama.tipo === 'general' ? '🛏️ General' :
                             cama.tipo === 'uci' ? '🏥 UCI' : '🚨 Emergencia'}
                          </Badge>
                          <Badge variant="outline" className="border-green-500 text-green-400">
                            ✅ Disponible
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-400 space-y-1">
                          {cama.sala && <p>📍 Sala: {cama.sala}</p>}
                          {cama.piso && <p>🏢 Piso: {cama.piso}</p>}
                          {cama.descripcion && <p>{cama.descripcion}</p>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAsignarCama(cama.id)
                        }}
                      >
                        Asignar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
