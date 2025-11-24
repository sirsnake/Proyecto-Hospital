"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/auth"
import { authAPI, fichasAPI, solicitudesMedicamentosAPI, diagnosticosAPI, solicitudesExamenesAPI, documentosAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModalDiagnostico } from "@/components/modal-diagnostico"
import { ModalExamenes } from "@/components/modal-examenes"
import { ModalBuscarPaciente } from "@/components/modal-buscar-paciente"
import { toast } from "@/hooks/use-toast"

export default function MedicoDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("casos")
  const [modalBuscarOpen, setModalBuscarOpen] = useState(false)
  const [fichasActivas, setFichasActivas] = useState<any[]>([])
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<any[]>([])
  const [modalDiagnosticoOpen, setModalDiagnosticoOpen] = useState(false)
  const [modalExamenesOpen, setModalExamenesOpen] = useState(false)
  const [fichaSeleccionada, setFichaSeleccionada] = useState<any>(null)
  const [fichaParaExamen, setFichaParaExamen] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [motivoRechazo, setMotivoRechazo] = useState<{ [key: number]: string }>({})
  const [diagnosticoGuardado, setDiagnosticoGuardado] = useState<any>(null)
  const [mostrarBotonesPDF, setMostrarBotonesPDF] = useState(false)

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "medico") {
      router.push("/")
      return
    }
    setUser(currentUser)
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
      console.log('🏥 Respuesta fichas en hospital:', fichasResponse)
      
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
        } : null
      }))
      
      console.log('🏥 Fichas transformadas:', fichasTransformadas)
      setFichasActivas(fichasTransformadas)
      
      // Cargar solicitudes pendientes
      const solicitudesResponse = await solicitudesMedicamentosAPI.pendientes()
      console.log('💊 Respuesta solicitudes:', solicitudesResponse)
      
      const solicitudesTransformadas = (Array.isArray(solicitudesResponse) ? solicitudesResponse : []).map((sol: any) => ({
        id: sol.id,
        ficha: sol.ficha,
        paramedico: sol.paramedico_nombre || `Paramédico #${sol.paramedico}`,
        medicamento: sol.medicamento,
        dosis: sol.dosis,
        justificacion: sol.justificacion,
        estado: sol.estado
      }))
      
      console.log('💊 Solicitudes transformadas:', solicitudesTransformadas)
      setSolicitudesPendientes(solicitudesTransformadas)
    } catch (err: any) {
      console.error('❌ Error al cargar datos:', err)
      setError(err.message || "Error al cargar datos")
      setFichasActivas([])
      setSolicitudesPendientes([])
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
    setModalDiagnosticoOpen(true)
  }

  const handleAbrirExamenes = (ficha: any) => {
    setFichaParaExamen(ficha)
    setModalExamenesOpen(true)
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
      
      console.log('🧪 Enviando solicitud de exámenes:', data)
      
      const response = await solicitudesExamenesAPI.crear(data)
      console.log('✅ Exámenes solicitados:', response)
      
      setSuccess("✅ Exámenes solicitados exitosamente")
      setFichaParaExamen(null)
      setModalExamenesOpen(false)
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      console.error('❌ Error al solicitar exámenes:', err)
      setError(err.message || "Error al solicitar exámenes")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDiagnostico = async (diagnostico: any) => {
    try {
      setLoading(true)
      setError("")
      
      const data = {
        ficha: fichaSeleccionada.id,
        medico: user.id,
        diagnostico_cie10: diagnostico.codigoCIE10,
        descripcion: diagnostico.diagnostico,
        indicaciones_medicas: diagnostico.indicaciones,
        medicamentos_prescritos: diagnostico.medicamentos || ""
      }
      
      console.log('📋 Enviando diagnóstico:', data)
      
      const response = await diagnosticosAPI.crear(data)
      console.log('✅ Diagnóstico guardado:', response)
      
      setSuccess("✅ Diagnóstico guardado exitosamente. Paciente dado de alta.")
      setDiagnosticoGuardado({ ...response, fichaId: fichaSeleccionada.id })
      setMostrarBotonesPDF(true)
      
      // No cerrar el modal inmediatamente, mostrar botones de PDF
      // setFichaSeleccionada(null)
      // setModalDiagnosticoOpen(false)
      await cargarDatos()
      
      // Cambiar a tab de casos activos después de guardar
      setActiveTab("casos")
      
      setTimeout(() => setSuccess(""), 5000)
    } catch (err: any) {
      console.error('❌ Error al guardar diagnóstico:', err)
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
        
        {/* Botones de impresión de documentos PDF */}
        {mostrarBotonesPDF && diagnosticoGuardado && (
          <Alert className="mb-6 bg-blue-500/10 border-blue-500/30 text-blue-400">
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold">📄 Documentos disponibles para imprimir:</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={async () => {
                      try {
                        await documentosAPI.descargarFichaPDF(diagnosticoGuardado.fichaId)
                        toast({ title: "PDF descargado", description: "Ficha completa descargada" })
                      } catch (error) {
                        toast({ title: "Error", description: "No se pudo descargar la ficha", variant: "destructive" })
                      }
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Ficha Completa
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      try {
                        await documentosAPI.descargarRecetaPDF(diagnosticoGuardado.fichaId)
                        toast({ title: "PDF descargado", description: "Receta médica descargada" })
                      } catch (error) {
                        toast({ title: "Error", description: "No se pudo descargar la receta", variant: "destructive" })
                      }
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Receta Médica
                  </Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={async () => {
                      try {
                        await documentosAPI.descargarOrdenExamenesPDF(diagnosticoGuardado.fichaId)
                        toast({ title: "PDF descargado", description: "Orden de exámenes descargada" })
                      } catch (error) {
                        toast({ title: "Error", description: "No se pudo descargar la orden", variant: "destructive" })
                      }
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Orden de Exámenes
                  </Button>
                  <Button
                    className="bg-teal-600 hover:bg-teal-700"
                    onClick={async () => {
                      try {
                        await documentosAPI.descargarAltaPDF(diagnosticoGuardado.fichaId)
                        toast({ title: "PDF descargado", description: "Alta médica descargada" })
                      } catch (error) {
                        toast({ title: "Error", description: "No se pudo descargar el alta", variant: "destructive" })
                      }
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Alta Médica
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    setMostrarBotonesPDF(false)
                    setDiagnosticoGuardado(null)
                    setModalDiagnosticoOpen(false)
                    setFichaSeleccionada(null)
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </AlertDescription>
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
            <TabsTrigger value="diagnosticos">Diagnósticos</TabsTrigger>
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

          {/* Diagnósticos */}
          <TabsContent value="diagnosticos" className="space-y-6">
            {fichaSeleccionada ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="text-white">
                    Diagnóstico y Alta Médica - {fichaSeleccionada.paciente.nombres}{" "}
                    {fichaSeleccionada.paciente.apellidos}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Complete el diagnóstico e indicaciones médicas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="diagnostico" className="text-slate-300">
                      Diagnóstico CIE-10
                    </Label>
                    <Textarea
                      id="diagnostico"
                      placeholder="Ej: I21.9 - Infarto agudo del miocardio"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion" className="text-slate-300">
                      Descripción del Diagnóstico
                    </Label>
                    <Textarea
                      id="descripcion"
                      placeholder="Descripción detallada del diagnóstico..."
                      className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="indicaciones" className="text-slate-300">
                      Indicaciones Médicas
                    </Label>
                    <Textarea
                      id="indicaciones"
                      placeholder="Indicaciones y tratamiento..."
                      className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medicamentos" className="text-slate-300">
                      Medicamentos Prescritos
                    </Label>
                    <Textarea
                      id="medicamentos"
                      placeholder="Lista de medicamentos con dosis y frecuencia..."
                      className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700">Guardar Diagnóstico y Dar Alta</Button>
                    <Button
                      variant="outline"
                      className="border-slate-700 bg-transparent"
                      onClick={() => setFichaSeleccionada(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
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
                    <p className="text-slate-400 mb-4">Selecciona un caso activo para realizar el diagnóstico</p>
                    <Button onClick={() => setActiveTab("casos")}>
                      Ver Casos Activos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de diagnóstico */}
      <ModalDiagnostico
        open={modalDiagnosticoOpen}
        onOpenChange={setModalDiagnosticoOpen}
        ficha={fichaSeleccionada}
        onConfirm={handleConfirmDiagnostico}
      />

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
    </div>
  )
}
