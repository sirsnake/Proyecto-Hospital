import { useEffect, useState, useCallback, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { getSession } from "@/lib/auth"
import { authAPI, fichasAPI, solicitudesMedicamentosAPI, diagnosticosAPI, solicitudesExamenesAPI, documentosAPI, camasAPI, notificacionesAPI } from "@/lib/api"
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChatPanel } from "@/components/chat-panel"
import { SignosVitalesChart } from "@/components/signos-vitales-chart"
import { toast } from "@/hooks/use-toast"
import {
  Bell,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Brain,
  AlertTriangle,
  Clock,
  User,
  Bed,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  LogOut,
  Search,
  Stethoscope,
  FileText,
  Pill,
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical,
  Download,
  FileCheck,
  BedDouble
} from "lucide-react"

// Componente de Signo Vital Individual
function SignoVitalCard({ 
  icon: Icon, 
  label, 
  value, 
  unit, 
  status = "normal",
  trend
}: { 
  icon: any
  label: string
  value: string | number
  unit?: string
  status?: "normal" | "warning" | "critical"
  trend?: "up" | "down" | "stable"
}) {
  const statusColors = {
    normal: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    critical: "bg-red-500/10 border-red-500/30 text-red-400"
  }
  
  const iconColors = {
    normal: "text-emerald-400",
    warning: "text-amber-400", 
    critical: "text-red-400"
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  return (
    <div className={`p-3 rounded-xl border ${statusColors[status]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-1">
        <Icon className={`w-4 h-4 ${iconColors[status]}`} />
        {trend && <TrendIcon className={`w-3 h-3 ${iconColors[status]}`} />}
      </div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-white">
        {value}
        {unit && <span className="text-xs text-slate-400 ml-1">{unit}</span>}
      </p>
    </div>
  )
}

// Función para evaluar estado de signos vitales
function evaluarSignoVital(tipo: string, valor: number): "normal" | "warning" | "critical" {
  const rangos: Record<string, { normal: [number, number], warning: [number, number] }> = {
    presion_sistolica: { normal: [90, 140], warning: [80, 160] },
    presion_diastolica: { normal: [60, 90], warning: [50, 100] },
    frecuencia_cardiaca: { normal: [60, 100], warning: [50, 120] },
    frecuencia_respiratoria: { normal: [12, 20], warning: [10, 25] },
    saturacion_o2: { normal: [95, 100], warning: [90, 100] },
    temperatura: { normal: [36, 37.5], warning: [35, 38.5] },
    glasgow: { normal: [14, 15], warning: [9, 15] }
  }
  
  const rango = rangos[tipo]
  if (!rango) return "normal"
  
  if (valor >= rango.normal[0] && valor <= rango.normal[1]) return "normal"
  if (valor >= rango.warning[0] && valor <= rango.warning[1]) return "warning"
  return "critical"
}

export default function MedicoDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("casos")
  const [modalBuscarOpen, setModalBuscarOpen] = useState(false)
  const [fichasActivas, setFichasActivas] = useState<any[]>([])
  const [fichasAtendidas, setFichasAtendidas] = useState<any[]>([])
  const [fichasDadasDeAlta, setFichasDadasDeAlta] = useState<any[]>([])
  const [fichasHospitalizados, setFichasHospitalizados] = useState<any[]>([])
  const [fichasUCI, setFichasUCI] = useState<any[]>([])
  const [fichasDerivados, setFichasDerivados] = useState<any[]>([])
  const [fichasFallecidos, setFichasFallecidos] = useState<any[]>([])
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<any[]>([])
  const [modalExamenesOpen, setModalExamenesOpen] = useState(false)
  const [fichaSeleccionada, setFichaSeleccionada] = useState<any>(null)
  const [fichaParaExamen, setFichaParaExamen] = useState<any>(null)
  const [fichaExpandida, setFichaExpandida] = useState<number | null>(null)
  const [vistaGraficos, setVistaGraficos] = useState<{ [fichaId: number]: boolean }>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [motivoRechazo, setMotivoRechazo] = useState<{ [key: number]: string }>({})
  
  // Estado para notificaciones
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false)
  const notificacionesPollingRef = useRef<NodeJS.Timeout | null>(null)
  
  // Estado para chat pantalla completa
  const [fichaParaChat, setFichaParaChat] = useState<number | null>(null)
  
  // Estado para el formulario de diagnóstico
  const [diagnosticoForm, setDiagnosticoForm] = useState({
    codigoCIE10: "",
    diagnostico: "",
    indicaciones: "",
    medicamentos: "",
    tipoAlta: "",
    destinoDerivacion: ""
  })
  const [diagnosticoGuardado, setDiagnosticoGuardado] = useState(false)
  
  // Estados para gestión de camas
  const [camasDisponibles, setCamasDisponibles] = useState<any[]>([])
  const [modalCamasOpen, setModalCamasOpen] = useState(false)
  const [fichaParaCama, setFichaParaCama] = useState<any>(null)
  const [tipoCamaFiltro, setTipoCamaFiltro] = useState("all")
  const [tipoCamaRequerida, setTipoCamaRequerida] = useState<"general" | "uci">("general")
  
  // Estados para editar receta médica
  const [modalRecetaOpen, setModalRecetaOpen] = useState(false)
  const [fichaParaReceta, setFichaParaReceta] = useState<any>(null)
  const [recetaMedicamentos, setRecetaMedicamentos] = useState("")
  const [guardandoReceta, setGuardandoReceta] = useState(false)
  
  // Estados para ver exámenes solicitados
  const [modalVerExamenesOpen, setModalVerExamenesOpen] = useState(false)
  const [fichaParaVerExamenes, setFichaParaVerExamenes] = useState<any>(null)
  const [examenesDelPaciente, setExamenesDelPaciente] = useState<any[]>([])
  const [cargandoExamenes, setCargandoExamenes] = useState(false)
  
  // Estados para cambiar prioridad
  const [modalPrioridadOpen, setModalPrioridadOpen] = useState(false)
  const [fichaParaPrioridad, setFichaParaPrioridad] = useState<any>(null)
  const [nuevaPrioridad, setNuevaPrioridad] = useState("")

  // Cargar notificaciones
  const cargarNotificaciones = useCallback(async () => {
    try {
      const data = await notificacionesAPI.noLeidas()
      setNotificaciones(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar notificaciones:', err)
    }
  }, [])

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "medico") {
      navigate("/")
      return
    }
    setUser(currentUser)
    
    // Verificar si hay un parámetro tab en la URL
    const tab = searchParams?.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
    
    cargarDatos()
    cargarNotificaciones()
    
    // Auto-refresh cada 60 segundos
    const interval = setInterval(cargarDatos, 60000)
    
    // Polling de notificaciones cada 10 segundos
    notificacionesPollingRef.current = setInterval(cargarNotificaciones, 10000)
    
    return () => {
      clearInterval(interval)
      if (notificacionesPollingRef.current) {
        clearInterval(notificacionesPollingRef.current)
      }
    }
  }, [navigate, cargarNotificaciones])

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
        cama_asignada: ficha.cama_asignada,
        solicitudesExamenes: (ficha.solicitudes_examenes || []).map((se: any) => ({
          id: se.id,
          medico: se.medico_nombre || `Médico #${se.medico}`,
          tipoExamen: se.tipo_examen,
          examenesEspecificos: se.examenes_especificos,
          justificacion: se.justificacion,
          prioridad: se.prioridad,
          estado: se.estado,
          fechaSolicitud: se.fecha_solicitud
        })),
        medico_asignado: ficha.medico_asignado_nombre
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
      
      // Cargar fichas atendidas (con diagnóstico pero sin alta)
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
          estado: ficha.estado,
          medico_asignado: ficha.medico_asignado_nombre
        }))
      setFichasAtendidas(fichasConDiagnostico)
      
      // Cargar fichas dados de alta
      const fichasDadasDeAltaResponse = await fichasAPI.dadosDeAlta()
      
      const fichasAlta = (Array.isArray(fichasDadasDeAltaResponse) ? fichasDadasDeAltaResponse : [])
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
          estado: ficha.estado,
          medico_asignado: ficha.medico_asignado_nombre
        }))
      setFichasDadasDeAlta(fichasAlta)
      
      // Cargar fichas hospitalizados
      const fichasHospitalizadosResponse = await fichasAPI.hospitalizados()
      const fichasHosp = (Array.isArray(fichasHospitalizadosResponse) ? fichasHospitalizadosResponse : [])
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
          cama_asignada: ficha.cama_asignada,
          fechaRegistro: ficha.fecha_registro,
          estado: ficha.estado,
          medico_asignado: ficha.medico_asignado_nombre
        }))
      setFichasHospitalizados(fichasHosp)
      
      // Cargar fichas UCI
      const fichasUCIResponse = await fichasAPI.enUci()
      const fichasUci = (Array.isArray(fichasUCIResponse) ? fichasUCIResponse : [])
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
          cama_asignada: ficha.cama_asignada,
          fechaRegistro: ficha.fecha_registro,
          estado: ficha.estado,
          medico_asignado: ficha.medico_asignado_nombre
        }))
      setFichasUCI(fichasUci)
      
      // Cargar fichas derivados
      const fichasDerivadosResponse = await fichasAPI.derivados()
      const fichasDeriv = (Array.isArray(fichasDerivadosResponse) ? fichasDerivadosResponse : [])
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
          estado: ficha.estado,
          medico_asignado: ficha.medico_asignado_nombre
        }))
      setFichasDerivados(fichasDeriv)
      
      // Cargar fichas fallecidos
      const fichasFallecidosResponse = await fichasAPI.fallecidos()
      const fichasFall = (Array.isArray(fichasFallecidosResponse) ? fichasFallecidosResponse : [])
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
          estado: ficha.estado,
          medico_asignado: ficha.medico_asignado_nombre
        }))
      setFichasFallecidos(fichasFall)
      
    } catch (err: any) {
      console.error('Error al cargar datos:', err)
      setError(err.message || "Error al cargar datos")
      setFichasActivas([])
      setSolicitudesPendientes([])
      setFichasAtendidas([])
      setFichasDadasDeAlta([])
      setFichasHospitalizados([])
      setFichasUCI([])
      setFichasDerivados([])
      setFichasFallecidos([])
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

  const abrirModalCamas = async (ficha: any, tipoCama?: "general" | "uci") => {
    setFichaParaCama(ficha)
    if (tipoCama) {
      setTipoCamaRequerida(tipoCama)
      setTipoCamaFiltro(tipoCama)
    }
    setModalCamasOpen(true)
    await cargarCamasDisponibles(tipoCama)
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
      tipoAlta: "",
      destinoDerivacion: ""
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
        setError("Por favor complete todos los campos obligatorios")
        return
      }
      
      // Validar destino si es derivación
      if (diagnosticoForm.tipoAlta === 'derivacion' && !diagnosticoForm.destinoDerivacion) {
        setError("Debe especificar el destino de derivación")
        return
      }
      
      const data: any = {
        ficha: fichaSeleccionada.id,
        medico: user.id,
        diagnostico_cie10: diagnosticoForm.codigoCIE10,
        descripcion: diagnosticoForm.diagnostico,
        indicaciones_medicas: diagnosticoForm.indicaciones,
        medicamentos_prescritos: diagnosticoForm.medicamentos || "",
        tipo_alta: diagnosticoForm.tipoAlta
      }
      
      // Agregar destino si es derivación
      if (diagnosticoForm.tipoAlta === 'derivacion') {
        data.destino_derivacion = diagnosticoForm.destinoDerivacion
      }
      
      // Agregar hora de fallecimiento si corresponde
      if (diagnosticoForm.tipoAlta === 'fallecido') {
        data.hora_fallecimiento = new Date().toISOString()
      }
      
      const response = await diagnosticosAPI.crear(data)
      
      // Determinar mensaje y acción según tipo de alta
      const mensajesPorTipo: Record<string, { titulo: string, descripcion: string, tab: string }> = {
        'domicilio': { 
          titulo: "✅ Alta a domicilio", 
          descripcion: "El paciente ha sido dado de alta a su domicilio.", 
          tab: "dados_de_alta" 
        },
        'hospitalizacion': { 
          titulo: "Hospitalización registrada", 
          descripcion: "Ahora debe asignar una cama al paciente.", 
          tab: "hospitalizados" 
        },
        'uci': { 
          titulo: "Ingreso a UCI registrado", 
          descripcion: "Ahora debe asignar una cama UCI al paciente.", 
          tab: "uci" 
        },
        'derivacion': { 
          titulo: "Derivación registrada", 
          descripcion: `Paciente derivado a: ${diagnosticoForm.destinoDerivacion}`, 
          tab: "derivados" 
        },
        'voluntaria': { 
          titulo: "Alta voluntaria registrada", 
          descripcion: "El paciente firmó alta contra indicación médica.", 
          tab: "dados_de_alta" 
        },
        'fallecido': { 
          titulo: "Deceso registrado", 
          descripcion: "Se ha registrado el fallecimiento del paciente.", 
          tab: "fallecidos" 
        }
      }
      
      const mensaje = mensajesPorTipo[diagnosticoForm.tipoAlta] || mensajesPorTipo['domicilio']
      
      toast({
        title: mensaje.titulo,
        description: mensaje.descripcion,
      })
      
      // Si es hospitalización o UCI, abrir modal de cama
      if (diagnosticoForm.tipoAlta === 'hospitalizacion' || diagnosticoForm.tipoAlta === 'uci') {
        const tipoCama = diagnosticoForm.tipoAlta === 'uci' ? 'uci' : 'general'
        await abrirModalCamas({...fichaSeleccionada, id: fichaSeleccionada.id}, tipoCama as "general" | "uci")
      }
      
      // Limpiar el estado
      setFichaSeleccionada(null)
      setDiagnosticoGuardado(false)
      setDiagnosticoForm({
        codigoCIE10: "",
        diagnostico: "",
        indicaciones: "",
        medicamentos: "",
        tipoAlta: "",
        destinoDerivacion: ""
      })
      
      await cargarDatos()
      
      // Ir a la pestaña correspondiente
      setActiveTab(mensaje.tab)
      
    } catch (err: any) {
      console.error('Error al guardar diagnóstico:', err)
      setError(err.message || "Error al guardar diagnóstico")
    } finally {
      setLoading(false)
    }
  }

  // Abrir modal para editar receta médica
  const handleAbrirReceta = (ficha: any) => {
    setFichaParaReceta(ficha)
    setRecetaMedicamentos(ficha.diagnostico?.medicamentos_prescritos || "")
    setModalRecetaOpen(true)
  }

  // Guardar receta médica (actualizar medicamentos del diagnóstico)
  const handleGuardarReceta = async () => {
    if (!fichaParaReceta?.diagnostico?.id) return
    
    try {
      setGuardandoReceta(true)
      
      await diagnosticosAPI.actualizar(fichaParaReceta.diagnostico.id, {
        medicamentos_prescritos: recetaMedicamentos
      })
      
      toast({
        title: "✅ Receta guardada",
        description: "Los medicamentos han sido actualizados",
        duration: 2000
      })
      
      setModalRecetaOpen(false)
      setFichaParaReceta(null)
      setRecetaMedicamentos("")
      
      await cargarDatos()
    } catch (err: any) {
      console.error('Error al guardar receta:', err)
      toast({
        title: "Error",
        description: err.message || "No se pudo guardar la receta",
        variant: "destructive",
        duration: 2000
      })
    } finally {
      setGuardandoReceta(false)
    }
  }

  // Cargar exámenes de un paciente
  const handleVerExamenes = async (ficha: any) => {
    setFichaParaVerExamenes(ficha)
    setModalVerExamenesOpen(true)
    setCargandoExamenes(true)
    
    try {
      const examenes = await solicitudesExamenesAPI.porFicha(ficha.id)
      setExamenesDelPaciente(Array.isArray(examenes) ? examenes : [])
    } catch (err) {
      console.error('Error al cargar exámenes:', err)
      toast({
        title: "Error",
        description: "No se pudieron cargar los exámenes",
        variant: "destructive",
        duration: 2000
      })
    } finally {
      setCargandoExamenes(false)
    }
  }

  // Cambiar prioridad de ficha
  const handleCambiarPrioridad = async (fichaId: number, nuevaPrioridad: string) => {
    try {
      await fichasAPI.actualizar(fichaId, { prioridad: nuevaPrioridad })
      toast({
        title: "✅ Prioridad actualizada",
        description: `La prioridad ha sido cambiada a ${nuevaPrioridad}`,
        duration: 2000
      })
      await cargarDatos()
      setModalPrioridadOpen(false)
    } catch (err: any) {
      console.error('Error al cambiar prioridad:', err)
      toast({
        title: "Error",
        description: err.message || "No se pudo cambiar la prioridad",
        variant: "destructive",
        duration: 2000
      })
    }
  }

  const handleCerrarSesion = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      localStorage.removeItem("medical_system_user")
      navigate("/")
    }
  }

  if (!user) return null

  // Funciones auxiliares
  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "C1": return "bg-red-500"
      case "C2": return "bg-orange-500"
      case "C3": return "bg-yellow-500"
      case "C4": return "bg-green-500"
      case "C5": return "bg-slate-500"
      default: return "bg-slate-500"
    }
  }

  const getPrioridadLabel = (prioridad: string) => {
    switch (prioridad) {
      case "C1": return "C1: Urgencia vital"
      case "C2": return "C2: Riesgo vital"
      case "C3": return "C3: Patología urgente"
      case "C4": return "C4: Urgencia relativa"
      case "C5": return "C5: No urgente"
      default: return prioridad
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header Moderno */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Panel Médico</h1>
                <p className="text-xs text-slate-400">Dr. {user.first_name} {user.last_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Indicadores de estado */}
              <div className="hidden md:flex items-center gap-4 mr-4 px-4 py-2 bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs text-slate-300">
                    <span className="font-bold text-white">{fichasActivas.length}</span> activos
                  </span>
                </div>
                <div className="w-px h-4 bg-slate-700" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-slate-300">
                    <span className="font-bold text-white">{solicitudesPendientes.length}</span> pendientes
                  </span>
                </div>
                <div className="w-px h-4 bg-slate-700" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-300">
                    <span className="font-bold text-white">{fichasDadasDeAlta.length + fichasHospitalizados.length + fichasUCI.length + fichasDerivados.length + fichasFallecidos.length}</span> atendidos
                  </span>
                </div>
              </div>

              {/* Botón de notificaciones */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-slate-400 hover:text-white hover:bg-slate-800"
                  onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
                >
                  <Bell className="w-5 h-5" />
                  {notificaciones.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                      {notificaciones.length > 9 ? "9+" : notificaciones.length}
                    </span>
                  )}
                </Button>
                
                {/* Panel de notificaciones */}
                {mostrarNotificaciones && (
                  <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="font-semibold text-white text-sm">Notificaciones</h3>
                      <Badge variant="secondary" className="text-xs">{notificaciones.length}</Badge>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notificaciones.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-sm text-slate-500">Sin notificaciones nuevas</p>
                        </div>
                      ) : (
                        <>
                          {notificaciones.map((notif) => (
                            <div 
                              key={notif.id} 
                              className="p-4 border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors group"
                              onClick={async () => {
                                try {
                                  await notificacionesAPI.marcarLeida(notif.id)
                                  cargarNotificaciones()
                                } catch (err) {
                                  console.error('Error al marcar notificación:', err)
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                                  notif.prioridad === 'alta' || notif.prioridad === 'urgente' ? 'bg-red-500' :
                                  notif.prioridad === 'media' ? 'bg-amber-500' : 'bg-blue-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white">{notif.titulo}</p>
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notif.mensaje}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    <span className="text-[10px] text-slate-500">
                                      {notif.tiempo_transcurrido || new Date(notif.fecha_creacion).toLocaleString('es-CL')}
                                    </span>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    notificacionesAPI.marcarLeida(notif.id).then(() => cargarNotificaciones())
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="p-3 bg-slate-800/30 border-t border-slate-700">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-slate-400 hover:text-white"
                              onClick={async () => {
                                try {
                                  await notificacionesAPI.marcarTodasLeidas()
                                  cargarNotificaciones()
                                  toast({ title: "✅ Notificaciones marcadas como leídas" })
                                } catch (err) {
                                  console.error('Error:', err)
                                }
                              }}
                            >
                              <CheckCircle className="w-3 h-3 mr-2" />
                              Marcar todas como leídas
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModalBuscarOpen(true)}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Search className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={cargarDatos}
                disabled={loading}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCerrarSesion}
                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Mensajes de éxito y error */}
        {success && (
          <Alert className="mb-6 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <AlertDescription className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/30 text-red-500">
            <AlertDescription className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de solicitudes pendientes */}
        {solicitudesPendientes.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Pill className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-400">Solicitudes de Medicamentos Pendientes</p>
                <p className="text-sm text-slate-400">
                  Tienes {solicitudesPendientes.length} solicitud(es) de autorización de medicamentos
                </p>
              </div>
              <Button 
                size="sm"
                className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                onClick={() => setActiveTab("autorizaciones")}
              >
                Ver solicitudes
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Primera fila de pestañas - Flujo principal */}
          <TabsList className="flex flex-wrap gap-1 w-full bg-slate-800/50 p-1 h-auto">
            <TabsTrigger value="casos" className="flex-1 min-w-[80px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white h-9 text-xs">
              <ClipboardList className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Casos</span>
              <span className="sm:hidden">Casos</span>
              {fichasActivas.length > 0 && <Badge className="ml-1 bg-white/20 text-white text-[10px] px-1">{fichasActivas.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="autorizaciones" className="flex-1 min-w-[80px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white h-9 text-xs">
              <Pill className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Autoriz.</span>
              <span className="sm:hidden">Aut</span>
              {solicitudesPendientes.length > 0 && <Badge className="ml-1 bg-white/20 text-white text-[10px] px-1">{solicitudesPendientes.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="diagnostico" className="flex-1 min-w-[80px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-violet-600 data-[state=active]:text-white h-9 text-xs">
              <FileText className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Diagnóstico</span>
              <span className="sm:hidden">Diag</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Segunda fila - Ubicación de pacientes */}
          <TabsList className="flex flex-wrap gap-1 w-full bg-slate-800/50 p-1 h-auto">
            <TabsTrigger value="hospitalizados" className="flex-1 min-w-[70px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-blue-600 data-[state=active]:text-white h-9 text-xs">
              <Bed className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Hospital.</span>
              <span className="sm:hidden">Hosp</span>
              {fichasHospitalizados.length > 0 && <Badge className="ml-1 bg-white/20 text-white text-[10px] px-1">{fichasHospitalizados.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="uci" className="flex-1 min-w-[70px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white h-9 text-xs">
              <Heart className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">UCI</span>
              <span className="sm:hidden">UCI</span>
              {fichasUCI.length > 0 && <Badge className="ml-1 bg-white/20 text-white text-[10px] px-1">{fichasUCI.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="derivados" className="flex-1 min-w-[70px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white h-9 text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Derivados</span>
              <span className="sm:hidden">Der</span>
              {fichasDerivados.length > 0 && <Badge className="ml-1 bg-white/20 text-white text-[10px] px-1">{fichasDerivados.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="dados_de_alta" className="flex-1 min-w-[70px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white h-9 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Alta Dom.</span>
              <span className="sm:hidden">Alta</span>
              {fichasDadasDeAlta.length > 0 && <Badge className="ml-1 bg-white/20 text-white text-[10px] px-1">{fichasDadasDeAlta.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="fallecidos" className="flex-1 min-w-[70px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-600 data-[state=active]:to-gray-600 data-[state=active]:text-white h-9 text-xs">
              <X className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Decesos</span>
              <span className="sm:hidden">Dec</span>
              {fichasFallecidos.length > 0 && <Badge className="ml-1 bg-white/20 text-white text-[10px] px-1">{fichasFallecidos.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Casos Activos */}
          <TabsContent value="casos" className="space-y-6">
            {loading && fichasActivas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-3" />
                <p className="text-slate-400">Cargando casos activos...</p>
              </div>
            ) : fichasActivas.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <ClipboardList className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin casos activos</h3>
                  <p className="text-slate-400 mb-4">Los pacientes que lleguen al hospital aparecerán aquí</p>
                  <Button onClick={cargarDatos} variant="outline" className="border-slate-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualizar
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Header de sección */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border border-blue-500/30 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">
                        {fichasActivas.length} paciente(s) en espera de atención
                      </p>
                      <p className="text-sm text-slate-400">Haga clic en una tarjeta para expandir detalles</p>
                    </div>
                  </div>
                  <Button 
                    onClick={cargarDatos} 
                    disabled={loading}
                    variant="outline" 
                    size="sm"
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>

                <div className="space-y-4">
                  {fichasActivas.map((ficha) => {
                    const isExpanded = fichaExpandida === ficha.id
                    const ultimosSignos = ficha.signosVitales?.[ficha.signosVitales.length - 1]
                    
                    return (
                      <Card 
                        key={ficha.id} 
                        className={`border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/50 overflow-hidden shadow-xl transition-all ${
                          isExpanded ? 'ring-2 ring-blue-500/50' : ''
                        }`}
                      >
                        {/* Cabecera siempre visible */}
                        <div className="p-3">
                          {/* Nombre y datos básicos */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-white truncate text-lg">
                                  {ficha.paciente.esNN 
                                    ? `Paciente NN (${ficha.paciente.idTemporal})`
                                    : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`}
                                </h3>
                                <span className="text-sm text-slate-400">
                                  {ficha.paciente.sexo === 'M' ? 'M' : 'F'}
                                </span>
                                {!ficha.paciente.esNN && (
                                  <span className="text-xs text-slate-500">RUT: {ficha.paciente.rut}</span>
                                )}
                              </div>
                              <p className="text-sm text-slate-300 mt-0.5 line-clamp-1">{ficha.motivoConsulta}</p>
                            </div>
                          </div>

                          {/* CLASIFICACIONES CON COLORES SÓLIDOS */}
                          <div className="flex items-stretch gap-2 mb-2">
                            {/* Pre-triage del Paramédico */}
                            <div className={`flex-1 p-2 rounded-lg ${
                              ficha.prioridad === 'C1' ? 'bg-red-600' :
                              ficha.prioridad === 'C2' ? 'bg-orange-600' :
                              ficha.prioridad === 'C3' ? 'bg-yellow-600' :
                              ficha.prioridad === 'C4' ? 'bg-green-600' :
                              ficha.prioridad === 'C5' ? 'bg-blue-600' :
                              'bg-slate-600'
                            }`}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-xs font-bold text-white/90">PRE</span>
                                <span className="text-[10px] text-white/70 uppercase tracking-wide">Pre-Triage</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-white">{ficha.prioridad || 'S/C'}</span>
                                <span className="text-xs text-white/80">
                                  {ficha.prioridad === 'C1' ? 'Vital' :
                                   ficha.prioridad === 'C2' ? 'Emergencia' :
                                   ficha.prioridad === 'C3' ? 'Urgente' :
                                   ficha.prioridad === 'C4' ? 'Menor' :
                                   ficha.prioridad === 'C5' ? 'No urgente' : ''}
                                </span>
                              </div>
                            </div>

                            {/* Triage del TENS */}
                            {ficha.triage ? (
                              <div className={`flex-1 p-2 rounded-lg ${
                                ficha.triage.nivel_esi === 1 ? 'bg-red-600' :
                                ficha.triage.nivel_esi === 2 ? 'bg-orange-600' :
                                ficha.triage.nivel_esi === 3 ? 'bg-yellow-600' :
                                ficha.triage.nivel_esi === 4 ? 'bg-green-600' :
                                'bg-blue-600'
                              }`}>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-sm">🏥</span>
                                  <span className="text-[10px] text-white/70 uppercase tracking-wide">Triage TENS</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-white">ESI-{ficha.triage.nivel_esi}</span>
                                  <span className="text-xs text-white/80">
                                    {ficha.triage.nivel_esi === 1 ? 'Resucitación' :
                                     ficha.triage.nivel_esi === 2 ? 'Emergencia' :
                                     ficha.triage.nivel_esi === 3 ? 'Urgencia' :
                                     ficha.triage.nivel_esi === 4 ? 'Menos urgente' :
                                     'No urgente'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 p-2 rounded-lg bg-purple-600/50 border border-dashed border-purple-400">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-sm">🏥</span>
                                  <span className="text-[10px] text-white/70 uppercase tracking-wide">Triage TENS</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
                                  <span className="text-sm font-bold text-white">Pendiente</span>
                                </div>
                              </div>
                            )}

                            {/* Info cama */}
                            {ficha.cama_asignada && (
                              <div className="flex flex-col items-center justify-center px-3 bg-emerald-600 rounded-lg">
                                <BedDouble className="w-4 h-4 text-white mb-0.5" />
                                <span className="text-sm font-bold text-white">{ficha.cama_asignada.numero}</span>
                                <span className="text-[9px] text-white/70 uppercase">Cama</span>
                              </div>
                            )}

                            {/* Info médico asignado */}
                            {ficha.medico_asignado && (
                              <div className="flex flex-col items-center justify-center px-3 bg-blue-600 rounded-lg">
                                <Stethoscope className="w-4 h-4 text-white mb-0.5" />
                                <span className="text-xs font-medium text-white text-center leading-tight">{ficha.medico_asignado.split(' ').slice(0,2).join(' ')}</span>
                                <span className="text-[9px] text-white/70 uppercase">Médico</span>
                              </div>
                            )}
                          </div>

                          {/* Signos vitales resumidos - siempre visible */}
                          {ultimosSignos && (
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-2">
                              <SignoVitalCard
                                icon={Activity}
                                label="PA"
                                value={`${ultimosSignos.presionSistolica}/${ultimosSignos.presionDiastolica}`}
                                status={evaluarSignoVital('presion_sistolica', ultimosSignos.presionSistolica)}
                              />
                              <SignoVitalCard
                                icon={Heart}
                                label="FC"
                                value={ultimosSignos.frecuenciaCardiaca}
                                unit="lpm"
                                status={evaluarSignoVital('frecuencia_cardiaca', ultimosSignos.frecuenciaCardiaca)}
                              />
                              <SignoVitalCard
                                icon={Wind}
                                label="FR"
                                value={ultimosSignos.frecuenciaRespiratoria}
                                unit="rpm"
                                status={evaluarSignoVital('frecuencia_respiratoria', ultimosSignos.frecuenciaRespiratoria)}
                              />
                              <SignoVitalCard
                                icon={Droplets}
                                label="SatO₂"
                                value={ultimosSignos.saturacionO2}
                                unit="%"
                                status={evaluarSignoVital('saturacion_o2', ultimosSignos.saturacionO2)}
                              />
                              <SignoVitalCard
                                icon={Thermometer}
                                label="Temp"
                                value={ultimosSignos.temperatura}
                                unit="°C"
                                status={evaluarSignoVital('temperatura', parseFloat(ultimosSignos.temperatura))}
                              />
                              {ultimosSignos.escalaGlasgow && (
                                <SignoVitalCard
                                  icon={Brain}
                                  label="Glasgow"
                                  value={ultimosSignos.escalaGlasgow}
                                  unit="/15"
                                  status={evaluarSignoVital('glasgow', ultimosSignos.escalaGlasgow)}
                                />
                              )}
                              {ultimosSignos.eva !== null && ultimosSignos.eva !== undefined && (
                                <SignoVitalCard
                                  icon={AlertTriangle}
                                  label="EVA"
                                  value={ultimosSignos.eva}
                                  unit="/10"
                                  status={ultimosSignos.eva > 6 ? "critical" : ultimosSignos.eva > 3 ? "warning" : "normal"}
                                />
                              )}
                            </div>
                          )}

                          {!ultimosSignos && (
                            <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                              <p className="text-sm text-amber-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Sin signos vitales registrados
                              </p>
                            </div>
                          )}

                          {/* BOTONES DE ACCIÓN - SIEMPRE VISIBLES */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleAbrirDiagnostico(ficha)}
                            >
                              <FileText className="w-4 h-4 mr-1.5" />
                              Diagnosticar
                            </Button>
                            <Button 
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => handleAbrirExamenes(ficha)}
                            >
                              <FlaskConical className="w-4 h-4 mr-1.5" />
                              Exámenes
                            </Button>
                            <Button
                              size="sm"
                              variant={fichaParaChat === ficha.id ? "default" : "outline"}
                              className={fichaParaChat === ficha.id 
                                ? "bg-violet-600 hover:bg-violet-700" 
                                : "border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
                              }
                              onClick={() => setFichaParaChat(fichaParaChat === ficha.id ? null : ficha.id)}
                            >
                              <MessageCircle className="w-4 h-4 mr-1.5" />
                              Chat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                              onClick={async () => {
                                try {
                                  await documentosAPI.descargarFichaPDF(ficha.id)
                                  toast({ title: "✅ Descargado", description: "Ficha completa descargada", duration: 2000 })
                                } catch (error) {
                                  toast({ title: "Error", description: "No se pudo descargar", variant: "destructive", duration: 2000 })
                                }
                              }}
                            >
                              <FileCheck className="w-4 h-4 mr-1.5" />
                              PDF
                            </Button>
                            {!ficha.cama_asignada && (
                              <Button
                                size="sm"
                                className="bg-cyan-600 hover:bg-cyan-700"
                                onClick={() => abrirModalCamas(ficha)}
                              >
                                <BedDouble className="w-4 h-4 mr-1.5" />
                                Asignar Cama
                              </Button>
                            )}

                            {/* Espaciador */}
                            <div className="flex-1" />

                            {/* Botón expandir historial */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setFichaExpandida(isExpanded ? null : ficha.id)}
                              className="text-slate-400 hover:text-white"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4 mr-1" />
                                  Ocultar
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 mr-1" />
                                  Historial
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Contenido expandible - SOLO HISTORIAL */}
                        <Collapsible open={isExpanded}>
                          <CollapsibleContent>
                            <div className="px-3 pb-3 space-y-3 border-t border-slate-800 pt-3 bg-slate-900/30">
                              {/* Alergias críticas */}
                              {ficha.anamnesis?.alergiasCriticas && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                                  <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    ALERGIAS MEDICAMENTOSAS:
                                  </p>
                                  <p className="text-sm text-red-300 mt-1">
                                    {ficha.anamnesis.alergiasMedicamentosas.join(", ")}
                                  </p>
                                </div>
                              )}

                              {/* Info del paramédico */}
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" />
                                    Motivo de Consulta
                                  </h4>
                                  <p className="text-sm text-white">{ficha.motivoConsulta}</p>
                                </div>
                                {ficha.circunstancias && (
                                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                      Circunstancias
                                    </h4>
                                    <p className="text-sm text-white">{ficha.circunstancias}</p>
                                  </div>
                                )}
                              </div>

                              {/* Anamnesis */}
                              {ficha.anamnesis && (
                                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                  <h4 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Anamnesis TENS - {ficha.anamnesis.tens}
                                  </h4>
                                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                                    <div className="p-3 bg-slate-800/30 rounded-lg">
                                      <p className="text-xs text-slate-400 mb-1">Antecedentes Mórbidos</p>
                                      <p className="text-white">{ficha.anamnesis.antecedentesMorbidos || 'No registrados'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-800/30 rounded-lg">
                                      <p className="text-xs text-slate-400 mb-1">Medicamentos Habituales</p>
                                      <p className="text-white">{ficha.anamnesis.medicamentosHabituales || 'No registrados'}</p>
                                    </div>
                                    {ficha.anamnesis.antecedentesQuirurgicos && (
                                      <div className="p-3 bg-slate-800/30 rounded-lg md:col-span-2">
                                        <p className="text-xs text-slate-400 mb-1">Antecedentes Quirúrgicos</p>
                                        <p className="text-white">{ficha.anamnesis.antecedentesQuirurgicos}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Exámenes solicitados */}
                              {ficha.solicitudesExamenes && ficha.solicitudesExamenes.length > 0 && (
                                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                                  <h4 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                                    <FlaskConical className="w-4 h-4" />
                                    Exámenes Solicitados ({ficha.solicitudesExamenes.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {ficha.solicitudesExamenes.map((examen: any) => (
                                      <div key={examen.id} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-medium text-white">{examen.tipoExamen}</p>
                                          <p className="text-xs text-slate-400">{examen.examenesEspecificos}</p>
                                        </div>
                                        <Badge className={
                                          examen.estado === 'pendiente' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                          examen.estado === 'en_proceso' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                          examen.estado === 'realizado' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                          'bg-red-500/20 text-red-400 border-red-500/30'
                                        }>
                                          {examen.estado === 'pendiente' ? 'Pendiente' :
                                           examen.estado === 'en_proceso' ? 'En Proceso' :
                                           examen.estado === 'realizado' ? 'Realizado' : 'Rechazado'}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Historial de signos vitales - Modernizado */}
                              {ficha.signosVitales && ficha.signosVitales.length > 1 && (
                                <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 rounded-xl border border-indigo-500/30">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                        <Activity className="w-4 h-4 text-indigo-400" />
                                      </div>
                                      Historial de Signos Vitales
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                                        {ficha.signosVitales.length} mediciones
                                      </Badge>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-7 text-xs ${vistaGraficos[ficha.id] ? 'bg-indigo-600 text-white border-indigo-500' : 'border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20'}`}
                                        onClick={() => setVistaGraficos(prev => ({ ...prev, [ficha.id]: !prev[ficha.id] }))}
                                      >
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        {vistaGraficos[ficha.id] ? 'Ver Lista' : 'Ver Gráficos'}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* Vista de Gráficos */}
                                  {vistaGraficos[ficha.id] ? (
                                    <SignosVitalesChart signosVitales={ficha.signosVitales} tipo="completo" />
                                  ) : (
                                    /* Vista de Lista */
                                    <div className="space-y-3">
                                      {ficha.signosVitales.map((signos: any, index: number) => (
                                        <div key={signos.id} className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50 hover:border-indigo-500/30 transition-colors">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                              <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-orange-400' : 'bg-blue-400'}`} />
                                              <span className="text-xs font-medium text-white">
                                                {index === 0 ? 'Paramédico (Inicial)' : `TENS - Medición #${index}`}
                                              </span>
                                            </div>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {signos.fechaRegistro && new Date(signos.fechaRegistro).toLocaleString('es-CL')}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-4 gap-2">
                                            <div className={`p-2 rounded-lg text-center ${evaluarSignoVital('presion', signos.presionSistolica) === 'normal' ? 'bg-emerald-500/20 border border-emerald-500/30' : evaluarSignoVital('presion', signos.presionSistolica) === 'warning' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                                              <Heart className={`w-3 h-3 mx-auto mb-1 ${evaluarSignoVital('presion', signos.presionSistolica) === 'normal' ? 'text-emerald-400' : evaluarSignoVital('presion', signos.presionSistolica) === 'warning' ? 'text-amber-400' : 'text-red-400'}`} />
                                              <p className="text-[10px] text-slate-400">PA</p>
                                              <p className="text-sm font-bold text-white">{signos.presionSistolica}/{signos.presionDiastolica}</p>
                                            </div>
                                            <div className={`p-2 rounded-lg text-center ${evaluarSignoVital('fc', signos.frecuenciaCardiaca) === 'normal' ? 'bg-emerald-500/20 border border-emerald-500/30' : evaluarSignoVital('fc', signos.frecuenciaCardiaca) === 'warning' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                                              <Activity className={`w-3 h-3 mx-auto mb-1 ${evaluarSignoVital('fc', signos.frecuenciaCardiaca) === 'normal' ? 'text-emerald-400' : evaluarSignoVital('fc', signos.frecuenciaCardiaca) === 'warning' ? 'text-amber-400' : 'text-red-400'}`} />
                                              <p className="text-[10px] text-slate-400">FC</p>
                                              <p className="text-sm font-bold text-white">{signos.frecuenciaCardiaca} bpm</p>
                                            </div>
                                            <div className={`p-2 rounded-lg text-center ${evaluarSignoVital('sat', signos.saturacionO2) === 'normal' ? 'bg-emerald-500/20 border border-emerald-500/30' : evaluarSignoVital('sat', signos.saturacionO2) === 'warning' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                                              <Wind className={`w-3 h-3 mx-auto mb-1 ${evaluarSignoVital('sat', signos.saturacionO2) === 'normal' ? 'text-emerald-400' : evaluarSignoVital('sat', signos.saturacionO2) === 'warning' ? 'text-amber-400' : 'text-red-400'}`} />
                                              <p className="text-[10px] text-slate-400">SatO₂</p>
                                              <p className="text-sm font-bold text-white">{signos.saturacionO2}%</p>
                                            </div>
                                            <div className={`p-2 rounded-lg text-center ${evaluarSignoVital('temp', signos.temperatura) === 'normal' ? 'bg-emerald-500/20 border border-emerald-500/30' : evaluarSignoVital('temp', signos.temperatura) === 'warning' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                                              <Thermometer className={`w-3 h-3 mx-auto mb-1 ${evaluarSignoVital('temp', signos.temperatura) === 'normal' ? 'text-emerald-400' : evaluarSignoVital('temp', signos.temperatura) === 'warning' ? 'text-amber-400' : 'text-red-400'}`} />
                                              <p className="text-[10px] text-slate-400">Temp</p>
                                              <p className="text-sm font-bold text-white">{signos.temperatura}°C</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* Autorizaciones de Medicamentos */}
          <TabsContent value="autorizaciones" className="space-y-6">
            {/* Header de sección */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Pill className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">
                    Solicitudes de Autorización de Medicamentos
                  </p>
                  <p className="text-sm text-slate-400">Revisa y autoriza las solicitudes de medicamentos de los paramédicos</p>
                </div>
              </div>
            </div>

            {solicitudesPendientes.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-500/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Todo al día</h3>
                  <p className="text-slate-400">No hay solicitudes pendientes de autorización</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {solicitudesPendientes.map((solicitud) => (
                  <Card key={solicitud.id} className="border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Pill className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-lg">{solicitud.medicamento}</h4>
                            <p className="text-sm text-slate-400">Dosis: {solicitud.dosis}</p>
                            <p className="text-xs text-slate-500 mt-1">Solicitado por: {solicitud.paramedico}</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          ⏳ Pendiente
                        </Badge>
                      </div>

                      <div className="mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Justificación Clínica
                        </p>
                        <p className="text-sm text-white">{solicitud.justificacion}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
                          onClick={() => handleAutorizarMedicamento(solicitud.id)}
                          disabled={loading}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Autorizar
                        </Button>
                        
                        <div className="flex-1 flex gap-2">
                          <Input
                            placeholder="Motivo de rechazo..."
                            value={motivoRechazo[solicitud.id] || ""}
                            onChange={(e) => setMotivoRechazo({ ...motivoRechazo, [solicitud.id]: e.target.value })}
                            className="flex-1 bg-slate-800 border-slate-700 text-white"
                          />
                          <Button
                            variant="destructive"
                            onClick={() => handleRechazarMedicamento(solicitud.id)}
                            disabled={loading || !motivoRechazo[solicitud.id]}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Diagnóstico - Página completa */}
          <TabsContent value="diagnostico" className="space-y-6">
            {fichaSeleccionada ? (
              <div className="space-y-6">
                {/* Resumen del Paciente */}
                <Card className="border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/20 overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-purple-500 to-violet-500" />
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <User className="w-7 h-7 text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-2xl">
                          {fichaSeleccionada.paciente.esNN 
                            ? `Paciente NN (${fichaSeleccionada.paciente.idTemporal})`
                            : `${fichaSeleccionada.paciente.nombres} ${fichaSeleccionada.paciente.apellidos}`
                          }
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-1">
                          Ficha #{fichaSeleccionada.id} • {fichaSeleccionada.motivoConsulta}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Signos vitales del paciente */}
                    {fichaSeleccionada.signosVitales && fichaSeleccionada.signosVitales.length > 0 && (
                      <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-4">
                        <SignoVitalCard
                          icon={Activity}
                          label="PA"
                          value={`${fichaSeleccionada.signosVitales[0].presionSistolica}/${fichaSeleccionada.signosVitales[0].presionDiastolica}`}
                          status={evaluarSignoVital('presion_sistolica', fichaSeleccionada.signosVitales[0].presionSistolica)}
                        />
                        <SignoVitalCard
                          icon={Heart}
                          label="FC"
                          value={fichaSeleccionada.signosVitales[0].frecuenciaCardiaca}
                          unit="lpm"
                          status={evaluarSignoVital('frecuencia_cardiaca', fichaSeleccionada.signosVitales[0].frecuenciaCardiaca)}
                        />
                        <SignoVitalCard
                          icon={Wind}
                          label="FR"
                          value={fichaSeleccionada.signosVitales[0].frecuenciaRespiratoria}
                          unit="rpm"
                          status={evaluarSignoVital('frecuencia_respiratoria', fichaSeleccionada.signosVitales[0].frecuenciaRespiratoria)}
                        />
                        <SignoVitalCard
                          icon={Droplets}
                          label="SatO₂"
                          value={fichaSeleccionada.signosVitales[0].saturacionO2}
                          unit="%"
                          status={evaluarSignoVital('saturacion_o2', fichaSeleccionada.signosVitales[0].saturacionO2)}
                        />
                        <SignoVitalCard
                          icon={Thermometer}
                          label="Temp"
                          value={fichaSeleccionada.signosVitales[0].temperatura}
                          unit="°C"
                          status={evaluarSignoVital('temperatura', parseFloat(fichaSeleccionada.signosVitales[0].temperatura))}
                        />
                        {fichaSeleccionada.signosVitales[0].escalaGlasgow && (
                          <SignoVitalCard
                            icon={Brain}
                            label="Glasgow"
                            value={fichaSeleccionada.signosVitales[0].escalaGlasgow}
                            unit="/15"
                            status={evaluarSignoVital('glasgow', fichaSeleccionada.signosVitales[0].escalaGlasgow)}
                          />
                        )}
                        {fichaSeleccionada.signosVitales[0].eva !== null && (
                          <SignoVitalCard
                            icon={AlertTriangle}
                            label="EVA"
                            value={fichaSeleccionada.signosVitales[0].eva}
                            unit="/10"
                            status={fichaSeleccionada.signosVitales[0].eva > 6 ? "critical" : fichaSeleccionada.signosVitales[0].eva > 3 ? "warning" : "normal"}
                          />
                        )}
                      </div>
                    )}
                    
                    {/* Alergias críticas */}
                    {fichaSeleccionada.anamnesis?.alergiasCriticas && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          ALERGIAS MEDICAMENTOSAS:
                        </p>
                        <p className="text-sm text-red-300 mt-1">
                          {fichaSeleccionada.anamnesis.alergiasMedicamentosas.join(", ")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Formulario de Diagnóstico */}
                <Card className="border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/50 overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-purple-500 to-violet-500" />
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <CardTitle className="text-white">Diagnóstico y Alta Médica</CardTitle>
                          <CardDescription className="text-slate-400">
                            Complete el diagnóstico e indicaciones médicas
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Aviso de código auto-generado */}
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-300 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          El código de diagnóstico se generará automáticamente al guardar (Ej: DX-20251126-0001)
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300 flex items-center gap-2">
                            <span>Código CIE-10</span>
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="Ej: I21.9, J18.9, K35.8..."
                            value={diagnosticoForm.codigoCIE10}
                            onChange={(e) => setDiagnosticoForm({...diagnosticoForm, codigoCIE10: e.target.value.toUpperCase()})}
                            className="bg-slate-800 border-slate-700 text-white font-mono"
                          />
                          <p className="text-xs text-slate-500">Clasificación Internacional de Enfermedades (CIE-10)</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-slate-300 flex items-center gap-2">
                            <span>Tipo de Alta</span>
                            <span className="text-red-500">*</span>
                          </Label>
                          <Select 
                            value={diagnosticoForm.tipoAlta} 
                            onValueChange={(value) => setDiagnosticoForm({...diagnosticoForm, tipoAlta: value})}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                              <SelectValue placeholder="Seleccionar tipo de alta" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="domicilio" className="text-white">Alta a Domicilio</SelectItem>
                              <SelectItem value="hospitalizacion" className="text-white">Hospitalización</SelectItem>
                              <SelectItem value="uci" className="text-white">Ingreso a UCI</SelectItem>
                              <SelectItem value="derivacion" className="text-white">Derivación a Especialista</SelectItem>
                              <SelectItem value="voluntaria" className="text-white">Alta Voluntaria</SelectItem>
                              <SelectItem value="fallecido" className="text-white">Deceso</SelectItem>
                            </SelectContent>
                          </Select>
                          {diagnosticoForm.tipoAlta === 'hospitalizacion' && (
                            <p className="text-xs text-blue-400">Se abrirá modal para asignar cama de hospitalización</p>
                          )}
                          {diagnosticoForm.tipoAlta === 'uci' && (
                            <p className="text-xs text-red-400">Se abrirá modal para asignar cama UCI</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Campo de destino si es derivación */}
                      {diagnosticoForm.tipoAlta === 'derivacion' && (
                        <div className="space-y-2">
                          <Label className="text-slate-300 flex items-center gap-2">
                            <span>Destino de Derivación</span>
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="Ej: Hospital Regional de Antofagasta - Cardiología"
                            value={diagnosticoForm.destinoDerivacion}
                            onChange={(e) => setDiagnosticoForm({...diagnosticoForm, destinoDerivacion: e.target.value})}
                            className="bg-slate-800 border-slate-700 text-white"
                          />
                          <p className="text-xs text-slate-500">Indique hospital y servicio/especialidad destino</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-slate-300 flex items-center gap-2">
                          <span>Diagnóstico</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          placeholder="Ej: Infarto agudo del miocardio, síndrome coronario agudo..."
                          value={diagnosticoForm.diagnostico}
                          onChange={(e) => setDiagnosticoForm({...diagnosticoForm, diagnostico: e.target.value})}
                          className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300 flex items-center gap-2">
                          <span>Indicaciones Médicas</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          placeholder="Indicaciones y tratamiento detallado..."
                          value={diagnosticoForm.indicaciones}
                          onChange={(e) => setDiagnosticoForm({...diagnosticoForm, indicaciones: e.target.value})}
                          className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">Medicamentos Prescritos (opcional)</Label>
                        <p className="text-xs text-slate-500">Estos datos aparecerán en la Receta Médica al descargarla</p>
                        <Textarea
                          placeholder="Aspirina 100mg cada 24 horas&#10;Enalapril 10mg cada 12 horas&#10;Omeprazol 20mg cada 24 horas..."
                          value={diagnosticoForm.medicamentos}
                          onChange={(e) => setDiagnosticoForm({...diagnosticoForm, medicamentos: e.target.value})}
                          className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button 
                          className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/20 h-12"
                          onClick={handleGuardarDiagnostico}
                          disabled={loading}
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          {loading ? 'Guardando...' : 'Guardar Diagnóstico y Dar Alta'}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-slate-700 h-12"
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
                </div>
            ) : (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin paciente seleccionado</h3>
                  <p className="text-slate-400 mb-4">Seleccione un caso activo para realizar el diagnóstico</p>
                  <Button 
                    onClick={() => setActiveTab("casos")}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    Ver Casos Activos
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Pacientes Atendidos */}
          <TabsContent value="atendidos" className="space-y-6">
            {/* Header de sección */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Pacientes Atendidos</p>
                  <p className="text-sm text-slate-400">Pacientes con diagnóstico completado - Acceda a sus fichas y documentos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {fichasAtendidas.length} completados
                </Badge>
              </div>
            </div>

            {fichasAtendidas.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin pacientes atendidos</h3>
                  <p className="text-slate-400 mb-4">Los pacientes con diagnóstico completado aparecerán aquí</p>
                  <Button 
                    onClick={() => setActiveTab("casos")}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    Ver Casos Activos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {fichasAtendidas.map((ficha) => (
                  <Collapsible key={ficha.id}>
                    <Card className="border-slate-800 bg-slate-900/50 hover:border-emerald-500/50 transition-all duration-200">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4 flex-1">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-lg">
                                {ficha.paciente.esNN 
                                  ? 'N' 
                                  : ficha.paciente.nombres?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              {/* Nombre y datos */}
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-white text-lg">
                                  {ficha.paciente.esNN 
                                    ? `Paciente NN (${ficha.paciente.idTemporal})`
                                    : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`
                                  }
                                </h4>
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Atendido
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                                <span className="flex items-center gap-1">
                                  <FileText className="w-4 h-4" />
                                  Ficha #{ficha.id}
                                </span>
                                {ficha.diagnostico?.codigo_diagnostico && (
                                  <span className="flex items-center gap-1 text-blue-400">
                                    <Stethoscope className="w-4 h-4" />
                                    {ficha.diagnostico.codigo_diagnostico}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {new Date(ficha.fechaRegistro).toLocaleString('es-CL')}
                                </span>
                              </div>
                              
                              {/* Diagnóstico */}
                              {ficha.diagnostico && (
                                <div className="p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <Stethoscope className="w-4 h-4 text-blue-400 mt-0.5" />
                                    <div>
                                      <p className="text-xs text-blue-400 font-medium mb-1">Diagnóstico CIE-10</p>
                                      <p className="text-sm text-white">{ficha.diagnostico.diagnostico_cie10}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Acciones */}
                          <div className="flex items-center gap-2 ml-4">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                className="border-slate-700"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Ver Documentos
                                <ChevronDown className="w-4 h-4 ml-2" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        
                        {/* Panel de documentos expandible */}
                        <CollapsibleContent>
                          <div className="mt-4 pt-4 border-t border-slate-700">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-emerald-400" />
                              Documentos Disponibles
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Button
                                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 h-16"
                                onClick={async () => {
                                  try {
                                    await documentosAPI.descargarFichaPDF(ficha.id)
                                    toast({ title: "✅ Descargado", description: "Ficha completa descargada", duration: 2000 })
                                  } catch (error) {
                                    toast({ title: "Error", description: "No se pudo descargar", variant: "destructive", duration: 2000 })
                                  }
                                }}
                              >
                                <div className="text-center">
                                  <FileText className="w-5 h-5 mx-auto mb-1" />
                                  <span className="text-xs font-semibold">Ficha Completa</span>
                                </div>
                              </Button>
                              
                              {/* Receta Médica - Editar y Descargar */}
                              <div className="flex flex-col gap-1">
                                <Button
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-10"
                                  onClick={() => handleAbrirReceta(ficha)}
                                >
                                  <Pill className="w-4 h-4 mr-1" />
                                  <span className="text-xs font-semibold">Editar Receta</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="border-green-600 text-green-400 hover:bg-green-600/10 h-6 text-xs"
                                  onClick={async () => {
                                    if (!ficha.diagnostico?.medicamentos_prescritos) {
                                      toast({ title: "Sin medicamentos", description: "Primero debe agregar medicamentos a la receta", variant: "destructive", duration: 2000 })
                                      return
                                    }
                                    try {
                                      await documentosAPI.descargarRecetaPDF(ficha.id)
                                      toast({ title: "Descargado", description: "Receta médica descargada", duration: 2000 })
                                    } catch (error) {
                                      toast({ title: "Error", description: "No se pudo descargar", variant: "destructive", duration: 2000 })
                                    }
                                  }}
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Descargar PDF
                                </Button>
                              </div>
                              
                              {/* Exámenes - Ver y Descargar */}
                              <div className="flex flex-col gap-1">
                                <Button
                                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 h-10"
                                  onClick={() => handleVerExamenes(ficha)}
                                >
                                  <FlaskConical className="w-4 h-4 mr-1" />
                                  <span className="text-xs font-semibold">Ver Exámenes</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="border-indigo-600 text-indigo-400 hover:bg-indigo-600/10 h-6 text-xs"
                                  onClick={async () => {
                                    try {
                                      await documentosAPI.descargarOrdenExamenesPDF(ficha.id)
                                      toast({ title: "✅ Descargado", description: "Orden de exámenes descargada", duration: 2000 })
                                    } catch (error) {
                                      toast({ title: "Error", description: "No se pudo descargar", variant: "destructive", duration: 2000 })
                                    }
                                  }}
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Descargar PDF
                                </Button>
                              </div>
                              
                              <Button
                                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 h-16"
                                onClick={async () => {
                                  try {
                                    await documentosAPI.descargarAltaPDF(ficha.id)
                                    toast({ title: "✅ Descargado", description: "Alta médica descargada", duration: 2000 })
                                  } catch (error) {
                                    toast({ title: "Error", description: "No se pudo descargar", variant: "destructive", duration: 2000 })
                                  }
                                }}
                              >
                                <div className="text-center">
                                  <FileCheck className="w-5 h-5 mx-auto mb-1" />
                                  <span className="text-xs font-semibold">Alta Médica</span>
                                </div>
                              </Button>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Dados de Alta */}
          <TabsContent value="dados_de_alta" className="space-y-6">
            {/* Header de sección */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Pacientes Dados de Alta</p>
                  <p className="text-sm text-slate-400">Pacientes que han completado su atención y fueron dados de alta</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  {fichasDadasDeAlta.length} dados de alta
                </Badge>
              </div>
            </div>

            {fichasDadasDeAlta.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <LogOut className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin pacientes dados de alta</h3>
                  <p className="text-slate-400 mb-4">Los pacientes dados de alta aparecerán aquí</p>
                  <Button 
                    onClick={() => setActiveTab("casos")}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    Ver Casos Activos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {fichasDadasDeAlta.map((ficha) => (
                  <Collapsible key={ficha.id}>
                    <Card className="border-slate-800 bg-slate-900/50 hover:border-cyan-500/50 transition-all duration-200">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4 flex-1">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-sky-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-lg">
                                {ficha.paciente.esNN 
                                  ? 'N' 
                                  : ficha.paciente.nombres?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              {/* Nombre y datos */}
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-white text-lg">
                                  {ficha.paciente.esNN 
                                    ? `Paciente NN (${ficha.paciente.idTemporal})`
                                    : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`
                                  }
                                </h4>
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                  <LogOut className="w-3 h-3 mr-1" />
                                  Alta
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                                <span className="flex items-center gap-1">
                                  <FileText className="w-4 h-4" />
                                  Ficha #{ficha.id}
                                </span>
                                {ficha.diagnostico?.codigo_diagnostico && (
                                  <span className="flex items-center gap-1 text-blue-400">
                                    <Stethoscope className="w-4 h-4" />
                                    {ficha.diagnostico.codigo_diagnostico}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {new Date(ficha.fechaRegistro).toLocaleString('es-CL')}
                                </span>
                              </div>
                              
                              {/* Diagnóstico */}
                              {ficha.diagnostico && (
                                <div className="p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <Stethoscope className="w-4 h-4 text-blue-400 mt-0.5" />
                                    <div>
                                      <p className="text-xs text-blue-400 font-medium mb-1">Diagnóstico CIE-10</p>
                                      <p className="text-sm text-white">{ficha.diagnostico.diagnostico_cie10}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Acciones */}
                          <div className="flex items-center gap-2 ml-4">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                className="border-slate-700"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Ver Documentos
                                <ChevronDown className="w-4 h-4 ml-2" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        
                        {/* Panel de documentos expandible */}
                        <CollapsibleContent>
                          <div className="mt-4 pt-4 border-t border-slate-700">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-cyan-400" />
                              Documentos Disponibles
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Button
                                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 h-16"
                                onClick={async () => {
                                  try {
                                    await documentosAPI.descargarFichaPDF(ficha.id)
                                    toast({ title: "✅ Descargado", description: "Ficha completa descargada", duration: 2000 })
                                  } catch (error) {
                                    toast({ title: "Error", description: "No se pudo descargar", variant: "destructive", duration: 2000 })
                                  }
                                }}
                              >
                                <div className="text-center">
                                  <FileText className="w-5 h-5 mx-auto mb-1" />
                                  <span className="text-xs font-semibold">Ficha Completa</span>
                                </div>
                              </Button>
                              
                              {/* Receta Médica - Editar y Descargar */}
                              <div className="flex flex-col gap-1">
                                <Button
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-10"
                                  onClick={() => handleAbrirReceta(ficha)}
                                >
                                  <Pill className="w-4 h-4 mr-1" />
                                  <span className="text-xs font-semibold">Editar Receta</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="border-green-600 text-green-400 hover:bg-green-600/10 h-6 text-xs"
                                  onClick={async () => {
                                    if (!ficha.diagnostico?.medicamentos_prescritos) {
                                      toast({ title: "Sin medicamentos", description: "Primero debe agregar medicamentos a la receta", variant: "destructive", duration: 2000 })
                                      return
                                    }
                                    try {
                                      await documentosAPI.descargarRecetaPDF(ficha.id)
                                      toast({ title: "Descargado", description: "Receta médica descargada", duration: 2000 })
                                    } catch (error) {
                                      toast({ title: "Error", description: "No se pudo descargar", variant: "destructive", duration: 2000 })
                                    }
                                  }}
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Descargar PDF
                                </Button>
                              </div>
                              
                              {/* Exámenes */}
                              <Button
                                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 h-16"
                                onClick={async () => {
                                  try {
                                    await documentosAPI.descargarOrdenExamenesPDF(ficha.id)
                                    toast({ title: "✅ Descargado", description: "Orden de exámenes descargada", duration: 2000 })
                                  } catch (error) {
                                    toast({ title: "Error", description: "No se pudo descargar", variant: "destructive", duration: 2000 })
                                  }
                                }}
                              >
                                <div className="text-center">
                                  <FlaskConical className="w-5 h-5 mx-auto mb-1" />
                                  <span className="text-xs font-semibold">Orden Exámenes</span>
                                </div>
                              </Button>
                              
                              <Button
                                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 h-16"
                                onClick={async () => {
                                  try {
                                    await documentosAPI.descargarAltaPDF(ficha.id)
                                    toast({ title: "✅ Descargado", description: "Alta médica descargada", duration: 2000 })
                                  } catch (error) {
                                    toast({ title: "Error", description: "No se pudo descargar", variant: "destructive", duration: 2000 })
                                  }
                                }}
                              >
                                <div className="text-center">
                                  <FileCheck className="w-5 h-5 mx-auto mb-1" />
                                  <span className="text-xs font-semibold">Alta Médica</span>
                                </div>
                              </Button>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pacientes Hospitalizados */}
          <TabsContent value="hospitalizados" className="space-y-6">
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-indigo-500/10 border border-indigo-500/30 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Bed className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Pacientes Hospitalizados</p>
                  <p className="text-sm text-slate-400">Pacientes internados en camas de hospitalización general</p>
                </div>
              </div>
              <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                {fichasHospitalizados.length} hospitalizados
              </Badge>
            </div>

            {fichasHospitalizados.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <Bed className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin pacientes hospitalizados</h3>
                  <p className="text-slate-400">Los pacientes ingresados para hospitalización aparecerán aquí</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {fichasHospitalizados.map((ficha) => (
                  <Card key={ficha.id} className="border-slate-800 bg-slate-900/50 hover:border-indigo-500/50 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-lg">
                              {ficha.paciente.esNN ? 'N' : ficha.paciente.nombres?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white text-lg">
                                {ficha.paciente.esNN 
                                  ? `Paciente NN (${ficha.paciente.idTemporal})`
                                  : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`}
                              </h4>
                              <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                                <Bed className="w-3 h-3 mr-1" />
                                Hospitalizado
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                Ficha #{ficha.id}
                              </span>
                              {ficha.cama_asignada && (
                                <span className="flex items-center gap-1 text-indigo-400">
                                  <BedDouble className="w-4 h-4" />
                                  Cama: {ficha.cama_asignada.numero}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(ficha.fechaRegistro).toLocaleString('es-CL')}
                              </span>
                            </div>
                            {ficha.diagnostico && (
                              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <p className="text-xs text-blue-400 font-medium">Diagnóstico: {ficha.diagnostico.diagnostico_cie10}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {!ficha.cama_asignada && (
                          <Button 
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => abrirModalCamas(ficha, 'general')}
                          >
                            <Bed className="w-4 h-4 mr-2" />
                            Asignar Cama
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pacientes en UCI */}
          <TabsContent value="uci" className="space-y-6">
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Unidad de Cuidados Intensivos (UCI)</p>
                  <p className="text-sm text-slate-400">Pacientes en estado crítico que requieren monitoreo continuo</p>
                </div>
              </div>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                {fichasUCI.length} en UCI
              </Badge>
            </div>

            {fichasUCI.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin pacientes en UCI</h3>
                  <p className="text-slate-400">Los pacientes ingresados a UCI aparecerán aquí</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {fichasUCI.map((ficha) => (
                  <Card key={ficha.id} className="border-red-500/30 bg-gradient-to-r from-slate-900 to-red-950/20 hover:border-red-500/50 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-lg">
                              {ficha.paciente.esNN ? 'N' : ficha.paciente.nombres?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white text-lg">
                                {ficha.paciente.esNN 
                                  ? `Paciente NN (${ficha.paciente.idTemporal})`
                                  : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`}
                              </h4>
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                <Heart className="w-3 h-3 mr-1" />
                                UCI
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                Ficha #{ficha.id}
                              </span>
                              {ficha.cama_asignada && (
                                <span className="flex items-center gap-1 text-red-400">
                                  <BedDouble className="w-4 h-4" />
                                  Cama UCI: {ficha.cama_asignada.numero}
                                </span>
                              )}
                            </div>
                            {ficha.diagnostico && (
                              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-xs text-red-400 font-medium">Diagnóstico: {ficha.diagnostico.diagnostico_cie10}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {!ficha.cama_asignada && (
                          <Button 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => abrirModalCamas(ficha, 'uci')}
                          >
                            <Bed className="w-4 h-4 mr-2" />
                            Asignar Cama UCI
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pacientes Derivados */}
          <TabsContent value="derivados" className="space-y-6">
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-500/30 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Pacientes Derivados</p>
                  <p className="text-sm text-slate-400">Pacientes derivados a otros centros o especialidades</p>
                </div>
              </div>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                {fichasDerivados.length} derivados
              </Badge>
            </div>

            {fichasDerivados.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <RefreshCw className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin pacientes derivados</h3>
                  <p className="text-slate-400">Los pacientes derivados a otras instituciones aparecerán aquí</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {fichasDerivados.map((ficha) => (
                  <Card key={ficha.id} className="border-slate-800 bg-slate-900/50 hover:border-orange-500/50 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-lg">
                              {ficha.paciente.esNN ? 'N' : ficha.paciente.nombres?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white text-lg">
                                {ficha.paciente.esNN 
                                  ? `Paciente NN (${ficha.paciente.idTemporal})`
                                  : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`}
                              </h4>
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Derivado
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                Ficha #{ficha.id}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(ficha.fechaRegistro).toLocaleString('es-CL')}
                              </span>
                            </div>
                            {ficha.diagnostico && (
                              <>
                                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg mb-2">
                                  <p className="text-xs text-orange-400 font-medium">Diagnóstico: {ficha.diagnostico.diagnostico_cie10}</p>
                                </div>
                                {ficha.diagnostico.destino_derivacion && (
                                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <p className="text-xs text-amber-400 font-medium flex items-center gap-1">
                                      <RefreshCw className="w-3 h-3" />
                                      Derivado a: {ficha.diagnostico.destino_derivacion}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pacientes Fallecidos */}
          <TabsContent value="fallecidos" className="space-y-6">
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-600/20 via-gray-600/20 to-slate-600/20 border border-slate-500/30 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-500/20 flex items-center justify-center">
                  <X className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Registro de Decesos</p>
                  <p className="text-sm text-slate-400">Pacientes fallecidos durante la atención</p>
                </div>
              </div>
              <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                {fichasFallecidos.length} registros
              </Badge>
            </div>

            {fichasFallecidos.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <X className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin registros de decesos</h3>
                  <p className="text-slate-400">Los registros de fallecimiento aparecerán aquí</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {fichasFallecidos.map((ficha) => (
                  <Card key={ficha.id} className="border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800/50">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-gray-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {ficha.paciente.esNN ? 'N' : ficha.paciente.nombres?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-white text-lg">
                              {ficha.paciente.esNN 
                                ? `Paciente NN (${ficha.paciente.idTemporal})`
                                : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`}
                            </h4>
                            <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                              Fallecido
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              Ficha #{ficha.id}
                            </span>
                            {ficha.diagnostico?.hora_fallecimiento && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(ficha.diagnostico.hora_fallecimiento).toLocaleString('es-CL')}
                              </span>
                            )}
                          </div>
                          {ficha.diagnostico && (
                            <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                              <p className="text-xs text-slate-400 font-medium">Diagnóstico: {ficha.diagnostico.diagnostico_cie10}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
                <SelectItem value="general" className="text-white">Camas Generales</SelectItem>
                <SelectItem value="uci" className="text-white">Camas UCI</SelectItem>
                <SelectItem value="emergencia" className="text-white">Salas de Emergencia</SelectItem>
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
                            {cama.tipo === 'general' ? 'General' :
                             cama.tipo === 'uci' ? 'UCI' : 'Emergencia'}
                          </Badge>
                          <Badge variant="outline" className="border-green-500 text-green-400">
                            ✅ Disponible
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-400 space-y-1">
                          {cama.sala && <p>Sala: {cama.sala}</p>}
                          {cama.piso && <p>Piso: {cama.piso}</p>}
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
      
      {/* Chat Panel - visible cuando hay una ficha para chat */}
      {fichaParaChat && user && (
        <ChatPanel
          fichaId={fichaParaChat}
          usuarioActual={{
            id: user.id,
            username: user.username,
            first_name: user.first_name || user.username,
            last_name: user.last_name || "",
            rol: user.rol,
          }}
          onClose={() => setFichaParaChat(null)}
          fullScreen={true}
        />
      )}
      
      {/* Modal Editar Receta Médica */}
      <Dialog open={modalRecetaOpen} onOpenChange={setModalRecetaOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Pill className="w-5 h-5 text-green-400" />
              Editar Receta Médica
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {fichaParaReceta && (
                <>
                  Paciente: {fichaParaReceta.paciente.esNN 
                    ? `NN (${fichaParaReceta.paciente.idTemporal})`
                    : `${fichaParaReceta.paciente.nombres} ${fichaParaReceta.paciente.apellidos}`}
                  {fichaParaReceta.diagnostico?.codigo_diagnostico && (
                    <span className="ml-2 text-blue-400">
                      | Código: {fichaParaReceta.diagnostico.codigo_diagnostico}
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Diagnóstico actual */}
            {fichaParaReceta?.diagnostico && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400 font-medium mb-1">Diagnóstico:</p>
                <p className="text-sm text-white">{fichaParaReceta.diagnostico.diagnostico_cie10}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="medicamentos" className="text-slate-300">
                Medicamentos Prescritos
              </Label>
              <Textarea
                id="medicamentos"
                placeholder="Ingrese los medicamentos prescritos, uno por línea:
Ejemplo:
- Paracetamol 500mg - 1 comprimido cada 8 horas por 5 días
- Ibuprofeno 400mg - 1 comprimido cada 12 horas por 3 días (con alimentos)
- Omeprazol 20mg - 1 cápsula en ayunas por 7 días"
                value={recetaMedicamentos}
                onChange={(e) => setRecetaMedicamentos(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white min-h-[200px]"
              />
              <p className="text-xs text-slate-500">
                Ingrese cada medicamento con su dosis, frecuencia y duración del tratamiento.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={() => {
                setModalRecetaOpen(false)
                setFichaParaReceta(null)
                setRecetaMedicamentos("")
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleGuardarReceta}
              disabled={guardandoReceta}
            >
              {guardandoReceta ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Guardar Receta
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Ver Exámenes */}
      <Dialog open={modalVerExamenesOpen} onOpenChange={setModalVerExamenesOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Exámenes Solicitados
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {fichaParaReceta && (
                <span>
                  Paciente: <strong className="text-white">{fichaParaReceta.paciente?.nombres || 'NN'} {fichaParaReceta.paciente?.apellidos || fichaParaReceta.paciente?.identificador_nn}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {examenesDelPaciente.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay exámenes solicitados para este paciente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {examenesDelPaciente.map((examen: any, index: number) => (
                  <div 
                    key={examen.id || index}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-white">
                            {examen.tipo_examen || 'Examen'}
                          </span>
                          <Badge className={
                            examen.estado === 'completado' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : examen.estado === 'en_proceso'
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            {examen.estado === 'completado' ? 'Completado' 
                              : examen.estado === 'en_proceso' ? 'En Proceso' 
                              : 'Pendiente'}
                          </Badge>
                          {examen.prioridad === 'urgente' && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              Urgente
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-1">
                          {examen.descripcion || examen.detalles || 'Sin descripción'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Solicitado: {examen.fecha_solicitud ? new Date(examen.fecha_solicitud).toLocaleString('es-CL') : 'N/A'}
                        </p>
                        {examen.resultados && (
                          <div className="mt-2 p-2 bg-slate-900 rounded border border-slate-600">
                            <p className="text-xs text-slate-400 mb-1">Resultados:</p>
                            <p className="text-sm text-white whitespace-pre-wrap">{examen.resultados}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={() => {
                setModalVerExamenesOpen(false)
                setFichaParaReceta(null)
                setExamenesDelPaciente([])
              }}
            >
              Cerrar
            </Button>
            {examenesDelPaciente.length > 0 && fichaParaReceta && (
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  try {
                    await documentosAPI.descargarOrdenExamenesPDF(fichaParaReceta.id)
                    toast({ title: "PDF descargado", description: "Orden de exámenes descargada exitosamente", duration: 2000 })
                  } catch (error) {
                    toast({ title: "Error", description: "No se pudo descargar el PDF", variant: "destructive" })
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Cambiar Prioridad */}
      <Dialog open={modalPrioridadOpen} onOpenChange={setModalPrioridadOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Cambiar Prioridad
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {fichaParaReceta && (
                <span>
                  Paciente: <strong className="text-white">{fichaParaReceta.paciente?.nombres || 'NN'} {fichaParaReceta.paciente?.apellidos || fichaParaReceta.paciente?.identificador_nn}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prioridad">Nueva Prioridad</Label>
              <Select value={nuevaPrioridad} onValueChange={setNuevaPrioridad}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Seleccione prioridad" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="C1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>C1 - Resucitación</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="C2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span>C2 - Emergencia</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="C3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span>C3 - Urgencia</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="C4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>C4 - Menos Urgente</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="C5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>C5 - No Urgente</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={() => {
                setModalPrioridadOpen(false)
                setFichaParaReceta(null)
                setNuevaPrioridad("")
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={() => {
                if (fichaParaReceta && nuevaPrioridad) {
                  handleCambiarPrioridad(fichaParaReceta.id, nuevaPrioridad)
                }
              }}
              disabled={!nuevaPrioridad || guardandoReceta}
            >
              {guardandoReceta ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Guardar Cambio
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
