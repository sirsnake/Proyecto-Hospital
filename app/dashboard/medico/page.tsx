"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSession } from "@/lib/auth"
import { authAPI, fichasAPI, solicitudesMedicamentosAPI, diagnosticosAPI, solicitudesExamenesAPI, documentosAPI, camasAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModalExamenes } from "@/components/modal-examenes"
import { ModalBuscarPaciente } from "@/components/modal-buscar-paciente"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChatFlotante } from "@/components/chat-flotante"
import { toast } from "@/hooks/use-toast"

export default function MedicoDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("casos")
  const [modalBuscarOpen, setModalBuscarOpen] = useState(false)
  const [fichasActivas, setFichasActivas] = useState<any[]>([])
  const [fichasAtendidas, setFichasAtendidas] = useState<any[]>([])
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<any[]>([])
  const [modalExamenesOpen, setModalExamenesOpen] = useState(false)
  const [fichaSeleccionada, setFichaSeleccionada] = useState<any>(null)
  const [fichaParaExamen, setFichaParaExamen] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [motivoRechazo, setMotivoRechazo] = useState<{ [key: number]: string }>({})
  
  // Estado para el formulario de diagnóstico
  const [diagnosticoForm, setDiagnosticoForm] = useState({
    codigoCIE10: "",
    diagnostico: "",
    indicaciones: "",
    medicamentos: "",
    tipoAlta: ""
  })
  const [diagnosticoGuardado, setDiagnosticoGuardado] = useState(false)
  
  // Estados para gestión de camas
  const [camasDisponibles, setCamasDisponibles] = useState<any[]>([])
  const [modalCamasOpen, setModalCamasOpen] = useState(false)
  const [fichaParaCama, setFichaParaCama] = useState<any>(null)
  const [tipoCamaFiltro, setTipoCamaFiltro] = useState("all")

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "medico") {
      router.push("/")
      return
    }
    setUser(currentUser)
    
    // Verificar si hay un parámetro tab en la URL
    const tab = searchParams?.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
    
    cargarDatos()
    
    // Auto-refresh cada 60 segundos
    const interval = setInterval(cargarDatos, 60000)
    return () => clearInterval(interval)
  }, [router])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError("")
      
      // Cargar fichas en hospital
      const fichasResponse = await fichasAPI.enHospital()
      
      // Transformar datos de snake_case a camelCase
      const fichasTransformadas = (Array.isArray(fichasResponse) ? fichasResponse : []).map((ficha: any) => ({
        id: ficha.id,
        paciente: {
          id: ficha.paciente?.id,
          rut: ficha.paciente?.rut,
          nombres: ficha.paciente?.nombres,
          apellidos: ficha.paciente?.apellidos,
          sexo: ficha.paciente?.sexo,
          esNN: ficha.paciente?.es_nn || false,
          idTemporal: ficha.paciente?.id_temporal
        },
        paramedico: ficha.paramedico_nombre || `Paramédico #${ficha.paramedico}`,
        motivoConsulta: ficha.motivo_consulta,
        circunstancias: ficha.circunstancias,
        sintomas: ficha.sintomas,
        nivelConsciencia: ficha.nivel_consciencia,
        estado: ficha.estado,
        prioridad: ficha.prioridad,
        eta: ficha.eta,
        signosVitales: (ficha.signos_vitales || []).map((sv: any) => ({
          id: sv.id,
          presionSistolica: sv.presion_sistolica,
          presionDiastolica: sv.presion_diastolica,
          frecuenciaCardiaca: sv.frecuencia_cardiaca,
          frecuenciaRespiratoria: sv.frecuencia_respiratoria,
          saturacionO2: sv.saturacion_o2,
          temperatura: sv.temperatura,
          glucosa: sv.glucosa,
          escalaGlasgow: sv.escala_glasgow,
          eva: sv.eva,
          fechaRegistro: sv.fecha_registro
        })),
        anamnesis: ficha.anamnesis ? {
          tens: ficha.anamnesis.tens_nombre || `TENS #${ficha.anamnesis.tens}`,
          antecedentesMorbidos: ficha.anamnesis.antecedentes_morbidos,
          medicamentosHabituales: ficha.anamnesis.medicamentos_habituales,
          alergiasMedicamentosas: ficha.anamnesis.alergias_medicamentosas || [],
          alergiasCriticas: (ficha.anamnesis.alergias_medicamentosas || []).length > 0,
          antecedentesQuirurgicos: ficha.anamnesis.antecedentes_quirurgicos
        } : null,
        solicitudesExamenes: (ficha.solicitudes_examenes || []).map((se: any) => ({
          id: se.id,
          medico: se.medico_nombre || `Médico #${se.medico}`,
          tipoExamen: se.tipo_examen,
          examenesEspecificos: se.examenes_especificos,
          justificacion: se.justificacion,
          prioridad: se.prioridad,
          estado: se.estado,
          fechaSolicitud: se.fecha_solicitud
        }))
      }))
      
      setFichasActivas(fichasTransformadas)
      
      // Cargar solicitudes pendientes
      const solicitudesResponse = await solicitudesMedicamentosAPI.pendientes()
      
      const solicitudesTransformadas = (Array.isArray(solicitudesResponse) ? solicitudesResponse : []).map((sol: any) => ({
        id: sol.id,
        ficha: sol.ficha,
        paramedico: sol.paramedico_nombre || `Paramédico #${sol.paramedico}`,
        medicamento: sol.medicamento,
        dosis: sol.dosis,
        justificacion: sol.justificacion,
        estado: sol.estado
      }))
      
      setSolicitudesPendientes(solicitudesTransformadas)
      
      // Cargar fichas atendidas (con diagnóstico)
      const fichasAtendidasResponse = await fichasAPI.atendidas()
      
      const fichasConDiagnostico = (Array.isArray(fichasAtendidasResponse) ? fichasAtendidasResponse : [])
        .map((ficha: any) => ({
          id: ficha.id,
          paciente: {
            id: ficha.paciente?.id,
            rut: ficha.paciente?.rut,
            nombres: ficha.paciente?.nombres,
            apellidos: ficha.paciente?.apellidos,
            esNN: ficha.paciente?.es_nn || false,
            idTemporal: ficha.paciente?.id_temporal
          },
          diagnostico: ficha.diagnostico,
          fechaRegistro: ficha.fecha_registro,
          estado: ficha.estado
        }))
      setFichasAtendidas(fichasConDiagnostico)
      
    } catch (err: any) {
      console.error('Error al cargar datos:', err)
      setError(err.message || "Error al cargar datos")
      setFichasActivas([])
      setSolicitudesPendientes([])
      setFichasAtendidas([])
    } finally {
      setLoading(false)
    }
  }

  const cargarCamasDisponibles = async (tipo?: string) => {
    try {
      const camas = await camasAPI.disponibles(tipo !== 'all' ? tipo : undefined)
      setCamasDisponibles(Array.isArray(camas) ? camas : [])
    } catch (err: any) {
      console.error('Error cargando camas:', err)
      toast({
        title: "Error",
        description: "No se pudieron cargar las camas disponibles",
        variant: "destructive"
      })
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
      setLoading(true)
      await camasAPI.asignar(camaId, fichaParaCama.id)
      toast({
        title: "Cama asignada",
        description: `Cama asignada exitosamente al paciente ${fichaParaCama.paciente.nombres} ${fichaParaCama.paciente.apellidos}`,
      })
      setModalCamasOpen(false)
      setFichaParaCama(null)
      await cargarDatos()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo asignar la cama",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAutorizarMedicamento = async (solicitudId: number) => {
    try {
      setLoading(true)
      setError("")
      
      await solicitudesMedicamentosAPI.autorizar(solicitudId)
      setSuccess("Medicamento autorizado exitosamente")
      await cargarDatos()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      setError(err.message || "Error al autorizar medicamento")
    } finally {
      setLoading(false)
    }
  }

  const handleRechazarMedicamento = async (solicitudId: number) => {
    try {
      setLoading(true)
      setError("")
      
      const motivo = motivoRechazo[solicitudId]
      if (!motivo) {
        setError("Debe ingresar un motivo de rechazo")
        return
      }
      
      await solicitudesMedicamentosAPI.rechazar(solicitudId, motivo)
      setSuccess("Solicitud rechazada")
      setMotivoRechazo((prev) => {
        const newState = { ...prev }
        delete newState[solicitudId]
        return newState
      })
      await cargarDatos()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      setError(err.message || "Error al rechazar medicamento")
    } finally {
      setLoading(false)
    }
  }

  const handleAbrirDiagnostico = (ficha: any) => {
    setFichaSeleccionada(ficha)
    setDiagnosticoGuardado(false)
    setDiagnosticoForm({
      codigoCIE10: "",
      diagnostico: "",
      indicaciones: "",
      medicamentos: "",
      tipoAlta: ""
    })
    setActiveTab("diagnostico")
  }

  const handleAbrirExamenes = (ficha: any) => {
    setFichaParaExamen(ficha)
    setModalExamenesOpen(true)
  }
  
  const handleVerFichaAtendida = (ficha: any) => {
    setFichaSeleccionada(ficha)
    setDiagnosticoGuardado(true)
    setActiveTab("diagnostico")
  }

  const handleConfirmExamenes = async (solicitud: any) => {
    try {
      setLoading(true)
      setError("")
      
      const data = {
        ficha: fichaParaExamen.id,
        medico: user.id,
        tipo_examen: solicitud.tipoExamen,
        examenes_especificos: solicitud.examenesEspecificos,
        justificacion: solicitud.justificacion,
        prioridad: solicitud.prioridad
      }
      
      const response = await solicitudesExamenesAPI.crear(data)
      
      setSuccess("✅ Exámenes solicitados exitosamente")
      setFichaParaExamen(null)
      setModalExamenesOpen(false)
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      console.error('Error al solicitar exámenes:', err)
      setError(err.message || "Error al solicitar exámenes")
    } finally {
      setLoading(false)
    }
  }

  const handleGuardarDiagnostico = async () => {
    try {
      setLoading(true)
      setError("")
      
      if (!diagnosticoForm.codigoCIE10 || !diagnosticoForm.diagnostico || !diagnosticoForm.indicaciones || !diagnosticoForm.tipoAlta) {
        setError("⚠️ Por favor complete todos los campos obligatorios")
        return
      }
      
      const data = {
        ficha: fichaSeleccionada.id,
        medico: user.id,
        diagnostico_cie10: diagnosticoForm.codigoCIE10,
        descripcion: diagnosticoForm.diagnostico,
        indicaciones_medicas: diagnosticoForm.indicaciones,
        medicamentos_prescritos: diagnosticoForm.medicamentos || ""
      }
      
      const response = await diagnosticosAPI.crear(data)
      
      setSuccess("✅ Diagnóstico guardado exitosamente. Paciente dado de alta.")
      setDiagnosticoGuardado(true)
      
      await cargarDatos()
      
      setTimeout(() => setSuccess(""), 5000)
    } catch (err: any) {
      console.error('Error al guardar diagnóstico:', err)
      setError(err.message || "Error al guardar diagnóstico")
    } finally {
      setLoading(false)
    }
  }

  const handleCerrarSesion = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      localStorage.removeItem("medical_system_user")
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
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Sistema de Urgencias</h1>
              <p className="text-sm text-slate-400">Médico: {user.nombre_completo || user.first_name + ' ' + user.last_name}</p>
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
            <Button variant="outline" onClick={handleCerrarSesion}>
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

        {solicitudesPendientes.length > 0 && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-amber-500">Solicitudes de Medicamentos Pendientes</p>
                <p className="text-sm text-slate-400">
                  Tienes {solicitudesPendientes.length} solicitud(es) de autorización de medicamentos
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="casos">Casos Activos</TabsTrigger>
            <TabsTrigger value="autorizaciones">
              Autorizaciones
              {solicitudesPendientes.length > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white">{solicitudesPendientes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="atendidos">Pacientes Atendidos</TabsTrigger>
          </TabsList>

          {/* Casos Activos */}
          <TabsContent value="casos" className="space-y-6">
            {fichasActivas.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 text-slate-600 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-slate-400 mb-2">No hay casos activos en este momento</p>
                    <p className="text-sm text-slate-500">Los pacientes que lleguen al hospital aparecerán aquí</p>
                    <Button onClick={cargarDatos} variant="outline" className="mt-4 border-slate-700">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Actualizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {fichasActivas.map((ficha) => (
                <Card key={ficha.id} className="border-slate-800 bg-slate-900/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-white">
                            {ficha.paciente.esNN
                              ? `Paciente NN (${ficha.paciente.idTemporal})`
                              : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`}
                          </CardTitle>
                          <Badge
                            variant={
                              ficha.prioridad === "rojo"
                                ? "destructive"
                                : ficha.prioridad === "amarillo"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {ficha.prioridad === "rojo"
                              ? "🔴 CRÍTICO"
                              : ficha.prioridad === "amarillo"
                                ? "🟡 URGENTE"
                                : "🟢 NO URGENTE"}
                          </Badge>
                          <Badge variant="outline" className="border-slate-700">
                            {ficha.estado === "en_ruta" ? "🚑 En Ruta" : "🏥 En Hospital"}
                          </Badge>
                        </div>
                        <CardDescription className="text-slate-400">
                          {!ficha.paciente.esNN && `RUT: ${ficha.paciente.rut} • `}
                          Sexo: {ficha.paciente.sexo} • Paramédico: {ficha.paramedico}
                          {ficha.eta && ` • ETA: ${ficha.eta}`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Datos del Paramédico */}
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <h4 className="font-semibold text-emerald-500 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Registro Paramédico
                      </h4>
                      <p className="text-sm text-slate-300 mb-3">
                        <strong>Motivo:</strong> {ficha.motivoConsulta}
                      </p>
                      <p className="text-sm text-slate-300 mb-3">
                        <strong>Circunstancias:</strong> {ficha.circunstancias}
                      </p>

                      {/* Mostrar todas las mediciones de signos vitales */}
                      {ficha.signosVitales && ficha.signosVitales.length > 0 ? (
                        <div className="space-y-3 mt-3">
                          {ficha.signosVitales.map((signos: any, index: number) => (
                            <div key={signos.id} className="border-t border-slate-700 pt-3">
                              <p className="text-xs text-slate-400 mb-2">
                                {index === 0 ? '📋 Signos Vitales - Paramédico' : `📊 Signos Vitales - TENS (Medición ${index})`}
                                {signos.fechaRegistro && ` • ${new Date(signos.fechaRegistro).toLocaleString('es-CL')}`}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="p-2 bg-slate-800/50 rounded">
                                  <p className="text-xs text-slate-400">Presión</p>
                                  <p className="text-sm font-semibold text-white">
                                    {signos.presionSistolica}/{signos.presionDiastolica}
                                  </p>
                                </div>
                                <div className="p-2 bg-slate-800/50 rounded">
                                  <p className="text-xs text-slate-400">FC</p>
                                  <p className="text-sm font-semibold text-white">
                                    {signos.frecuenciaCardiaca} lpm
                                  </p>
                                </div>
                                <div className="p-2 bg-slate-800/50 rounded">
                                  <p className="text-xs text-slate-400">SatO₂</p>
                                  <p className="text-sm font-semibold text-white">{signos.saturacionO2}%</p>
                                </div>
                                <div className="p-2 bg-slate-800/50 rounded">
                                  <p className="text-xs text-slate-400">Temp</p>
                                  <p className="text-sm font-semibold text-white">{signos.temperatura}°C</p>
                                </div>
                                {signos.glucosa && (
                                  <div className="p-2 bg-slate-800/50 rounded">
                                    <p className="text-xs text-slate-400">Glucosa</p>
                                    <p className="text-sm font-semibold text-white">{signos.glucosa} mg/dL</p>
                                  </div>
                                )}
                                {signos.escalaGlasgow && (
                                  <div className="p-2 bg-slate-800/50 rounded">
                                    <p className="text-xs text-slate-400">Glasgow</p>
                                    <p className="text-sm font-semibold text-white">{signos.escalaGlasgow}</p>
                                  </div>
                                )}
                                {signos.eva !== null && signos.eva !== undefined && (
                                  <div className="p-2 bg-slate-800/50 rounded">
                                    <p className="text-xs text-slate-400">EVA</p>
                                    <p className="text-sm font-semibold text-white">{signos.eva}/10</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 mt-3">Sin signos vitales registrados</p>
                      )}
                    </div>

                    {/* Anamnesis del TENS */}
                    {ficha.anamnesis && (
                      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <h4 className="font-semibold text-blue-500 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Anamnesis TENS - {ficha.anamnesis.tens}
                        </h4>

                        {ficha.anamnesis.alergiasCriticas && (
                          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded">
                            <p className="text-sm font-semibold text-red-500">⚠️ ALERGIAS MEDICAMENTOSAS:</p>
                            <p className="text-sm text-red-400">{ficha.anamnesis.alergiasMedicamentosas.join(", ")}</p>
                          </div>
                        )}

                        <div className="space-y-2 text-sm text-slate-300">
                          <p>
                            <strong>Antecedentes Mórbidos:</strong> {ficha.anamnesis.antecedentesMorbidos}
                          </p>
                          <p>
                            <strong>Medicamentos Habituales:</strong> {ficha.anamnesis.medicamentosHabituales}
                          </p>
                          {ficha.anamnesis.antecedentesQuirurgicos && (
                            <p>
                              <strong>Antecedentes Quirúrgicos:</strong> {ficha.anamnesis.antecedentesQuirurgicos}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Exámenes Solicitados */}
                    {ficha.solicitudesExamenes && ficha.solicitudesExamenes.length > 0 && (
                      <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-2">🧪 Exámenes Solicitados</h4>
                        <div className="space-y-2">
                          {ficha.solicitudesExamenes.map((examen: any) => (
                            <div key={examen.id} className="p-2 bg-slate-800/50 rounded">
                              <div className="flex items-start justify-between mb-1">
                                <p className="text-sm font-medium text-white">{examen.tipoExamen}</p>
                                <Badge className={
                                  examen.estado === 'pendiente' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                                  examen.estado === 'en_proceso' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' :
                                  examen.estado === 'realizado' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                                  'bg-red-500/20 text-red-500 border-red-500/30'
                                }>
                                  {examen.estado === 'pendiente' ? '⏳ Pendiente' :
                                   examen.estado === 'en_proceso' ? '🔬 En Proceso' :
                                   examen.estado === 'realizado' ? '✅ Realizado' : '❌ Rechazado'}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-400">{examen.examenesEspecificos}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Solicitado: {new Date(examen.fechaSolicitud).toLocaleString('es-CL')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleAbrirDiagnostico(ficha)}
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Realizar Diagnóstico
                        </Button>
                        <Button 
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => handleAbrirExamenes(ficha)}
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          Solicitar Exámenes
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => router.push(`/dashboard/medico/documentos/${ficha.id}`)}
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Ver Ficha y Documentos
                        </Button>
                        <Button
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                          onClick={() => abrirModalCamas(ficha)}
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </TabsContent>

          {/* Autorizaciones de Medicamentos */}
          <TabsContent value="autorizaciones" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Solicitudes de Autorización de Medicamentos</CardTitle>
                <CardDescription className="text-slate-400">
                  Revisa y autoriza las solicitudes de medicamentos de los paramédicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {solicitudesPendientes.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 text-slate-600 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-slate-400">No hay solicitudes pendientes de autorización</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {solicitudesPendientes.map((solicitud) => (
                      <div key={solicitud.id} className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white text-lg">{solicitud.medicamento}</h4>
                            <p className="text-sm text-slate-400">Dosis: {solicitud.dosis}</p>
                            <p className="text-sm text-slate-400">Solicitado por: {solicitud.paramedico}</p>
                          </div>
                          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Pendiente</Badge>
                        </div>

                        <div className="mb-4 p-3 bg-slate-800/50 rounded">
                          <p className="text-sm font-semibold text-slate-300 mb-1">Justificación Clínica:</p>
                          <p className="text-sm text-slate-400">{solicitud.justificacion}</p>
                        </div>

                        <div className="space-y-2">
                          <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleAutorizarMedicamento(solicitud.id)}
                            disabled={loading}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Autorizar Medicamento
                          </Button>
                          
                          <div className="flex gap-2">
                            <Input
                              placeholder="Motivo de rechazo..."
                              value={motivoRechazo[solicitud.id] || ""}
                              onChange={(e) => setMotivoRechazo({ ...motivoRechazo, [solicitud.id]: e.target.value })}
                              className="flex-1 bg-slate-800 border-slate-700 text-white"
                            />
                            <Button
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleRechazarMedicamento(solicitud.id)}
                              disabled={loading || !motivoRechazo[solicitud.id]}
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
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

          {/* Diagnóstico - Página completa */}
          <TabsContent value="diagnostico" className="space-y-6">
            {fichaSeleccionada ? (
              <div className="space-y-6">
                {/* Resumen del Paciente */}
                <Card className="border-slate-800 bg-slate-900/50">
                  <CardHeader>
                    <CardTitle className="text-white text-2xl">
                      {fichaSeleccionada.paciente.esNN 
                        ? `Paciente NN (${fichaSeleccionada.paciente.idTemporal})`
                        : `${fichaSeleccionada.paciente.nombres} ${fichaSeleccionada.paciente.apellidos}`
                      }
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Ficha #{fichaSeleccionada.id} • {fichaSeleccionada.motivoConsulta}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {fichaSeleccionada.signosVitales && fichaSeleccionada.signosVitales.length > 0 && (
                        <>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <p className="text-xs text-slate-400">PA</p>
                            <p className="text-lg font-semibold text-white">
                              {fichaSeleccionada.signosVitales[0].presionSistolica}/
                              {fichaSeleccionada.signosVitales[0].presionDiastolica}
                            </p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <p className="text-xs text-slate-400">FC</p>
                            <p className="text-lg font-semibold text-white">
                              {fichaSeleccionada.signosVitales[0].frecuenciaCardiaca} lpm
                            </p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <p className="text-xs text-slate-400">SatO₂</p>
                            <p className="text-lg font-semibold text-white">
                              {fichaSeleccionada.signosVitales[0].saturacionO2}%
                            </p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <p className="text-xs text-slate-400">Temp</p>
                            <p className="text-lg font-semibold text-white">
                              {fichaSeleccionada.signosVitales[0].temperatura}°C
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {fichaSeleccionada.anamnesis?.alergiasCriticas && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-sm font-semibold text-red-500">⚠️ ALERGIAS MEDICAMENTOSAS:</p>
                        <p className="text-sm text-red-400">
                          {fichaSeleccionada.anamnesis.alergiasMedicamentosas.join(", ")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!diagnosticoGuardado ? (
                  /* Formulario de Diagnóstico */
                  <Card className="border-slate-800 bg-slate-900/50">
                    <CardHeader>
                      <CardTitle className="text-white">Diagnóstico y Alta Médica</CardTitle>
                      <CardDescription className="text-slate-400">
                        Complete el diagnóstico e indicaciones médicas
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">
                          Código CIE-10 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="Ej: I21.9"
                          value={diagnosticoForm.codigoCIE10}
                          onChange={(e) => setDiagnosticoForm({...diagnosticoForm, codigoCIE10: e.target.value})}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">
                          Diagnóstico <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          placeholder="Ej: Infarto agudo del miocardio"
                          value={diagnosticoForm.diagnostico}
                          onChange={(e) => setDiagnosticoForm({...diagnosticoForm, diagnostico: e.target.value})}
                          className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">
                          Indicaciones Médicas <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          placeholder="Indicaciones y tratamiento..."
                          value={diagnosticoForm.indicaciones}
                          onChange={(e) => setDiagnosticoForm({...diagnosticoForm, indicaciones: e.target.value})}
                          className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">Medicamentos Prescritos</Label>
                        <Textarea
                          placeholder="Aspirina 100mg cada 24 horas&#10;Enalapril 10mg cada 12 horas..."
                          value={diagnosticoForm.medicamentos}
                          onChange={(e) => setDiagnosticoForm({...diagnosticoForm, medicamentos: e.target.value})}
                          className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">
                          Tipo de Alta <span className="text-red-500">*</span>
                        </Label>
                        <Select 
                          value={diagnosticoForm.tipoAlta} 
                          onValueChange={(value) => setDiagnosticoForm({...diagnosticoForm, tipoAlta: value})}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue placeholder="Seleccionar tipo de alta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="domicilio">Alta a Domicilio</SelectItem>
                            <SelectItem value="hospitalizacion">Hospitalización</SelectItem>
                            <SelectItem value="derivacion">Derivación a Especialista</SelectItem>
                            <SelectItem value="uci">Ingreso a UCI</SelectItem>
                            <SelectItem value="fallecido">Fallecido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={handleGuardarDiagnostico}
                          disabled={loading}
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Guardar Diagnóstico
                        </Button>
                        <Button
                          variant="outline"
                          className="border-slate-700"
                          onClick={() => {
                            setFichaSeleccionada(null)
                            setActiveTab("casos")
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Botones de Descarga PDF */
                  <Card className="border-slate-800 bg-slate-900/50">
                    <CardHeader>
                      <CardTitle className="text-white">📄 Documentos Disponibles</CardTitle>
                      <CardDescription className="text-slate-400">
                        Descargue los documentos necesarios para el paciente
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          className="bg-purple-600 hover:bg-purple-700 h-20"
                          onClick={async () => {
                            try {
                              await documentosAPI.descargarFichaPDF(fichaSeleccionada.id)
                              toast({ title: "PDF descargado", description: "Ficha completa descargada" })
                            } catch (error) {
                              toast({ title: "Error", description: "No se pudo descargar la ficha", variant: "destructive" })
                            }
                          }}
                        >
                          <div className="text-center">
                            <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm font-semibold">Ficha Completa</span>
                          </div>
                        </Button>
                        
                        <Button
                          className="bg-green-600 hover:bg-green-700 h-20"
                          onClick={() => {
                            router.push(`/dashboard/medico/receta/${fichaSeleccionada.id}`)
                          }}
                        >
                          <div className="text-center">
                            <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="text-sm font-semibold">Receta Médica</span>
                          </div>
                        </Button>
                        
                        <Button
                          className="bg-indigo-600 hover:bg-indigo-700 h-20"
                          onClick={async () => {
                            try {
                              await documentosAPI.descargarOrdenExamenesPDF(fichaSeleccionada.id)
                              toast({ title: "PDF descargado", description: "Orden de exámenes descargada" })
                            } catch (error) {
                              toast({ title: "Error", description: "No se pudo descargar la orden", variant: "destructive" })
                            }
                          }}
                        >
                          <div className="text-center">
                            <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <span className="text-sm font-semibold">Orden de Exámenes</span>
                          </div>
                        </Button>
                        
                        <Button
                          className="bg-teal-600 hover:bg-teal-700 h-20"
                          onClick={async () => {
                            try {
                              await documentosAPI.descargarAltaPDF(fichaSeleccionada.id)
                              toast({ title: "PDF descargado", description: "Alta médica descargada" })
                            } catch (error) {
                              toast({ title: "Error", description: "No se pudo descargar el alta", variant: "destructive" })
                            }
                          }}
                        >
                          <div className="text-center">
                            <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-semibold">Alta Médica</span>
                          </div>
                        </Button>
                      </div>
                      
                      <Button
                        variant="outline"
                        className="w-full mt-4 border-slate-700"
                        onClick={() => {
                          setFichaSeleccionada(null)
                          setDiagnosticoGuardado(false)
                          setActiveTab("casos")
                        }}
                      >
                        Volver a Casos Activos
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-400 mb-4">Seleccione un caso activo para realizar el diagnóstico</p>
                    <Button onClick={() => setActiveTab("casos")}>Ver Casos Activos</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Pacientes Atendidos */}
          <TabsContent value="atendidos" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Pacientes Atendidos</CardTitle>
                <CardDescription className="text-slate-400">
                  Pacientes con diagnóstico completado - Acceda a sus fichas y documentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fichasAtendidas.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-400">No hay pacientes atendidos aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fichasAtendidas.map((ficha) => (
                      <div key={ficha.id} className="p-4 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white text-lg">
                              {ficha.paciente.esNN 
                                ? `Paciente NN (${ficha.paciente.idTemporal})`
                                : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`
                              }
                            </h4>
                            <p className="text-sm text-slate-400 mt-1">
                              Ficha #{ficha.id} • {new Date(ficha.fechaRegistro).toLocaleString('es-CL')}
                            </p>
                            {ficha.diagnostico && (
                              <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                                <p className="text-sm text-blue-300">
                                  <strong>Diagnóstico:</strong> {ficha.diagnostico.diagnostico_cie10}
                                </p>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => router.push(`/dashboard/medico/documentos/${ficha.id}`)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Ver Documentos y PDFs
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de solicitud de exámenes */}
      <ModalExamenes
        open={modalExamenesOpen}
        onOpenChange={setModalExamenesOpen}
        ficha={fichaParaExamen}
        onConfirm={handleConfirmExamenes}
      />

      <ModalBuscarPaciente 
        open={modalBuscarOpen} 
        onOpenChange={setModalBuscarOpen} 
      />

      {/* Modal Asignación de Camas */}
      <Dialog open={modalCamasOpen} onOpenChange={setModalCamasOpen}>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-800" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white">
              🛏️ Asignar Cama - {fichaParaCama && (fichaParaCama.paciente.esNN 
                ? `Paciente NN (${fichaParaCama.paciente.idTemporal})`
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
      
      {/* Chat flotante - solo visible cuando hay una ficha seleccionada */}
      {fichaSeleccionada && user && (
        <ChatFlotante
          fichaId={fichaSeleccionada.id}
          usuarioActual={{
            id: user.id,
            username: user.username,
            first_name: user.first_name || user.username,
            last_name: user.last_name || "",
            rol: user.rol,
          }}
        />
      )}
    </div>
  )
}
