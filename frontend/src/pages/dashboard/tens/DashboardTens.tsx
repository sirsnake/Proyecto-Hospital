import { useEffect, useState, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { getSession } from "@/lib/auth"
import { authAPI, fichasAPI, signosVitalesAPI, camasAPI, chatAPI, pacientesAPI, solicitudesExamenesAPI, triageAPI, medicosAPI, turnosAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ModalBuscarPaciente } from "@/components/modal-buscar-paciente"
import { ChatPanel } from "@/components/chat-panel"
import { NotificationsPanel } from "@/components/notifications-panel"
import { ModalTurno } from "@/components/modal-turno"
import { useTurno } from "@/hooks/use-turno"
import { toast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { 
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
  TrendingUp,
  TrendingDown,
  Minus,
  BedDouble,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
  UserPlus,
  Phone,
  FileText,
  FlaskConical,
  Play,
  Save,
  ClipboardList,
  ShieldAlert,
  Zap,
  History
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

export default function TensDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("ambulancias")
  const [modalBuscarOpen, setModalBuscarOpen] = useState(false)
  const [fichasEnRuta, setFichasEnRuta] = useState<any[]>([])
  const [fichasEnHospital, setFichasEnHospital] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fichaEditando, setFichaEditando] = useState<number | null>(null)
  const [fichaExpandida, setFichaExpandida] = useState<number | null>(null)
  const [nuevosSignos, setNuevosSignos] = useState({
    presionSistolica: "",
    presionDiastolica: "",
    frecuenciaCardiaca: "",
    frecuenciaRespiratoria: "",
    saturacionO2: "",
    temperatura: "",
    glucosa: "",
    glasgowOcular: "",
    glasgowVerbal: "",
    glasgowMotor: "",
    eva: ""
  })

  // Errores de validación en tiempo real
  const [erroresValidacion, setErroresValidacion] = useState<Record<string, string>>({})

  // Rangos de validación
  const RANGOS_SIGNOS = {
    presionSistolica: { min: 40, max: 300, label: "Presión sistólica", unidad: "mmHg" },
    presionDiastolica: { min: 20, max: 200, label: "Presión diastólica", unidad: "mmHg" },
    frecuenciaCardiaca: { min: 20, max: 250, label: "Frecuencia cardíaca", unidad: "lpm" },
    frecuenciaRespiratoria: { min: 4, max: 60, label: "Frecuencia respiratoria", unidad: "rpm" },
    saturacionO2: { min: 50, max: 100, label: "Saturación O₂", unidad: "%" },
    temperatura: { min: 30, max: 45, label: "Temperatura", unidad: "°C" },
    glucosa: { min: 20, max: 600, label: "Glucosa", unidad: "mg/dL" },
  }

  // Función de validación en tiempo real
  const validarCampoSigno = (campo: string, valor: string): string => {
    const rango = RANGOS_SIGNOS[campo as keyof typeof RANGOS_SIGNOS]
    if (!rango) return ""
    if (valor === "") return ""
    
    const num = parseFloat(valor)
    if (isNaN(num)) return `Ingrese un número válido`
    if (num < rango.min || num > rango.max) {
      return `Debe estar entre ${rango.min} y ${rango.max} ${rango.unidad}`
    }
    return ""
  }

  // Manejador de cambio con validación en tiempo real
  const handleSignoChange = (campo: string, valor: string) => {
    setNuevosSignos(prev => ({ ...prev, [campo]: valor }))
    const errorMsg = validarCampoSigno(campo, valor)
    setErroresValidacion(prev => {
      const nuevos = { ...prev }
      if (errorMsg) {
        nuevos[campo] = errorMsg
      } else {
        delete nuevos[campo]
      }
      return nuevos
    })
  }

  // Estados para asignación de camas
  const [camasDisponibles, setCamasDisponibles] = useState<any[]>([])
  const [modalCamasOpen, setModalCamasOpen] = useState(false)
  const [fichaParaCama, setFichaParaCama] = useState<any>(null)
  const [tipoCamaFiltro, setTipoCamaFiltro] = useState('all')
  
  // Estados para asignación de médicos
  const [medicosDisponibles, setMedicosDisponibles] = useState<any[]>([])
  const [modalMedicosOpen, setModalMedicosOpen] = useState(false)
  const [fichaParaMedico, setFichaParaMedico] = useState<any>(null)
  
  // Estado para el chat - ficha actualmente seleccionada para comunicarse
  const [fichaParaChat, setFichaParaChat] = useState<number | null>(null)
  
  // Estados para editar datos del paciente (previsión y acompañante)
  const [modalEditarPaciente, setModalEditarPaciente] = useState(false)
  const [pacienteEditando, setPacienteEditando] = useState<any>(null)
  const [datosEdicion, setDatosEdicion] = useState({
    prevision: "",
    acompanante_nombre: "",
    acompanante_telefono: ""
  })
  const [guardandoPaciente, setGuardandoPaciente] = useState(false)
  
  // Estados para historial del paciente
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false)
  const [historialPaciente, setHistorialPaciente] = useState<any>(null)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  
  // Estados para exámenes
  const [examenesPendientes, setExamenesPendientes] = useState<any[]>([])
  const [examenesEnProceso, setExamenesEnProceso] = useState<any[]>([])
  const [modalResultadosOpen, setModalResultadosOpen] = useState(false)
  const [examenSeleccionado, setExamenSeleccionado] = useState<any>(null)
  const [resultadosExamen, setResultadosExamen] = useState("")
  const [guardandoExamen, setGuardandoExamen] = useState(false)
  
  // Estados para Triage
  const [modalTriageOpen, setModalTriageOpen] = useState(false)
  const [fichaParaTriage, setFichaParaTriage] = useState<any>(null)
  const [guardandoTriage, setGuardandoTriage] = useState(false)
  const [datosTriage, setDatosTriage] = useState({
    nivel_esi: "",
    color_manchester: "",
    motivo_consulta_triage: "",
    tiempo_inicio_sintomas: "",
    via_aerea: "permeable",
    respiracion_normal: true,
    circulacion_normal: true,
    estado_consciencia: "Alerta",
    dolor_presente: false,
    escala_dolor: "",
    localizacion_dolor: "",
    fiebre_alta: false,
    dificultad_respiratoria: false,
    dolor_toracico: false,
    alteracion_neurologica: false,
    sangrado_activo: false,
    trauma_mayor: false,
    recursos_necesarios: "0",
    observaciones: ""
  })

  // Hook de control de turno
  const { 
    turnoInfo, 
    mostrarModal: mostrarModalTurno, 
    enTurno, 
    cerrarModal: cerrarModalTurno 
  } = useTurno('tens')
  
  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "tens") {
      navigate("/", { replace: true })
      return
    }
    setUser(currentUser)
    cargarFichas()
    
    // Recargar fichas cada 60 segundos
    const interval = setInterval(cargarFichas, 60000)
    
    return () => {
      clearInterval(interval)
    }
  }, [navigate])

  // Recargar exámenes cuando se cambia a la pestaña de exámenes
  useEffect(() => {
    if (activeTab === 'examenes') {
      cargarExamenes()
    }
  }, [activeTab])

  const cargarFichas = async () => {
    try {
      setLoading(true)
      setError("")
      
      // Cargar fichas en ruta
      const enRuta = await fichasAPI.enRuta()
      setFichasEnRuta(Array.isArray(enRuta) ? enRuta : [])
      
      // Cargar fichas en hospital
      const enHospital = await fichasAPI.enHospital()
      setFichasEnHospital(Array.isArray(enHospital) ? enHospital : [])
      
      // Cargar exámenes pendientes y en proceso
      await cargarExamenes()
    } catch (err: any) {
      console.error('Error al cargar fichas:', err)
      setError(err.message || "Error al cargar fichas")
      setFichasEnRuta([])
      setFichasEnHospital([])
    } finally {
      setLoading(false)
    }
  }

  const cargarExamenes = async () => {
    try {
      const [pendientes, enProceso] = await Promise.all([
        solicitudesExamenesAPI.listar({ estado: 'pendiente' }),
        solicitudesExamenesAPI.listar({ estado: 'en_proceso' })
      ])
      setExamenesPendientes(Array.isArray(pendientes) ? pendientes : [])
      setExamenesEnProceso(Array.isArray(enProceso) ? enProceso : [])
    } catch (err: any) {
      // Error silencioso - los exámenes se recargarán automáticamente
    }
  }

  const handleIniciarExamen = async (examen: any) => {
    try {
      setGuardandoExamen(true)
      await solicitudesExamenesAPI.actualizar(examen.id, { estado: 'en_proceso' })
      toast({ title: "✅ Examen iniciado", description: "El examen ha sido marcado como en proceso", duration: 2000 })
      await cargarExamenes()
    } catch (err: any) {
      console.error('Error al iniciar examen:', err)
      toast({ title: "Error", description: err.message || "No se pudo iniciar el examen", variant: "destructive" })
    } finally {
      setGuardandoExamen(false)
    }
  }

  const handleAbrirResultados = (examen: any) => {
    setExamenSeleccionado(examen)
    setResultadosExamen(examen.resultados || "")
    setModalResultadosOpen(true)
  }

  const handleGuardarResultados = async () => {
    if (!examenSeleccionado) return
    
    try {
      setGuardandoExamen(true)
      // Usar el endpoint completar que incluye notificaciones al médico
      await solicitudesExamenesAPI.completar(examenSeleccionado.id, resultadosExamen)
      toast({ title: "✅ Examen completado", description: "Los resultados han sido guardados y el médico ha sido notificado", duration: 2000 })
      setModalResultadosOpen(false)
      setExamenSeleccionado(null)
      setResultadosExamen("")
      await cargarExamenes()
    } catch (err: any) {
      console.error('Error al guardar resultados:', err)
      toast({ title: "Error", description: err.message || "No se pudieron guardar los resultados", variant: "destructive" })
    } finally {
      setGuardandoExamen(false)
    }
  }

  // Función para abrir modal de triage (nuevo o edición)
  const abrirModalTriage = (ficha: any) => {
    setFichaParaTriage(ficha)
    
    // Si ya tiene triage, cargar datos existentes para edición
    if (ficha.triage) {
      const t = ficha.triage
      setDatosTriage({
        nivel_esi: String(t.nivel_esi),
        color_manchester: t.color_manchester || "",
        motivo_consulta_triage: t.motivo_consulta_triage || ficha.motivo_consulta || "",
        tiempo_inicio_sintomas: t.tiempo_inicio_sintomas || "",
        via_aerea: t.via_aerea || "permeable",
        respiracion_normal: t.respiracion_normal ?? true,
        circulacion_normal: t.circulacion_normal ?? true,
        estado_consciencia: t.estado_consciencia || "Alerta",
        dolor_presente: t.dolor_presente ?? false,
        escala_dolor: t.escala_dolor ? String(t.escala_dolor) : "",
        localizacion_dolor: t.localizacion_dolor || "",
        fiebre_alta: t.fiebre_alta ?? false,
        dificultad_respiratoria: t.dificultad_respiratoria ?? false,
        dolor_toracico: t.dolor_toracico ?? false,
        alteracion_neurologica: t.alteracion_neurologica ?? false,
        sangrado_activo: t.sangrado_activo ?? false,
        trauma_mayor: t.trauma_mayor ?? false,
        recursos_necesarios: t.recursos_necesarios ? String(t.recursos_necesarios) : "0",
        observaciones: t.observaciones || ""
      })
    } else {
      // Nuevo triage
      setDatosTriage({
        nivel_esi: "",
        color_manchester: "",
        motivo_consulta_triage: ficha.motivo_consulta || "",
        tiempo_inicio_sintomas: "",
        via_aerea: "permeable",
        respiracion_normal: true,
        circulacion_normal: true,
        estado_consciencia: "Alerta",
        dolor_presente: false,
        escala_dolor: "",
        localizacion_dolor: "",
        fiebre_alta: false,
        dificultad_respiratoria: false,
        dolor_toracico: false,
        alteracion_neurologica: false,
        sangrado_activo: false,
        trauma_mayor: false,
        recursos_necesarios: "0",
        observaciones: ""
      })
    }
    setModalTriageOpen(true)
  }

  // Función para guardar el triage (crear o actualizar)
  const handleGuardarTriage = async () => {
    if (!fichaParaTriage || !datosTriage.nivel_esi) {
      toast({ title: "Error", description: "Debe seleccionar el nivel ESI", variant: "destructive" })
      return
    }
    
    try {
      setGuardandoTriage(true)
      
      const datosEnviar = {
        ficha: fichaParaTriage.id,
        nivel_esi: parseInt(datosTriage.nivel_esi),
        color_manchester: datosTriage.color_manchester || null,
        motivo_consulta_triage: datosTriage.motivo_consulta_triage,
        tiempo_inicio_sintomas: datosTriage.tiempo_inicio_sintomas || null,
        via_aerea: datosTriage.via_aerea,
        respiracion_normal: datosTriage.respiracion_normal,
        circulacion_normal: datosTriage.circulacion_normal,
        estado_consciencia: datosTriage.estado_consciencia,
        dolor_presente: datosTriage.dolor_presente,
        escala_dolor: datosTriage.dolor_presente && datosTriage.escala_dolor ? parseInt(datosTriage.escala_dolor) : null,
        localizacion_dolor: datosTriage.dolor_presente ? datosTriage.localizacion_dolor : null,
        fiebre_alta: datosTriage.fiebre_alta,
        dificultad_respiratoria: datosTriage.dificultad_respiratoria,
        dolor_toracico: datosTriage.dolor_toracico,
        alteracion_neurologica: datosTriage.alteracion_neurologica,
        sangrado_activo: datosTriage.sangrado_activo,
        trauma_mayor: datosTriage.trauma_mayor,
        recursos_necesarios: parseInt(datosTriage.recursos_necesarios) || 0,
        observaciones: datosTriage.observaciones || null
      }
      
      // Si ya existe triage, actualizar; si no, crear
      const esEdicion = !!fichaParaTriage.triage
      if (esEdicion) {
        await triageAPI.actualizar(fichaParaTriage.triage.id, datosEnviar)
      } else {
        await triageAPI.crear(datosEnviar)
      }
      
      const nivelDescripcion = {
        1: "ESI 1 - Resucitación",
        2: "ESI 2 - Emergencia",
        3: "ESI 3 - Urgencia",
        4: "ESI 4 - Menos urgente",
        5: "ESI 5 - No urgente"
      }[parseInt(datosTriage.nivel_esi)] || "Completado"
      
      toast({ 
        title: esEdicion ? "✅ Triage actualizado" : "✅ Triage completado", 
        description: `Clasificación: ${nivelDescripcion}`,
        duration: 3000 
      })
      
      setModalTriageOpen(false)
      setFichaParaTriage(null)
      await cargarFichas()
    } catch (err: any) {
      console.error('Error al guardar triage:', err)
      toast({ 
        title: "Error", 
        description: err.message || "No se pudo guardar el triage", 
        variant: "destructive" 
      })
    } finally {
      setGuardandoTriage(false)
    }
  }

  // Colores ESI para el selector
  const getColorESI = (nivel: string) => {
    const colores: Record<string, string> = {
      "1": "bg-red-500",
      "2": "bg-orange-500",
      "3": "bg-yellow-500",
      "4": "bg-green-500",
      "5": "bg-blue-500"
    }
    return colores[nivel] || "bg-slate-500"
  }

  // Función para cargar historial del paciente
  const cargarHistorialPaciente = async (pacienteId: number) => {
    try {
      setCargandoHistorial(true)
      const historial = await pacientesAPI.historial(pacienteId)
      setHistorialPaciente(historial)
      setModalHistorialOpen(true)
    } catch (err: any) {
      console.error('Error al cargar historial:', err)
      toast({ title: "Error", description: "No se pudo cargar el historial del paciente", variant: "destructive" })
    } finally {
      setCargandoHistorial(false)
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

  // Funciones para asignación de médicos
  const cargarMedicos = async () => {
    try {
      // Solo cargar médicos que están en turno hoy
      const medicos = await medicosAPI.listar(true)
      setMedicosDisponibles(Array.isArray(medicos) ? medicos : [])
    } catch (err: any) {
      console.error('Error al cargar médicos:', err)
      toast({ title: "Error", description: "No se pudieron cargar los médicos", variant: "destructive" })
    }
  }

  const abrirModalMedicos = async (ficha: any) => {
    setFichaParaMedico(ficha)
    setModalMedicosOpen(true)
    await cargarMedicos()
  }

  const handleAsignarMedico = async (medicoId: number) => {
    if (!fichaParaMedico) return

    try {
      await medicosAPI.asignarAFicha(fichaParaMedico.id, medicoId)
      const medicoNombre = medicosDisponibles.find(m => m.id === medicoId)?.nombre || 'Médico'
      toast({ title: "✅ Médico asignado", description: `${medicoNombre} asignado al paciente` })
      setModalMedicosOpen(false)
      setFichaParaMedico(null)
      setMedicosDisponibles([])
      await cargarFichas()
    } catch (err: any) {
      console.error('Error al asignar médico:', err)
      toast({ title: "Error", description: err.message || "No se pudo asignar el médico", variant: "destructive" })
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
    try {
      setLoading(true)
      setError("")
      
      // Verificar si hay errores de validación pendientes
      if (Object.keys(erroresValidacion).length > 0) {
        setError("Corrija los errores en los campos antes de guardar")
        setLoading(false)
        return
      }
      
      // Validar que al menos un campo esté completo
      const algunCampoCompleto = Object.values(nuevosSignos).some(val => val !== "")
      if (!algunCampoCompleto) {
        setError("Debe completar al menos un signo vital")
        setLoading(false)
        return
      }
      
      // Validar Glasgow desglosado
      const glasgowCompleto = nuevosSignos.glasgowOcular && nuevosSignos.glasgowVerbal && nuevosSignos.glasgowMotor
      const glasgowParcial = nuevosSignos.glasgowOcular || nuevosSignos.glasgowVerbal || nuevosSignos.glasgowMotor
      
      if (glasgowParcial && !glasgowCompleto) {
        setError("Debe completar los tres componentes de la escala de Glasgow")
        setLoading(false)
        return
      }
      
      // Validar EVA (debe estar entre 0 y 10)
      if (nuevosSignos.eva && (parseInt(nuevosSignos.eva) < 0 || parseInt(nuevosSignos.eva) > 10)) {
        setError("La escala EVA debe estar entre 0 y 10")
        setLoading(false)
        return
      }
      
      const data = {
        ficha: fichaId,
        presion_sistolica: nuevosSignos.presionSistolica || null,
        presion_diastolica: nuevosSignos.presionDiastolica || null,
        frecuencia_cardiaca: nuevosSignos.frecuenciaCardiaca || null,
        frecuencia_respiratoria: nuevosSignos.frecuenciaRespiratoria || null,
        saturacion_o2: nuevosSignos.saturacionO2 || null,
        temperatura: nuevosSignos.temperatura || null,
        glucosa: nuevosSignos.glucosa || null,
        glasgow_ocular: nuevosSignos.glasgowOcular || null,
        glasgow_verbal: nuevosSignos.glasgowVerbal || null,
        glasgow_motor: nuevosSignos.glasgowMotor || null,
        eva: nuevosSignos.eva || null
      }
      
      const resultado = await signosVitalesAPI.crear(data)
      setSuccess("✅ Signos vitales actualizados exitosamente")
      
      // Limpiar formulario y errores
      setNuevosSignos({
        presionSistolica: "",
        presionDiastolica: "",
        frecuenciaCardiaca: "",
        frecuenciaRespiratoria: "",
        saturacionO2: "",
        temperatura: "",
        glucosa: "",
        glasgowOcular: "",
        glasgowVerbal: "",
        glasgowMotor: "",
        eva: ""
      })
      setErroresValidacion({})
      setFichaEditando(null)
      
      // Recargar fichas
      await cargarFichas()
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      console.error('Error al guardar signos vitales:', err)
      setError(err.message || "Error al guardar signos vitales")
    } finally {
      setLoading(false)
    }
  }

  // Funciones para editar datos del paciente (previsión y acompañante)
  const abrirModalEditarPaciente = (paciente: any) => {
    setPacienteEditando(paciente)
    setDatosEdicion({
      prevision: paciente.prevision || "",
      acompanante_nombre: paciente.acompanante_nombre || "",
      acompanante_telefono: paciente.acompanante_telefono || ""
    })
    setModalEditarPaciente(true)
  }

  const handleGuardarDatosPaciente = async () => {
    if (!pacienteEditando) return

    try {
      setGuardandoPaciente(true)
      
      await pacientesAPI.actualizar(pacienteEditando.id, {
        prevision: datosEdicion.prevision || null,
        acompanante_nombre: datosEdicion.acompanante_nombre || null,
        acompanante_telefono: datosEdicion.acompanante_telefono || null
      })
      
      toast({ 
        title: "✅ Datos actualizados", 
        description: "Se guardaron los datos del paciente correctamente" 
      })
      
      setModalEditarPaciente(false)
      setPacienteEditando(null)
      
      // Recargar fichas para ver los cambios
      await cargarFichas()
    } catch (err: any) {
      console.error('Error al actualizar paciente:', err)
      toast({ 
        title: "Error", 
        description: err.message || "No se pudieron guardar los datos", 
        variant: "destructive" 
      })
    } finally {
      setGuardandoPaciente(false)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Modal de verificación de turno */}
      <ModalTurno
        open={mostrarModalTurno}
        turnoInfo={turnoInfo}
        onTurnoIniciado={cerrarModalTurno}
        onSalir={() => {
          cerrarModalTurno()
          navigate('/')
        }}
      />

      {/* Indicador de turno */}
      {enTurno && turnoInfo?.turno_actual && (
        <div className="fixed bottom-4 left-4 z-40 bg-emerald-600/90 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          En turno: {turnoInfo.turno_actual.tipo_turno_display}
          {turnoInfo.turno_actual.es_voluntario && ' (Voluntario)'}
        </div>
      )}

      {/* Header Mejorado */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Panel TENS</h1>
                <p className="text-xs text-slate-400">{user.first_name} {user.last_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Indicador de pacientes */}
              <div className="hidden md:flex items-center gap-4 mr-4 px-4 py-2 bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-slate-300">
                    <span className="font-bold text-white">{fichasEnRuta.length}</span> en ruta
                  </span>
                </div>
                <div className="w-px h-4 bg-slate-700" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-300">
                    <span className="font-bold text-white">{fichasEnHospital.length}</span> en hospital
                  </span>
                </div>
              </div>

              {/* Panel de Notificaciones */}
              <NotificationsPanel 
                onNavigateToFicha={(fichaId) => {
                  const fichaEncontrada = [...fichasEnRuta, ...fichasEnHospital].find(f => f.id === fichaId)
                  if (fichaEncontrada) {
                    setFichaExpandida(fichaExpandida === fichaId ? null : fichaId)
                  }
                }}
                onOpenChat={(fichaId) => {
                  // Abrir chat de la ficha
                  setFichaParaChat(fichaId)
                }}
                onViewSignos={(fichaId) => {
                  // Expandir ficha para ver/registrar signos vitales
                  setFichaExpandida(fichaId)
                  // Abrir el formulario de edición de signos
                  setFichaEditando(fichaId)
                }}
              />

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
                onClick={cargarFichas}
                disabled={loading}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  try {
                    await authAPI.logout()
                  } catch (error) {
                    console.error('Error al cerrar sesión:', error)
                  } finally {
                    localStorage.removeItem("medical_system_user")
                    navigate("/", { replace: true })
                  }
                }}
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
              <Activity className="w-4 h-4" />
              {success}
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/30 text-red-500">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 w-full bg-slate-800/50 p-1 h-auto">
            <TabsTrigger value="ambulancias" className="flex-1 min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-orange-600 data-[state=active]:text-white h-10 text-xs sm:text-sm">
              <Activity className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Ambulancias</span>
              <span className="sm:hidden">Amb.</span>
              {fichasEnRuta.length > 0 && <Badge className="ml-1 sm:ml-2 bg-white/20 text-white text-xs">{fichasEnRuta.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="hospital" className="flex-1 min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white h-10 text-xs sm:text-sm">
              <BedDouble className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">En Hospital</span>
              <span className="sm:hidden">Hosp.</span>
              {fichasEnHospital.length > 0 && <Badge className="ml-1 sm:ml-2 bg-white/20 text-white text-xs">{fichasEnHospital.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="examenes" className="flex-1 min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-violet-600 data-[state=active]:text-white h-10 text-xs sm:text-sm">
              <FlaskConical className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Exámenes</span>
              <span className="sm:hidden">Exam.</span>
              {(examenesPendientes.length + examenesEnProceso.length) > 0 && <Badge className="ml-1 sm:ml-2 bg-white/20 text-white text-xs">{examenesPendientes.length + examenesEnProceso.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ambulancias" className="space-y-6">
            {loading && fichasEnRuta.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-3" />
                <p className="text-slate-400">Cargando fichas en ruta...</p>
              </div>
            ) : (
              <>
                {/* Header de ambulancias */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-red-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">
                        {fichasEnRuta.length > 0 
                          ? `${fichasEnRuta.length} ambulancia(s) en ruta`
                          : "Sin ambulancias en ruta"
                        }
                      </p>
                      <p className="text-sm text-slate-400">Monitoreo en tiempo real • Actualización automática cada 60s</p>
                    </div>
                  </div>
                  <Button 
                    onClick={cargarFichas} 
                    disabled={loading}
                    variant="outline" 
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
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
                      <Card key={ficha.id} className="border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/50 overflow-hidden shadow-xl">
                        {/* Barra superior de prioridad */}
                        <div className={`h-1.5 ${
                          ficha.prioridad === 'C1' ? 'bg-gradient-to-r from-red-600 to-red-500' :
                          ficha.prioridad === 'C2' ? 'bg-gradient-to-r from-orange-600 to-orange-500' :
                          ficha.prioridad === 'C3' ? 'bg-gradient-to-r from-yellow-600 to-yellow-500' :
                          ficha.prioridad === 'C4' ? 'bg-gradient-to-r from-green-600 to-green-500' :
                          'bg-gradient-to-r from-blue-600 to-blue-500'
                        }`} />
                        
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                ficha.prioridad === 'C1' ? 'bg-red-500/20' :
                                ficha.prioridad === 'C2' ? 'bg-orange-500/20' :
                                ficha.prioridad === 'C3' ? 'bg-yellow-500/20' :
                                'bg-green-500/20'
                              }`}>
                                <Activity className={`w-6 h-6 ${
                                  ficha.prioridad === 'C1' ? 'text-red-500 animate-pulse' :
                                  ficha.prioridad === 'C2' ? 'text-orange-500' :
                                  ficha.prioridad === 'C3' ? 'text-yellow-500' :
                                  'text-green-500'
                                }`} />
                              </div>
                              <div>
                                <CardTitle className="text-white text-lg">
                                  {ficha.paciente?.es_nn 
                                    ? `Paciente NN (${ficha.paciente.id_temporal})`
                                    : `${ficha.paciente?.nombres || 'Sin nombre'} ${ficha.paciente?.apellidos || ''}`
                                  }
                                </CardTitle>
                                <CardDescription className="text-slate-400 flex items-center gap-2 mt-1">
                                  <User className="w-3 h-3" />
                                  {ficha.paciente?.sexo} • {calcularEdad(ficha.paciente)} años
                                  <span className="text-slate-600">|</span>
                                  <Stethoscope className="w-3 h-3" />
                                  {ficha.paramedico_nombre || 'N/A'}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={`${getPrioridadColor(ficha.prioridad)} shadow-lg`}>
                                {getPrioridadLabel(ficha.prioridad)}
                              </Badge>
                              <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <p className="text-sm font-bold text-blue-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  ETA: {ficha.eta}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Motivo y Circunstancias */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" />
                                Motivo de Consulta
                              </h4>
                              <p className="text-sm text-white">{ficha.motivo_consulta}</p>
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

                          {signosVitales && (
                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Heart className="w-3 h-3" />
                                Signos Vitales (Paramédico)
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Heart className="w-4 h-4 text-red-400" />
                                    <p className="text-xs text-slate-400">Presión</p>
                                  </div>
                                  <p className="text-lg font-bold text-white">{signosVitales.presion}</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-xl">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Activity className="w-4 h-4 text-pink-400" />
                                    <p className="text-xs text-slate-400">FC</p>
                                  </div>
                                  <p className="text-lg font-bold text-white">{signosVitales.fc} <span className="text-xs text-slate-400">lpm</span></p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Wind className="w-4 h-4 text-cyan-400" />
                                    <p className="text-xs text-slate-400">FR</p>
                                  </div>
                                  <p className="text-lg font-bold text-white">{signosVitales.fr} <span className="text-xs text-slate-400">rpm</span></p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Droplets className="w-4 h-4 text-blue-400" />
                                    <p className="text-xs text-slate-400">SatO₂</p>
                                  </div>
                                  <p className="text-lg font-bold text-white">{signosVitales.sato2}</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Thermometer className="w-4 h-4 text-orange-400" />
                                    <p className="text-xs text-slate-400">Temp</p>
                                  </div>
                                  <p className="text-lg font-bold text-white">{signosVitales.temperatura}</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Brain className="w-4 h-4 text-purple-400" />
                                    <p className="text-xs text-slate-400">Glasgow</p>
                                  </div>
                                  <p className="text-lg font-bold text-white">{signosVitales.glasgow}</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl col-span-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle className="w-4 h-4 text-amber-400" />
                                    <p className="text-xs text-slate-400">EVA (Dolor)</p>
                                  </div>
                                  <p className="text-lg font-bold text-white">{signosVitales.eva}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Info banner */}
                          <div className="p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                            <p className="text-sm text-blue-300">
                              Ambulancia en tránsito • Datos actualizándose automáticamente
                            </p>
                          </div>

                          {/* Botones de acción */}
                          <div className="flex gap-3 pt-2">
                            <Button 
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/20"
                              onClick={() => handleMarcarLlegada(ficha.id)}
                              disabled={loading}
                            >
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Paciente Ya Llegó
                            </Button>
                            <Button 
                              variant={fichaParaChat === ficha.id ? "default" : "outline"}
                              className={fichaParaChat === ficha.id 
                                ? "bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-500/20" 
                                : "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                              }
                              onClick={() => setFichaParaChat(fichaParaChat === ficha.id ? null : ficha.id)}
                            >
                              <MessageCircle className="w-5 h-5 mr-2" />
                              Chat
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
            {/* Header de sección */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Pacientes en Hospital
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {fichasEnHospital.length} paciente(s) esperando atención
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={cargarFichas}
                disabled={loading}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            {/* Lista de pacientes */}
            {fichasEnHospital.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin pacientes en espera</h3>
                  <p className="text-slate-400">Los pacientes que lleguen al hospital aparecerán aquí</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {fichasEnHospital.map((ficha) => {
                  const edad = calcularEdad(ficha.paciente)
                  const nombrePaciente = ficha.paciente?.es_nn 
                    ? `Paciente NN (${ficha.paciente.id_temporal || 'Sin ID'})`
                    : `${ficha.paciente?.nombres || ''} ${ficha.paciente?.apellidos || ''}`
                  const ultimosSignos = ficha.signos_vitales?.[ficha.signos_vitales.length - 1]
                  const isExpanded = fichaExpandida === ficha.id
                  
                  return (
                    <Card 
                      key={ficha.id} 
                      className={`border-slate-800 bg-slate-900/50 overflow-hidden transition-all ${
                        fichaEditando === ficha.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {/* Cabecera de la tarjeta - siempre visible */}
                      <div className="p-4">
                        {/* Fila 1: Avatar + Nombre */}
                        <div className="flex items-center gap-3 mb-3">
                          {/* Avatar */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            ficha.prioridad === 'C1' ? 'bg-red-500/20' :
                            ficha.prioridad === 'C2' ? 'bg-orange-500/20' :
                            ficha.prioridad === 'C3' ? 'bg-yellow-500/20' :
                            ficha.prioridad === 'C4' ? 'bg-green-500/20' :
                            'bg-slate-500/20'
                          }`}>
                            <User className={`w-6 h-6 ${
                              ficha.prioridad === 'C1' ? 'text-red-400' :
                              ficha.prioridad === 'C2' ? 'text-orange-400' :
                              ficha.prioridad === 'C3' ? 'text-yellow-400' :
                              ficha.prioridad === 'C4' ? 'text-green-400' :
                              'text-slate-400'
                            }`} />
                          </div>
                          
                          {/* Nombre y datos */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-white truncate text-lg">{nombrePaciente}</h3>
                              <span className="text-sm text-slate-400">
                                {ficha.paciente?.sexo === 'M' ? 'M' : 'F'} {edad} años
                              </span>
                            </div>
                            <p className="text-sm text-slate-300 mt-0.5 line-clamp-1">{ficha.motivo_consulta}</p>
                          </div>
                        </div>

                        {/* CLASIFICACIONES COMPACTAS CON COLORES SÓLIDOS */}
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

                          {/* Hora de llegada */}
                          <div className="flex flex-col items-center justify-center px-3 bg-slate-700 rounded-lg">
                            <Clock className="w-3 h-3 text-slate-300 mb-0.5" />
                            <span className="text-sm font-bold text-white">
                              {ficha.fecha_actualizacion ? new Date(ficha.fecha_actualizacion).toLocaleTimeString('es-CL', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase">Llegada</span>
                          </div>
                        </div>

                        {/* Signos vitales resumidos - siempre visible */}
                        {ultimosSignos && (
                          <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-3">
                            <SignoVitalCard
                              icon={Activity}
                              label="PA"
                              value={`${ultimosSignos.presion_sistolica}/${ultimosSignos.presion_diastolica}`}
                              status={evaluarSignoVital('presion_sistolica', ultimosSignos.presion_sistolica)}
                            />
                            <SignoVitalCard
                              icon={Heart}
                              label="FC"
                              value={ultimosSignos.frecuencia_cardiaca}
                              unit="lpm"
                              status={evaluarSignoVital('frecuencia_cardiaca', ultimosSignos.frecuencia_cardiaca)}
                            />
                            <SignoVitalCard
                              icon={Wind}
                              label="FR"
                              value={ultimosSignos.frecuencia_respiratoria}
                              unit="rpm"
                              status={evaluarSignoVital('frecuencia_respiratoria', ultimosSignos.frecuencia_respiratoria)}
                            />
                            <SignoVitalCard
                              icon={Droplets}
                              label="SatO₂"
                              value={ultimosSignos.saturacion_o2}
                              unit="%"
                              status={evaluarSignoVital('saturacion_o2', ultimosSignos.saturacion_o2)}
                            />
                            <SignoVitalCard
                              icon={Thermometer}
                              label="Temp"
                              value={ultimosSignos.temperatura}
                              unit="°C"
                              status={evaluarSignoVital('temperatura', ultimosSignos.temperatura)}
                            />
                            {ultimosSignos.escala_glasgow && (
                              <SignoVitalCard
                                icon={Brain}
                                label="Glasgow"
                                value={ultimosSignos.escala_glasgow}
                                unit="/15"
                                status={evaluarSignoVital('glasgow', ultimosSignos.escala_glasgow)}
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
                          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                            <p className="text-sm text-amber-400 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Sin signos vitales registrados - Requiere medición
                            </p>
                          </div>
                        )}

                        {/* BOTONES DE ACCIÓN - SIEMPRE VISIBLES */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                          {/* Botón Medir Signos */}
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => setFichaEditando(fichaEditando === ficha.id ? null : ficha.id)}
                          >
                            <Activity className="w-4 h-4 mr-1.5" />
                            {fichaEditando === ficha.id ? 'Cancelar' : 'Signos Vitales'}
                          </Button>

                          {/* Botón Chat */}
                          <Button
                            size="sm"
                            variant={fichaParaChat === ficha.id ? "default" : "outline"}
                            className={fichaParaChat === ficha.id 
                              ? "bg-purple-600 hover:bg-purple-700" 
                              : "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                            }
                            onClick={() => setFichaParaChat(fichaParaChat === ficha.id ? null : ficha.id)}
                          >
                            <MessageCircle className="w-4 h-4 mr-1.5" />
                            Chat
                          </Button>

                          {/* Estado de Cama */}
                          {ficha.cama_asignada ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-lg">
                              <Bed className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-300 text-sm font-medium">
                                {ficha.cama_asignada.numero}
                              </span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-700"
                              onClick={() => abrirModalCamas(ficha)}
                            >
                              <Bed className="w-4 h-4 mr-1.5" />
                              Asignar Cama
                            </Button>
                          )}

                          {/* Estado de Médico Asignado */}
                          {ficha.medico_asignado ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                              <Stethoscope className="w-4 h-4 text-blue-400" />
                              <span className="text-blue-300 text-sm font-medium">
                                Dr. {ficha.medico_asignado_nombre?.split(' ')[0] || 'Asignado'}
                              </span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => abrirModalMedicos(ficha)}
                            >
                              <Stethoscope className="w-4 h-4 mr-1.5" />
                              Asignar Médico
                            </Button>
                          )}

                          {/* Botón de Triage */}
                          {!ficha.triage ? (
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => abrirModalTriage(ficha)}
                            >
                              <ClipboardList className="w-4 h-4 mr-1.5" />
                              Triage
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                              onClick={() => abrirModalTriage(ficha)}
                            >
                              <ClipboardList className="w-4 h-4 mr-1.5" />
                              Editar Triage
                            </Button>
                          )}

                          {/* Botón ver historial del paciente */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => cargarHistorialPaciente(ficha.paciente?.id)}
                            disabled={!ficha.paciente?.id || cargandoHistorial}
                          >
                            <History className="w-4 h-4 mr-1.5" />
                            Historial
                          </Button>

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
                          <div className="px-4 pb-4 space-y-4 border-t border-slate-800 pt-4 bg-slate-900/30">
                            {/* Historial de signos vitales */}
                            {ficha.signos_vitales && ficha.signos_vitales.length > 1 && (
                              <div>
                                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  Historial de Mediciones ({ficha.signos_vitales.length})
                                </h4>
                                <div className="space-y-3">
                                  {ficha.signos_vitales.slice(0, -1).reverse().map((signos: any, index: number) => (
                                    <div key={signos.id} className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl border border-slate-700/50">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-blue-400' : 'bg-slate-500'}`} />
                                          <span className="text-sm font-medium text-white">
                                            {index === ficha.signos_vitales.length - 2 ? 'Paramédico (inicial)' : `Medición #${ficha.signos_vitales.length - index - 1}`}
                                          </span>
                                        </div>
                                        <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                                          {signos.timestamp ? new Date(signos.timestamp).toLocaleString('es-CL', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          }) : ''}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                        <div className={`p-2 rounded-lg text-center ${
                                          signos.presion_sistolica < 90 || signos.presion_sistolica > 140 
                                            ? signos.presion_sistolica < 80 || signos.presion_sistolica > 180 
                                              ? 'bg-red-500/20 border border-red-500/30' 
                                              : 'bg-amber-500/20 border border-amber-500/30'
                                            : 'bg-emerald-500/10 border border-emerald-500/20'
                                        }`}>
                                          <p className="text-[10px] text-slate-400">PA</p>
                                          <p className="text-sm font-bold text-white">{signos.presion_sistolica}/{signos.presion_diastolica}</p>
                                        </div>
                                        <div className={`p-2 rounded-lg text-center ${
                                          signos.frecuencia_cardiaca < 60 || signos.frecuencia_cardiaca > 100 
                                            ? signos.frecuencia_cardiaca < 50 || signos.frecuencia_cardiaca > 120 
                                              ? 'bg-red-500/20 border border-red-500/30' 
                                              : 'bg-amber-500/20 border border-amber-500/30'
                                            : 'bg-emerald-500/10 border border-emerald-500/20'
                                        }`}>
                                          <p className="text-[10px] text-slate-400">FC</p>
                                          <p className="text-sm font-bold text-white">{signos.frecuencia_cardiaca} <span className="text-[10px] font-normal">lpm</span></p>
                                        </div>
                                        <div className={`p-2 rounded-lg text-center ${
                                          signos.frecuencia_respiratoria < 12 || signos.frecuencia_respiratoria > 20 
                                            ? signos.frecuencia_respiratoria < 10 || signos.frecuencia_respiratoria > 30 
                                              ? 'bg-red-500/20 border border-red-500/30' 
                                              : 'bg-amber-500/20 border border-amber-500/30'
                                            : 'bg-emerald-500/10 border border-emerald-500/20'
                                        }`}>
                                          <p className="text-[10px] text-slate-400">FR</p>
                                          <p className="text-sm font-bold text-white">{signos.frecuencia_respiratoria} <span className="text-[10px] font-normal">rpm</span></p>
                                        </div>
                                        <div className={`p-2 rounded-lg text-center ${
                                          signos.saturacion_o2 < 95 
                                            ? signos.saturacion_o2 < 90 
                                              ? 'bg-red-500/20 border border-red-500/30' 
                                              : 'bg-amber-500/20 border border-amber-500/30'
                                            : 'bg-emerald-500/10 border border-emerald-500/20'
                                        }`}>
                                          <p className="text-[10px] text-slate-400">SatO₂</p>
                                          <p className="text-sm font-bold text-white">{signos.saturacion_o2}%</p>
                                        </div>
                                        <div className={`p-2 rounded-lg text-center ${
                                          parseFloat(signos.temperatura) < 36 || parseFloat(signos.temperatura) > 37.5 
                                            ? parseFloat(signos.temperatura) < 35 || parseFloat(signos.temperatura) > 39 
                                              ? 'bg-red-500/20 border border-red-500/30' 
                                              : 'bg-amber-500/20 border border-amber-500/30'
                                            : 'bg-emerald-500/10 border border-emerald-500/20'
                                        }`}>
                                          <p className="text-[10px] text-slate-400">Temp</p>
                                          <p className="text-sm font-bold text-white">{signos.temperatura}°C</p>
                                        </div>
                                      </div>
                                      {/* Glasgow y EVA si existen */}
                                      {(signos.escala_glasgow || signos.eva !== null) && (
                                        <div className="flex gap-2 mt-2">
                                          {signos.escala_glasgow && (
                                            <div className={`flex-1 p-2 rounded-lg text-center ${
                                              signos.escala_glasgow >= 13 ? 'bg-emerald-500/10 border border-emerald-500/20' :
                                              signos.escala_glasgow >= 9 ? 'bg-amber-500/20 border border-amber-500/30' :
                                              'bg-red-500/20 border border-red-500/30'
                                            }`}>
                                              <p className="text-[10px] text-slate-400">Glasgow</p>
                                              <p className="text-sm font-bold text-white">{signos.escala_glasgow}/15</p>
                                            </div>
                                          )}
                                          {signos.eva !== null && signos.eva !== undefined && (
                                            <div className={`flex-1 p-2 rounded-lg text-center ${
                                              signos.eva <= 3 ? 'bg-emerald-500/10 border border-emerald-500/20' :
                                              signos.eva <= 6 ? 'bg-amber-500/20 border border-amber-500/30' :
                                              'bg-red-500/20 border border-red-500/30'
                                            }`}>
                                              <p className="text-[10px] text-slate-400">EVA</p>
                                              <p className="text-sm font-bold text-white">{signos.eva}/10</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Información adicional */}
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="p-3 bg-slate-800/30 rounded-lg">
                                <h5 className="text-xs font-semibold text-slate-400 mb-1">Motivo de Consulta</h5>
                                <p className="text-sm text-white">{ficha.motivo_consulta}</p>
                              </div>
                              {ficha.circunstancias && (
                                <div className="p-3 bg-slate-800/30 rounded-lg">
                                  <h5 className="text-xs font-semibold text-slate-400 mb-1">Circunstancias</h5>
                                  <p className="text-sm text-white">{ficha.circunstancias}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Datos del paciente: Previsión y Acompañante */}
                            <div className="p-3 bg-slate-800/30 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-xs font-semibold text-slate-400">Datos Administrativos</h5>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7 px-2"
                                  onClick={() => abrirModalEditarPaciente(ficha.paciente)}
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  Editar
                                </Button>
                              </div>
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[10px] text-slate-500 uppercase">Previsión</p>
                                  <p className="text-sm text-white">
                                    {ficha.paciente?.prevision 
                                      ? ficha.paciente.prevision === 'fonasa_a' ? 'FONASA A' :
                                        ficha.paciente.prevision === 'fonasa_b' ? 'FONASA B' :
                                        ficha.paciente.prevision === 'fonasa_c' ? 'FONASA C' :
                                        ficha.paciente.prevision === 'fonasa_d' ? 'FONASA D' :
                                        ficha.paciente.prevision === 'isapre' ? 'ISAPRE' :
                                        ficha.paciente.prevision === 'particular' ? 'Particular' :
                                        ficha.paciente.prevision === 'otro' ? 'Otro' :
                                        ficha.paciente.prevision
                                      : <span className="text-amber-400">Sin registrar</span>
                                    }
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500 uppercase">Acompañante</p>
                                  {ficha.paciente?.acompanante_nombre ? (
                                    <div>
                                      <p className="text-sm text-white flex items-center gap-1">
                                        <UserPlus className="w-3 h-3 text-slate-400" />
                                        {ficha.paciente.acompanante_nombre}
                                      </p>
                                      {ficha.paciente.acompanante_telefono && (
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                          <Phone className="w-3 h-3" />
                                          {ficha.paciente.acompanante_telefono}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-amber-400">Sin registrar</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Formulario de signos vitales */}
                      {fichaEditando === ficha.id && (
                        <div className="p-4 bg-blue-500/5 border-t border-blue-500/30">
                          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-400" />
                            Nueva Medición de Signos Vitales
                          </h4>
                          
                          {error && (
                            <Alert className="mb-4 bg-red-500/10 border-red-500/30 text-red-400">
                              <AlertTriangle className="w-4 h-4" />
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {/* Presión Sistólica */}
                            <div className="space-y-1">
                              <Label className="text-slate-300 text-xs flex items-center justify-between">
                                <span>P. Sistólica (mmHg)</span>
                                <span className="text-slate-500 text-[10px]">40-300</span>
                              </Label>
                              <Input
                                type="number"
                                placeholder="120"
                                value={nuevosSignos.presionSistolica}
                                onChange={(e) => handleSignoChange('presionSistolica', e.target.value)}
                                className={`bg-slate-800 border-slate-700 text-white ${
                                  erroresValidacion.presionSistolica ? 'border-red-500 bg-red-500/10' : ''
                                }`}
                              />
                              {erroresValidacion.presionSistolica && (
                                <p className="text-xs text-red-400">{erroresValidacion.presionSistolica}</p>
                              )}
                            </div>
                            
                            {/* Presión Diastólica */}
                            <div className="space-y-1">
                              <Label className="text-slate-300 text-xs flex items-center justify-between">
                                <span>P. Diastólica (mmHg)</span>
                                <span className="text-slate-500 text-[10px]">20-200</span>
                              </Label>
                              <Input
                                type="number"
                                placeholder="80"
                                value={nuevosSignos.presionDiastolica}
                                onChange={(e) => handleSignoChange('presionDiastolica', e.target.value)}
                                className={`bg-slate-800 border-slate-700 text-white ${
                                  erroresValidacion.presionDiastolica ? 'border-red-500 bg-red-500/10' : ''
                                }`}
                              />
                              {erroresValidacion.presionDiastolica && (
                                <p className="text-xs text-red-400">{erroresValidacion.presionDiastolica}</p>
                              )}
                            </div>
                            
                            {/* Frecuencia Cardiaca */}
                            <div className="space-y-1">
                              <Label className="text-slate-300 text-xs flex items-center justify-between">
                                <span>FC (lpm)</span>
                                <span className="text-slate-500 text-[10px]">20-250</span>
                              </Label>
                              <Input
                                type="number"
                                placeholder="75"
                                value={nuevosSignos.frecuenciaCardiaca}
                                onChange={(e) => handleSignoChange('frecuenciaCardiaca', e.target.value)}
                                className={`bg-slate-800 border-slate-700 text-white ${
                                  erroresValidacion.frecuenciaCardiaca ? 'border-red-500 bg-red-500/10' : ''
                                }`}
                              />
                              {erroresValidacion.frecuenciaCardiaca && (
                                <p className="text-xs text-red-400">{erroresValidacion.frecuenciaCardiaca}</p>
                              )}
                            </div>
                            
                            {/* Frecuencia Respiratoria */}
                            <div className="space-y-1">
                              <Label className="text-slate-300 text-xs flex items-center justify-between">
                                <span>FR (rpm)</span>
                                <span className="text-slate-500 text-[10px]">4-60</span>
                              </Label>
                              <Input
                                type="number"
                                placeholder="16"
                                value={nuevosSignos.frecuenciaRespiratoria}
                                onChange={(e) => handleSignoChange('frecuenciaRespiratoria', e.target.value)}
                                className={`bg-slate-800 border-slate-700 text-white ${
                                  erroresValidacion.frecuenciaRespiratoria ? 'border-red-500 bg-red-500/10' : ''
                                }`}
                              />
                              {erroresValidacion.frecuenciaRespiratoria && (
                                <p className="text-xs text-red-400">{erroresValidacion.frecuenciaRespiratoria}</p>
                              )}
                            </div>
                            
                            {/* Saturación O2 */}
                            <div className="space-y-1">
                              <Label className="text-slate-300 text-xs flex items-center justify-between">
                                <span>SatO₂ (%)</span>
                                <span className="text-slate-500 text-[10px]">50-100</span>
                              </Label>
                              <Input
                                type="number"
                                placeholder="98"
                                value={nuevosSignos.saturacionO2}
                                onChange={(e) => handleSignoChange('saturacionO2', e.target.value)}
                                className={`bg-slate-800 border-slate-700 text-white ${
                                  erroresValidacion.saturacionO2 ? 'border-red-500 bg-red-500/10' : ''
                                }`}
                              />
                              {erroresValidacion.saturacionO2 && (
                                <p className="text-xs text-red-400">{erroresValidacion.saturacionO2}</p>
                              )}
                            </div>
                            
                            {/* Temperatura */}
                            <div className="space-y-1">
                              <Label className="text-slate-300 text-xs flex items-center justify-between">
                                <span>Temp (°C)</span>
                                <span className="text-slate-500 text-[10px]">30-45</span>
                              </Label>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="36.5"
                                value={nuevosSignos.temperatura}
                                onChange={(e) => handleSignoChange('temperatura', e.target.value)}
                                className={`bg-slate-800 border-slate-700 text-white ${
                                  erroresValidacion.temperatura ? 'border-red-500 bg-red-500/10' : ''
                                }`}
                              />
                              {erroresValidacion.temperatura && (
                                <p className="text-xs text-red-400">{erroresValidacion.temperatura}</p>
                              )}
                            </div>
                            
                            {/* Glucosa */}
                            <div className="space-y-1">
                              <Label className="text-slate-300 text-xs flex items-center justify-between">
                                <span>Glucosa (mg/dL)</span>
                                <span className="text-slate-500 text-[10px]">20-600</span>
                              </Label>
                              <Input
                                type="number"
                                placeholder="90"
                                value={nuevosSignos.glucosa}
                                onChange={(e) => handleSignoChange('glucosa', e.target.value)}
                                className={`bg-slate-800 border-slate-700 text-white ${
                                  erroresValidacion.glucosa ? 'border-red-500 bg-red-500/10' : ''
                                }`}
                              />
                              {erroresValidacion.glucosa && (
                                <p className="text-xs text-red-400">{erroresValidacion.glucosa}</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Escala de Glasgow - Con botones como paramédico */}
                          <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="font-semibold text-white flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-400" />
                                Escala de Glasgow
                              </h5>
                              <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${
                                  (parseInt(nuevosSignos.glasgowOcular || '0') + parseInt(nuevosSignos.glasgowVerbal || '0') + parseInt(nuevosSignos.glasgowMotor || '0')) >= 13 ? 'text-emerald-400' :
                                  (parseInt(nuevosSignos.glasgowOcular || '0') + parseInt(nuevosSignos.glasgowVerbal || '0') + parseInt(nuevosSignos.glasgowMotor || '0')) >= 9 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {(nuevosSignos.glasgowOcular && nuevosSignos.glasgowVerbal && nuevosSignos.glasgowMotor) 
                                    ? parseInt(nuevosSignos.glasgowOcular) + parseInt(nuevosSignos.glasgowVerbal) + parseInt(nuevosSignos.glasgowMotor) 
                                    : '--'}
                                </span>
                                <span className="text-slate-400">/15</span>
                                {(nuevosSignos.glasgowOcular && nuevosSignos.glasgowVerbal && nuevosSignos.glasgowMotor) && (
                                  <Badge className={`ml-2 ${
                                    (parseInt(nuevosSignos.glasgowOcular) + parseInt(nuevosSignos.glasgowVerbal) + parseInt(nuevosSignos.glasgowMotor)) >= 13 ? 'bg-emerald-500/30 text-emerald-300' :
                                    (parseInt(nuevosSignos.glasgowOcular) + parseInt(nuevosSignos.glasgowVerbal) + parseInt(nuevosSignos.glasgowMotor)) >= 9 ? 'bg-amber-500/30 text-amber-300' : 'bg-red-500/30 text-red-300'
                                  }`}>
                                    {(parseInt(nuevosSignos.glasgowOcular) + parseInt(nuevosSignos.glasgowVerbal) + parseInt(nuevosSignos.glasgowMotor)) >= 13 ? 'Leve' :
                                     (parseInt(nuevosSignos.glasgowOcular) + parseInt(nuevosSignos.glasgowVerbal) + parseInt(nuevosSignos.glasgowMotor)) >= 9 ? 'Moderado' : 'Severo'}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Apertura Ocular */}
                            <div className="space-y-2 mb-4">
                              <Label className="text-slate-300 flex items-center gap-2">
                                Apertura Ocular (O)
                              </Label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {[
                                  { value: '4', label: 'Espontánea', desc: 'Abre los ojos sin estímulo' },
                                  { value: '3', label: 'Al hablarle', desc: 'Abre al estímulo verbal' },
                                  { value: '2', label: 'Al dolor', desc: 'Abre al estímulo doloroso' },
                                  { value: '1', label: 'Ninguna', desc: 'No abre los ojos' },
                                ].map((op) => (
                                  <button
                                    key={op.value}
                                    type="button"
                                    onClick={() => setNuevosSignos({...nuevosSignos, glasgowOcular: op.value})}
                                    className={`p-2 rounded-lg text-left transition-all border ${
                                      nuevosSignos.glasgowOcular === op.value
                                        ? 'bg-purple-600 border-purple-400 text-white'
                                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">{op.label}</span>
                                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">{op.value}</span>
                                    </div>
                                    <p className="text-xs opacity-70 mt-1">{op.desc}</p>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Respuesta Verbal */}
                            <div className="space-y-2 mb-4">
                              <Label className="text-slate-300 flex items-center gap-2">
                                Respuesta Verbal (V)
                              </Label>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                {[
                                  { value: '5', label: 'Orientada', desc: 'Conversación coherente' },
                                  { value: '4', label: 'Confusa', desc: 'Desorientado' },
                                  { value: '3', label: 'Inapropiada', desc: 'Palabras incoherentes' },
                                  { value: '2', label: 'Sonidos', desc: 'Incomprensibles' },
                                  { value: '1', label: 'Ninguna', desc: 'Sin respuesta' },
                                ].map((op) => (
                                  <button
                                    key={op.value}
                                    type="button"
                                    onClick={() => setNuevosSignos({...nuevosSignos, glasgowVerbal: op.value})}
                                    className={`p-2 rounded-lg text-left transition-all border ${
                                      nuevosSignos.glasgowVerbal === op.value
                                        ? 'bg-purple-600 border-purple-400 text-white'
                                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">{op.label}</span>
                                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">{op.value}</span>
                                    </div>
                                    <p className="text-xs opacity-70 mt-1">{op.desc}</p>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Respuesta Motora */}
                            <div className="space-y-2">
                              <Label className="text-slate-300 flex items-center gap-2">
                                Respuesta Motora (M)
                              </Label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {[
                                  { value: '6', label: 'Obedece', desc: 'Obedece órdenes' },
                                  { value: '5', label: 'Localiza', desc: 'Localiza el dolor' },
                                  { value: '4', label: 'Retira', desc: 'Retira al dolor' },
                                  { value: '3', label: 'Flexión', desc: 'Flexión anormal' },
                                  { value: '2', label: 'Extensión', desc: 'Extensión anormal' },
                                  { value: '1', label: 'Ninguna', desc: 'Sin respuesta' },
                                ].map((op) => (
                                  <button
                                    key={op.value}
                                    type="button"
                                    onClick={() => setNuevosSignos({...nuevosSignos, glasgowMotor: op.value})}
                                    className={`p-2 rounded-lg text-left transition-all border ${
                                      nuevosSignos.glasgowMotor === op.value
                                        ? 'bg-purple-600 border-purple-400 text-white'
                                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">{op.label}</span>
                                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">{op.value}</span>
                                    </div>
                                    <p className="text-xs opacity-70 mt-1">{op.desc}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Escala EVA - Con botones como paramédico */}
                          <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-slate-300 font-semibold flex items-center gap-2">
                                <span className="text-lg">😣</span> Escala EVA - Dolor
                              </Label>
                              {nuevosSignos.eva && (
                                <Badge className={`${
                                  parseInt(nuevosSignos.eva) <= 3 ? 'bg-emerald-500/30 text-emerald-300' :
                                  parseInt(nuevosSignos.eva) <= 6 ? 'bg-amber-500/30 text-amber-300' :
                                  'bg-red-500/30 text-red-300'
                                }`}>
                                  {nuevosSignos.eva}/10 - {
                                    parseInt(nuevosSignos.eva) === 0 ? 'Sin dolor' :
                                    parseInt(nuevosSignos.eva) <= 3 ? 'Dolor leve' :
                                    parseInt(nuevosSignos.eva) <= 6 ? 'Dolor moderado' :
                                    parseInt(nuevosSignos.eva) <= 9 ? 'Dolor severo' : 'Insoportable'
                                  }
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-emerald-400 font-medium">0</span>
                              <div className="flex-1 grid grid-cols-11 gap-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => setNuevosSignos({...nuevosSignos, eva: v.toString()})}
                                    className={`h-12 rounded-lg font-bold transition-all border-2 ${
                                      nuevosSignos.eva === v.toString()
                                        ? `${v <= 3 ? 'bg-emerald-500' : v <= 6 ? 'bg-amber-500' : 'bg-red-500'} border-white scale-110 shadow-lg text-white`
                                        : `${v <= 3 ? 'bg-emerald-500' : v <= 6 ? 'bg-amber-500' : 'bg-red-500'} opacity-40 border-transparent hover:opacity-70 text-white`
                                    }`}
                                  >
                                    {v}
                                  </button>
                                ))}
                              </div>
                              <span className="text-sm text-red-400 font-medium">10</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-4">
                            <Button 
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleGuardarSignosVitales(ficha.id)}
                              disabled={loading || Object.keys(erroresValidacion).length > 0}
                            >
                              {loading ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Guardando...
                                </>
                              ) : (
                                <>
                                  <Activity className="w-4 h-4 mr-2" />
                                  Guardar Signos Vitales
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setFichaEditando(null)
                                setNuevosSignos({
                                  presionSistolica: "", presionDiastolica: "", frecuenciaCardiaca: "",
                                  frecuenciaRespiratoria: "", saturacionO2: "", temperatura: "",
                                  glucosa: "", glasgowOcular: "", glasgowVerbal: "", glasgowMotor: "", eva: ""
                                })
                                setErroresValidacion({})
                                setError("")
                              }}
                              className="border-slate-700 text-slate-300"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Exámenes */}
          <TabsContent value="examenes" className="space-y-6">
            {/* Header de exámenes */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-purple-500/10 border border-purple-500/30 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <FlaskConical className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Gestión de Exámenes</p>
                  <p className="text-sm text-slate-400">
                    {examenesPendientes.length} pendiente(s) • {examenesEnProceso.length} en proceso
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                onClick={cargarExamenes}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>

            {(examenesPendientes.length === 0 && examenesEnProceso.length === 0) ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <FlaskConical className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin exámenes pendientes</h3>
                  <p className="text-slate-400">Los exámenes solicitados por los médicos aparecerán aquí</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Exámenes Pendientes */}
                {examenesPendientes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      Pendientes ({examenesPendientes.length})
                    </h3>
                    <div className="grid gap-3">
                      {examenesPendientes.map((examen) => (
                        <Card key={examen.id} className="border-slate-800 bg-slate-900/50 hover:border-yellow-500/50 transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-white">{examen.tipo_examen}</span>
                                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                    Pendiente
                                  </Badge>
                                  {examen.prioridad === 'urgente' && (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                      Urgente
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-400 mb-2">
                                  Paciente: <span className="text-white">
                                    {examen.ficha?.paciente?.nombres || 'NN'} {examen.ficha?.paciente?.apellidos || examen.ficha?.paciente?.id_temporal || ''}
                                  </span>
                                </p>
                                <p className="text-sm text-slate-400 mb-1">
                                  {examen.descripcion || examen.examenes_especificos || 'Sin descripción'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Solicitado: {new Date(examen.fecha_solicitud).toLocaleString('es-CL')}
                                  {examen.medico_nombre && ` • Dr. ${examen.medico_nombre}`}
                                </p>
                              </div>
                              <Button
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => handleIniciarExamen(examen)}
                                disabled={guardandoExamen}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Iniciar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exámenes En Proceso */}
                {examenesEnProceso.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-blue-400" />
                      En Proceso ({examenesEnProceso.length})
                    </h3>
                    <div className="grid gap-3">
                      {examenesEnProceso.map((examen) => (
                        <Card key={examen.id} className="border-slate-800 bg-slate-900/50 hover:border-blue-500/50 transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-white">{examen.tipo_examen}</span>
                                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    En Proceso
                                  </Badge>
                                  {examen.prioridad === 'urgente' && (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                      Urgente
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-400 mb-2">
                                  Paciente: <span className="text-white">
                                    {examen.ficha?.paciente?.nombres || 'NN'} {examen.ficha?.paciente?.apellidos || examen.ficha?.paciente?.id_temporal || ''}
                                  </span>
                                </p>
                                <p className="text-sm text-slate-400 mb-1">
                                  {examen.descripcion || examen.examenes_especificos || 'Sin descripción'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Solicitado: {new Date(examen.fecha_solicitud).toLocaleString('es-CL')}
                                </p>
                              </div>
                              <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleAbrirResultados(examen)}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Completar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <ModalBuscarPaciente 
        open={modalBuscarOpen} 
        onOpenChange={setModalBuscarOpen} 
      />

      {/* Modal Asignación de Camas - MEJORADO */}
      <Dialog open={modalCamasOpen} onOpenChange={setModalCamasOpen}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Bed className="w-5 h-5 text-teal-400" />
              Asignar Ubicación - {fichaParaCama && (fichaParaCama.paciente.es_nn 
                ? `NN - ${fichaParaCama.paciente.id_temporal || 'Sin ID'}`
                : `${fichaParaCama.paciente.nombres} ${fichaParaCama.paciente.apellidos}`)}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Seleccione un box, cama o sala disponible para el paciente
            </DialogDescription>
          </DialogHeader>

          {/* Filtro por tipo */}
          <div className="mb-4">
            <Label className="text-slate-300 mb-2 block">Filtrar por tipo</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Todos', icon: '' },
                { value: 'box', label: 'Box Atención', icon: '' },
                { value: 'camilla', label: 'Camilla', icon: '' },
                { value: 'cama_general', label: 'Cama General', icon: '' },
                { value: 'cama_uci', label: 'Cama UCI', icon: '' },
                { value: 'sala_emergencia', label: 'Sala Emergencia', icon: '' },
              ].map((tipo) => (
                <Button
                  key={tipo.value}
                  size="sm"
                  variant={tipoCamaFiltro === tipo.value ? "default" : "outline"}
                  className={tipoCamaFiltro === tipo.value 
                    ? "bg-teal-600 hover:bg-teal-700" 
                    : "border-slate-600 text-slate-300 hover:bg-slate-800"
                  }
                  onClick={async () => {
                    setTipoCamaFiltro(tipo.value)
                    await cargarCamasDisponibles(tipo.value !== 'all' ? tipo.value : undefined)
                  }}
                >
                  {tipo.icon} {tipo.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Lista de camas disponibles */}
          <div className="max-h-96 overflow-y-auto">
            {camasDisponibles.length === 0 ? (
              <div className="text-center py-8 bg-slate-800/50 rounded-lg">
                <Bed className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No hay ubicaciones disponibles del tipo seleccionado</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {camasDisponibles.map((cama: any) => (
                  <Card
                    key={cama.id}
                    className="border-2 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer transition-all hover:scale-[1.02]"
                    onClick={() => handleAsignarCama(cama.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-white">{cama.numero}</span>
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <Badge className={`mb-2 ${
                        cama.tipo === 'box' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        cama.tipo === 'camilla' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                        cama.tipo === 'cama_uci' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        cama.tipo === 'sala_emergencia' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                        'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}>
                        {cama.tipo_display || cama.tipo}
                      </Badge>
                      <div className="text-xs text-slate-400 space-y-0.5">
                        {cama.sala && <p>Sala: {cama.sala}</p>}
                        {cama.piso && <p>Piso {cama.piso}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button variant="outline" className="border-slate-600" onClick={() => setModalCamasOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Asignación de Médico */}
      <Dialog open={modalMedicosOpen} onOpenChange={setModalMedicosOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-400" />
              Asignar Médico - {fichaParaMedico && (fichaParaMedico.paciente.es_nn 
                ? `NN - ${fichaParaMedico.paciente.id_temporal || 'Sin ID'}`
                : `${fichaParaMedico.paciente.nombres} ${fichaParaMedico.paciente.apellidos}`)}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Seleccione el médico que atenderá al paciente
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {medicosDisponibles.length === 0 ? (
              <div className="text-center py-8 bg-slate-800/50 rounded-lg">
                <Stethoscope className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No hay médicos disponibles</p>
              </div>
            ) : (
              medicosDisponibles.map((medico: any) => (
                <Card
                  key={medico.id}
                  className="border-slate-700 bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
                  onClick={() => handleAsignarMedico(medico.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{medico.nombre}</p>
                          <p className="text-sm text-slate-400">{medico.especialidad || 'Medicina General'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${
                          medico.pacientes_asignados === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                          medico.pacientes_asignados < 3 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {medico.pacientes_asignados} pacientes
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button variant="outline" className="border-slate-600" onClick={() => setModalMedicosOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Chat Pantalla Completa - solo visible cuando hay una ficha seleccionada */}
      {fichaParaChat && user && (
        <ChatPanel
          fichaId={fichaParaChat}
          usuarioActual={{
            id: user.id,
            username: user.username,
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            rol: user.rol as "tens",
          }}
          fullScreen={true}
          onClose={() => setFichaParaChat(null)}
          pacienteNombre={
            [...fichasEnRuta, ...fichasEnHospital].find(f => f.id === fichaParaChat)?.paciente?.nombres ||
            `Ficha #${fichaParaChat}`
          }
        />
      )}

      {/* Modal Editar Datos del Paciente */}
      <Dialog open={modalEditarPaciente} onOpenChange={setModalEditarPaciente}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Datos Administrativos del Paciente
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {pacienteEditando?.es_nn 
                ? `Paciente NN (${pacienteEditando.id_temporal || 'Sin ID'})`
                : `${pacienteEditando?.nombres || ''} ${pacienteEditando?.apellidos || ''}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Previsión */}
            <div className="space-y-2">
              <Label htmlFor="prevision" className="text-slate-300">
                Previsión de Salud
              </Label>
              <Select
                value={datosEdicion.prevision}
                onValueChange={(value) => setDatosEdicion(prev => ({ ...prev, prevision: value }))}
              >
                <SelectTrigger className="bg-slate-800 text-white border-slate-700">
                  <SelectValue placeholder="Seleccionar previsión..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="fonasa_a" className="text-white">FONASA A</SelectItem>
                  <SelectItem value="fonasa_b" className="text-white">FONASA B</SelectItem>
                  <SelectItem value="fonasa_c" className="text-white">FONASA C</SelectItem>
                  <SelectItem value="fonasa_d" className="text-white">FONASA D</SelectItem>
                  <SelectItem value="isapre" className="text-white">ISAPRE</SelectItem>
                  <SelectItem value="particular" className="text-white">Particular</SelectItem>
                  <SelectItem value="otro" className="text-white">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Acompañante */}
            <div className="space-y-2">
              <Label htmlFor="acompanante_nombre" className="text-slate-300 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-slate-400" />
                Nombre del Acompañante
              </Label>
              <Input
                id="acompanante_nombre"
                placeholder="Ej: María González"
                value={datosEdicion.acompanante_nombre}
                onChange={(e) => setDatosEdicion(prev => ({ ...prev, acompanante_nombre: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acompanante_telefono" className="text-slate-300 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                Teléfono del Acompañante
              </Label>
              <Input
                id="acompanante_telefono"
                placeholder="Ej: +56 9 1234 5678"
                value={datosEdicion.acompanante_telefono}
                onChange={(e) => setDatosEdicion(prev => ({ ...prev, acompanante_telefono: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              onClick={() => setModalEditarPaciente(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGuardarDatosPaciente}
              disabled={guardandoPaciente}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {guardandoPaciente ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Resultados de Examen */}
      <Dialog open={modalResultadosOpen} onOpenChange={setModalResultadosOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-green-400" />
              Completar Examen
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {examenSeleccionado && (
                <span>
                  {examenSeleccionado.tipo_examen} - 
                  Paciente: <strong className="text-white">
                    {examenSeleccionado.ficha?.paciente?.nombres || 'NN'} {examenSeleccionado.ficha?.paciente?.apellidos || ''}
                  </strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resultados" className="text-slate-300">
                Resultados del Examen
              </Label>
              <Textarea
                id="resultados"
                placeholder="Ingrese los resultados del examen...
Ejemplo:
- Hemoglobina: 14.5 g/dL
- Hematocrito: 42%
- Leucocitos: 7,500/mm³
- Plaquetas: 250,000/mm³"
                value={resultadosExamen}
                onChange={(e) => setResultadosExamen(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white min-h-[200px]"
              />
              <p className="text-xs text-slate-500">
                Ingrese todos los valores y observaciones relevantes del examen.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={() => {
                setModalResultadosOpen(false)
                setExamenSeleccionado(null)
                setResultadosExamen("")
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleGuardarResultados}
              disabled={!resultadosExamen.trim() || guardandoExamen}
            >
              {guardandoExamen ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar y Completar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Triage Hospitalario */}
      <Dialog open={modalTriageOpen} onOpenChange={setModalTriageOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-400" />
              {fichaParaTriage?.triage ? 'Editar Triage' : 'Triage Hospitalario'} - Escala ESI
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {fichaParaTriage && (
                <span>
                  Paciente: <strong className="text-white">
                    {fichaParaTriage.paciente?.nombres || 'NN'} {fichaParaTriage.paciente?.apellidos || ''}
                  </strong>
                  {" - "}{fichaParaTriage.motivo_consulta}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Clasificación ESI - Lo más importante */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <h4 className="font-semibold text-purple-300 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Clasificación de Urgencia (ESI)
              </h4>
              
              <div className="grid grid-cols-5 gap-2">
                {[
                  { nivel: "1", label: "ESI 1", desc: "Resucitación", tiempo: "Inmediato", color: "bg-red-500" },
                  { nivel: "2", label: "ESI 2", desc: "Emergencia", tiempo: "< 10 min", color: "bg-orange-500" },
                  { nivel: "3", label: "ESI 3", desc: "Urgencia", tiempo: "< 30 min", color: "bg-yellow-500" },
                  { nivel: "4", label: "ESI 4", desc: "Menos urgente", tiempo: "< 60 min", color: "bg-green-500" },
                  { nivel: "5", label: "ESI 5", desc: "No urgente", tiempo: "< 120 min", color: "bg-blue-500" },
                ].map((item) => (
                  <button
                    key={item.nivel}
                    type="button"
                    onClick={() => setDatosTriage(prev => ({ ...prev, nivel_esi: item.nivel }))}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      datosTriage.nivel_esi === item.nivel
                        ? `${item.color} border-white text-white`
                        : `bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-300`
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${item.color} mx-auto mb-2`} />
                    <p className="font-bold text-sm">{item.label}</p>
                    <p className="text-[10px] opacity-80">{item.desc}</p>
                    <p className="text-[10px] opacity-60">{item.tiempo}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo y tiempo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Motivo de consulta (según paciente)</Label>
                <Textarea
                  value={datosTriage.motivo_consulta_triage}
                  onChange={(e) => setDatosTriage(prev => ({ ...prev, motivo_consulta_triage: e.target.value }))}
                  placeholder="Describir motivo según el paciente/acompañante..."
                  className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Tiempo de inicio de síntomas</Label>
                <Input
                  value={datosTriage.tiempo_inicio_sintomas}
                  onChange={(e) => setDatosTriage(prev => ({ ...prev, tiempo_inicio_sintomas: e.target.value }))}
                  placeholder="Ej: 2 horas, 3 días, súbito..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Evaluación ABC */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <h4 className="font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Evaluación Inicial Rápida (ABC)
              </h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">Vía Aérea</Label>
                  <Select
                    value={datosTriage.via_aerea}
                    onValueChange={(value) => setDatosTriage(prev => ({ ...prev, via_aerea: value }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="permeable" className="text-white">Permeable</SelectItem>
                      <SelectItem value="comprometida" className="text-white">Comprometida</SelectItem>
                      <SelectItem value="obstruida" className="text-white">Obstruida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">Respiración</Label>
                  <Select
                    value={datosTriage.respiracion_normal ? "normal" : "anormal"}
                    onValueChange={(value) => setDatosTriage(prev => ({ ...prev, respiracion_normal: value === "normal" }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="normal" className="text-white">Normal</SelectItem>
                      <SelectItem value="anormal" className="text-white">Anormal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">Circulación</Label>
                  <Select
                    value={datosTriage.circulacion_normal ? "normal" : "anormal"}
                    onValueChange={(value) => setDatosTriage(prev => ({ ...prev, circulacion_normal: value === "normal" }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="normal" className="text-white">Normal</SelectItem>
                      <SelectItem value="anormal" className="text-white">Anormal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-slate-400 text-sm">Estado de Consciencia (AVDN)</Label>
                <Select
                  value={datosTriage.estado_consciencia}
                  onValueChange={(value) => setDatosTriage(prev => ({ ...prev, estado_consciencia: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Alerta" className="text-white">A - Alerta</SelectItem>
                    <SelectItem value="Responde a voz" className="text-white">V - Responde a voz</SelectItem>
                    <SelectItem value="Responde a dolor" className="text-white">D - Responde a dolor</SelectItem>
                    <SelectItem value="No responde" className="text-white">N - No responde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Evaluación del dolor */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <h4 className="font-semibold text-slate-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Evaluación del Dolor
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={datosTriage.dolor_presente}
                    onChange={(e) => setDatosTriage(prev => ({ ...prev, dolor_presente: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800"
                  />
                  <span className="text-slate-300">Presenta dolor</span>
                </label>
              </div>

              {datosTriage.dolor_presente && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-sm">Escala de Dolor (EVA 0-10)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={datosTriage.escala_dolor}
                      onChange={(e) => setDatosTriage(prev => ({ ...prev, escala_dolor: e.target.value }))}
                      placeholder="0-10"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-sm">Localización del dolor</Label>
                    <Input
                      value={datosTriage.localizacion_dolor}
                      onChange={(e) => setDatosTriage(prev => ({ ...prev, localizacion_dolor: e.target.value }))}
                      placeholder="Ej: abdominal, torácico, cefalea..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Signos de alarma */}
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h4 className="font-semibold text-red-300 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Signos de Alarma
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: "fiebre_alta", label: "Fiebre alta (> 38.5°C)" },
                  { key: "dificultad_respiratoria", label: "Dificultad respiratoria" },
                  { key: "dolor_toracico", label: "Dolor torácico" },
                  { key: "alteracion_neurologica", label: "Alteración neurológica" },
                  { key: "sangrado_activo", label: "Sangrado activo" },
                  { key: "trauma_mayor", label: "Trauma mayor" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-800/50">
                    <input
                      type="checkbox"
                      checked={datosTriage[item.key as keyof typeof datosTriage] as boolean}
                      onChange={(e) => setDatosTriage(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-red-600 bg-slate-800 text-red-500"
                    />
                    <span className="text-slate-300 text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Recursos y observaciones */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Recursos estimados (ESI 3-5)</Label>
                <Select
                  value={datosTriage.recursos_necesarios}
                  onValueChange={(value) => setDatosTriage(prev => ({ ...prev, recursos_necesarios: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="0" className="text-white">0 recursos</SelectItem>
                    <SelectItem value="1" className="text-white">1 recurso</SelectItem>
                    <SelectItem value="2" className="text-white">2+ recursos</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500">
                  Recursos: exámenes, procedimientos, administración IV, etc.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Observaciones adicionales</Label>
                <Textarea
                  value={datosTriage.observaciones}
                  onChange={(e) => setDatosTriage(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Observaciones relevantes..."
                  className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end border-t border-slate-700 pt-4">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={() => {
                setModalTriageOpen(false)
                setFichaParaTriage(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              className={`${datosTriage.nivel_esi ? getColorESI(datosTriage.nivel_esi) : 'bg-purple-600'} hover:opacity-90 text-white`}
              onClick={handleGuardarTriage}
              disabled={!datosTriage.nivel_esi || guardandoTriage}
            >
              {guardandoTriage ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {fichaParaTriage?.triage ? 'Actualizar Triage' : 'Completar Triage'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Historial del Paciente */}
      <Dialog open={modalHistorialOpen} onOpenChange={setModalHistorialOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] bg-slate-900 border-slate-800 overflow-hidden flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              Historial del Paciente
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {historialPaciente?.paciente ? (
                <>
                  {historialPaciente.paciente.es_nn 
                    ? `Paciente NN - ${historialPaciente.paciente.id_temporal}`
                    : `${historialPaciente.paciente.nombres} ${historialPaciente.paciente.apellidos}`
                  } - RUT: {historialPaciente.paciente.rut || 'N/A'}
                </>
              ) : 'Cargando...'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            {historialPaciente?.fichas?.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-slate-400 mb-2">
                  Total de atenciones: <span className="text-white font-medium">{historialPaciente.total_atenciones}</span>
                </div>
                {historialPaciente.fichas.map((ficha: any, index: number) => (
                  <div 
                    key={ficha.id} 
                    className={`p-4 rounded-xl border ${index === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <Badge className="bg-amber-500 text-white text-xs">Actual</Badge>
                        )}
                        <Badge variant="outline" className={`
                          ${ficha.prioridad === 'C1' ? 'border-red-500 text-red-400' :
                            ficha.prioridad === 'C2' ? 'border-orange-500 text-orange-400' :
                            ficha.prioridad === 'C3' ? 'border-yellow-500 text-yellow-400' :
                            ficha.prioridad === 'C4' ? 'border-green-500 text-green-400' :
                            'border-blue-500 text-blue-400'}
                        `}>
                          {ficha.prioridad}
                        </Badge>
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          {ficha.estado?.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-sm text-slate-400">
                        {new Date(ficha.fecha_registro).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    <p className="text-white font-medium mb-2">
                      {ficha.motivo_consulta}
                    </p>
                    
                    {ficha.diagnostico && (
                      <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                        <p className="text-sm text-emerald-400 font-medium mb-1">Diagnóstico:</p>
                        <p className="text-sm text-slate-300">{ficha.diagnostico.descripcion}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          CIE-10: {ficha.diagnostico.diagnostico_cie10} | 
                          Alta: {ficha.diagnostico.tipo_alta?.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                    
                    {ficha.signos_vitales?.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                        {ficha.signos_vitales[ficha.signos_vitales.length - 1]?.presion_sistolica && (
                          <div className="p-2 bg-slate-800 rounded text-center">
                            <span className="text-slate-400">PA</span>
                            <p className="text-white font-medium">
                              {ficha.signos_vitales[ficha.signos_vitales.length - 1].presion_sistolica}/
                              {ficha.signos_vitales[ficha.signos_vitales.length - 1].presion_diastolica}
                            </p>
                          </div>
                        )}
                        {ficha.signos_vitales[ficha.signos_vitales.length - 1]?.frecuencia_cardiaca && (
                          <div className="p-2 bg-slate-800 rounded text-center">
                            <span className="text-slate-400">FC</span>
                            <p className="text-white font-medium">
                              {ficha.signos_vitales[ficha.signos_vitales.length - 1].frecuencia_cardiaca}
                            </p>
                          </div>
                        )}
                        {ficha.signos_vitales[ficha.signos_vitales.length - 1]?.saturacion_o2 && (
                          <div className="p-2 bg-slate-800 rounded text-center">
                            <span className="text-slate-400">SpO2</span>
                            <p className="text-white font-medium">
                              {ficha.signos_vitales[ficha.signos_vitales.length - 1].saturacion_o2}%
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay registros anteriores para este paciente</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
            <Button variant="outline" onClick={() => setModalHistorialOpen(false)} className="border-slate-600">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
