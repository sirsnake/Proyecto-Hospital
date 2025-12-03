import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { getSession } from "@/lib/auth"
import { authAPI, pacientesAPI, fichasAPI, solicitudesMedicamentosAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChatPanel } from "@/components/chat-panel"
import { NotificationsPanel } from "@/components/notifications-panel"
import { ModalTurno } from "@/components/modal-turno"
import { useTurno } from "@/hooks/use-turno"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Activity,
  User,
  Heart,
  FileText,
  Pill,
  ChevronDown,
  ChevronUp,
  Check,
  Send,
  MessageCircle,
  Plus,
  Clock,
  MapPin,
  AlertTriangle,
  LogOut,
  Loader2,
  History,
  Building2,
  Stethoscope,
  ChevronRight,
  Thermometer,
  Wind,
  Droplets,
  UserCheck,
} from "lucide-react"

// Tipos
interface SignoVital {
  presion_sistolica?: number
  presion_diastolica?: number
  frecuencia_cardiaca?: number
  frecuencia_respiratoria?: number
  saturacion_o2?: number
  temperatura?: number
}

interface FichaActiva {
  id: number
  paciente_nombre: string
  prioridad: string
  estado: string
  created_at: string
  motivo_consulta?: string
  circunstancias?: string
  signos_vitales?: SignoVital[]
}

// Componente de Prioridad
function PrioridadSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const prioridades = [
    { id: "C1", label: "C1", color: "bg-red-600 hover:bg-red-700", desc: "Vital" },
    { id: "C2", label: "C2", color: "bg-orange-500 hover:bg-orange-600", desc: "Emergencia" },
    { id: "C3", label: "C3", color: "bg-yellow-500 hover:bg-yellow-600 text-black", desc: "Urgente" },
    { id: "C4", label: "C4", color: "bg-green-500 hover:bg-green-600", desc: "Menor" },
    { id: "C5", label: "C5", color: "bg-blue-500 hover:bg-blue-600", desc: "No urgente" },
  ]

  return (
    <div className="space-y-2">
      <Label className="text-slate-300 text-sm font-medium">Categorización de Urgencia *</Label>
      <div className="grid grid-cols-5 gap-2">
        {prioridades.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg transition-all border-2",
              value === p.id
                ? `${p.color} border-white shadow-lg scale-105`
                : `${p.color} opacity-50 border-transparent hover:opacity-80`
            )}
          >
            <span className="text-lg font-bold">{p.label}</span>
            <span className="text-xs">{p.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Componente Glasgow Desglosado
function GlasgowSelector({
  ocular,
  verbal,
  motor,
  onChange,
}: {
  ocular: number
  verbal: number
  motor: number
  onChange: (field: string, value: number) => void
}) {
  const total = ocular + verbal + motor

  const ocularOpciones = [
    { value: 4, label: "Espontánea", desc: "Abre los ojos sin estímulo" },
    { value: 3, label: "Al hablarle", desc: "Abre los ojos al estímulo verbal" },
    { value: 2, label: "Al dolor", desc: "Abre los ojos al estímulo doloroso" },
    { value: 1, label: "Ninguna", desc: "No abre los ojos" },
  ]

  const verbalOpciones = [
    { value: 5, label: "Orientada", desc: "Conversación coherente y orientada" },
    { value: 4, label: "Confusa", desc: "Conversación confusa, desorientado" },
    { value: 3, label: "Inapropiada", desc: "Palabras inapropiadas o incoherentes" },
    { value: 2, label: "Sonidos", desc: "Sonidos incomprensibles" },
    { value: 1, label: "Ninguna", desc: "Sin respuesta verbal" },
  ]

  const motorOpciones = [
    { value: 6, label: "Obedece", desc: "Obedece órdenes" },
    { value: 5, label: "Localiza", desc: "Localiza el dolor" },
    { value: 4, label: "Retira", desc: "Retira al dolor" },
    { value: 3, label: "Flexión", desc: "Flexión anormal (decorticación)" },
    { value: 2, label: "Extensión", desc: "Extensión anormal (descerebración)" },
    { value: 1, label: "Ninguna", desc: "Sin respuesta motora" },
  ]

  const getGlasgowColor = (total: number) => {
    if (total >= 13) return "text-green-400"
    if (total >= 9) return "text-yellow-400"
    return "text-red-400"
  }

  const getGlasgowDesc = (total: number) => {
    if (total >= 13) return "Leve"
    if (total >= 9) return "Moderado"
    if (total >= 3) return "Severo"
    return ""
  }

  return (
    <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          Escala de Glasgow
        </h4>
        <div className="flex items-center gap-2">
          <span className={cn("text-2xl font-bold", getGlasgowColor(total))}>{total}</span>
          <span className="text-slate-400">/15</span>
          <Badge variant="outline" className={cn("ml-2", getGlasgowColor(total))}>
            {getGlasgowDesc(total)}
          </Badge>
        </div>
      </div>

      {/* Apertura Ocular */}
      <div className="space-y-2">
        <Label className="text-slate-300 flex items-center gap-2">
          Apertura Ocular (O)
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ocularOpciones.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => onChange("ocular", op.value)}
              className={cn(
                "p-2 rounded-lg text-left transition-all border",
                ocular === op.value
                  ? "bg-purple-600 border-purple-400 text-white"
                  : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{op.label}</span>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">{op.value}</span>
              </div>
              <p className="text-xs opacity-70 mt-1">{op.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Respuesta Verbal */}
      <div className="space-y-2">
        <Label className="text-slate-300 flex items-center gap-2">
          <span className="text-lg">💬</span> Respuesta Verbal (V)
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {verbalOpciones.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => onChange("verbal", op.value)}
              className={cn(
                "p-2 rounded-lg text-left transition-all border",
                verbal === op.value
                  ? "bg-purple-600 border-purple-400 text-white"
                  : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{op.label}</span>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">{op.value}</span>
              </div>
              <p className="text-xs opacity-70 mt-1 line-clamp-2">{op.desc}</p>
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
          {motorOpciones.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => onChange("motor", op.value)}
              className={cn(
                "p-2 rounded-lg text-left transition-all border",
                motor === op.value
                  ? "bg-purple-600 border-purple-400 text-white"
                  : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
              )}
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
  )
}

// Componente EVA (Escala Visual Analógica)
function EvaSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const getEvaColor = (v: number) => {
    if (v <= 3) return "bg-green-500"
    if (v <= 6) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getEvaLabel = (v: number) => {
    if (v === 0) return "Sin dolor"
    if (v <= 3) return "Dolor leve"
    if (v <= 6) return "Dolor moderado"
    if (v <= 9) return "Dolor severo"
    return "Dolor insoportable"
  }

  return (
    <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between">
        <Label className="text-slate-300 font-semibold flex items-center gap-2">
          Escala EVA - Dolor
        </Label>
        <Badge variant="outline" className={cn("text-white", getEvaColor(value))}>
          {value}/10 - {getEvaLabel(value)}
        </Badge>
      </div>
      
      <div className="flex items-center gap-1">
        <span className="text-sm text-emerald-400 font-medium">0</span>
        <div className="flex-1 grid grid-cols-11 gap-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={cn(
                "h-12 rounded-lg font-bold transition-all border-2",
                value === v
                  ? `${getEvaColor(v)} border-white scale-110 shadow-lg`
                  : `${getEvaColor(v)} opacity-40 border-transparent hover:opacity-70`
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <span className="text-sm text-red-400 font-medium">10</span>
      </div>
    </div>
  )
}

// Componente de Sección Colapsable
function SeccionColapsable({
  numero,
  titulo,
  icono: Icono,
  completado,
  abierto,
  onToggle,
  children,
}: {
  numero: number
  titulo: string
  icono: any
  completado: boolean
  abierto: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Collapsible open={abierto} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between p-4 rounded-lg transition-all",
            completado
              ? "bg-emerald-900/30 border border-emerald-600/50 hover:bg-emerald-900/40"
              : "bg-slate-800/50 border border-slate-700 hover:bg-slate-800"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                completado ? "bg-emerald-600" : "bg-slate-700"
              )}
            >
              {completado ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <span className="text-white font-bold">{numero}</span>
              )}
            </div>
            <Icono className={cn("w-5 h-5", completado ? "text-emerald-400" : "text-slate-400")} />
            <span className={cn("font-semibold", completado ? "text-emerald-400" : "text-white")}>
              {titulo}
            </span>
            {completado && (
              <Badge variant="outline" className="text-emerald-400 border-emerald-600 ml-2">
                Completado
              </Badge>
            )}
          </div>
          {abierto ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Componente Principal
function DashboardParamedicoPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Estado del formulario
  const [modo, setModo] = useState<"formulario" | "post-envio">("formulario")
  const [fichaEnviada, setFichaEnviada] = useState<FichaActiva | null>(null)
  const [fichasActivas, setFichasActivas] = useState<FichaActiva[]>([])
  
  // Historial de pacientes entregados
  const [fichasEntregadas, setFichasEntregadas] = useState<FichaActiva[]>([])
  const [vistaActiva, setVistaActiva] = useState<"formulario" | "historial">("formulario")
  const [fichasExpandidas, setFichasExpandidas] = useState<Set<number>>(new Set())
  const [fichaChatAbierto, setFichaChatAbierto] = useState<number | null>(null)

  // Toggle para expandir/contraer ficha en historial
  const toggleFichaExpandida = (fichaId: number) => {
    setFichasExpandidas(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fichaId)) {
        newSet.delete(fichaId)
      } else {
        newSet.add(fichaId)
      }
      return newSet
    })
  }

  // Secciones colapsables
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    identificacion: true,
    signos: false,
    evaluacion: false,
    medicamento: false,
  })

  // Estado para paciente NN
  const [esPacienteNN, setEsPacienteNN] = useState(false)

  // Estado para paciente existente (recurrente)
  const [pacienteExistente, setPacienteExistente] = useState<any>(null)
  const [buscandoPaciente, setBuscandoPaciente] = useState(false)
  const [historialPaciente, setHistorialPaciente] = useState<any[]>([])
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  // Datos del paciente
  const [pacienteData, setPacienteData] = useState({
    rut: "",
    nombres: "",
    apellidos: "",
    sexo: "",
    fecha_nacimiento: "",
    telefono: "",
    edad_aproximada: "",
    caracteristicas: "",
  })

  // Signos vitales
  const [signosData, setSignosData] = useState({
    presion_sistolica: "",
    presion_diastolica: "",
    frecuencia_cardiaca: "",
    frecuencia_respiratoria: "",
    saturacion_o2: "",
    temperatura: "",
    glucosa: "",
  })

  // Errores de validación en tiempo real
  const [erroresValidacion, setErroresValidacion] = useState<Record<string, string>>({})

  // Rangos de validación según el backend
  const RANGOS = {
    presion_sistolica: { min: 60, max: 250, label: "Presión sistólica", unidad: "mmHg" },
    presion_diastolica: { min: 40, max: 150, label: "Presión diastólica", unidad: "mmHg" },
    frecuencia_cardiaca: { min: 30, max: 220, label: "Frecuencia cardíaca", unidad: "lpm" },
    frecuencia_respiratoria: { min: 8, max: 60, label: "Frecuencia respiratoria", unidad: "rpm" },
    saturacion_o2: { min: 50, max: 100, label: "Saturación O₂", unidad: "%" },
    temperatura: { min: 32, max: 42, label: "Temperatura", unidad: "°C" },
    glucosa: { min: 20, max: 600, label: "Glucosa", unidad: "mg/dL" },
  }

  // Función de validación en tiempo real
  const validarCampo = (campo: string, valor: string) => {
    const rango = RANGOS[campo as keyof typeof RANGOS]
    if (!rango) return ""
    
    if (valor === "") return "" // Campo vacío no es error (se valida al enviar)
    
    const num = parseFloat(valor)
    if (isNaN(num)) return `${rango.label}: Ingrese un número válido`
    if (num < rango.min || num > rango.max) {
      return `${rango.label}: Debe estar entre ${rango.min} y ${rango.max} ${rango.unidad}`
    }
    return ""
  }

  // Manejador de cambio con validación
  const handleSignoChange = (campo: string, valor: string) => {
    setSignosData(prev => ({ ...prev, [campo]: valor }))
    const errorMsg = validarCampo(campo, valor)
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

  // Glasgow desglosado
  const [glasgow, setGlasgow] = useState({
    ocular: 4,
    verbal: 5,
    motor: 6,
  })

  // EVA
  const [eva, setEva] = useState(0)

  // Evaluación clínica
  const [evaluacionData, setEvaluacionData] = useState({
    prioridad: "",
    motivo_consulta: "",
    circunstancias: "",
  })

  // Medicamento (opcional)
  const [requiereMedicamento, setRequiereMedicamento] = useState(false)
  const [medicamentoData, setMedicamentoData] = useState({
    medicamento: "",
    dosis: "",
    justificacion: "",
  })

  // GPS y ETA
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null)
  const [eta, setEta] = useState("Calculando...")
  const [distancia, setDistancia] = useState<number | null>(null)

  // Coordenadas del Hospital
  const HOSPITAL_COORDS = { lat: -34.15462129250732, lng: -70.76652799358591 }

  // Función para buscar paciente por RUT
  const buscarPacientePorRut = async (rut: string) => {
    // Limpiar RUT de puntos y guiones para validación
    const rutLimpio = rut.replace(/[.-]/g, '')
    
    // Solo buscar si el RUT tiene al menos 7 caracteres
    if (rutLimpio.length < 7) {
      setPacienteExistente(null)
      setHistorialPaciente([])
      return
    }

    try {
      setBuscandoPaciente(true)
      const response = await pacientesAPI.buscar(rut)
      
      if (response && response.length > 0) {
        const paciente = response[0]
        setPacienteExistente(paciente)
        
        // Cargar historial de fichas del paciente
        try {
          const historial = await fichasAPI.listar({ paciente_id: paciente.id })
          const fichasHistorial = Array.isArray(historial) ? historial : (historial.results || [])
          setHistorialPaciente(fichasHistorial)
        } catch (e) {
          setHistorialPaciente([])
        }
        
        // Auto-llenar datos del paciente
        setPacienteData(prev => ({
          ...prev,
          nombres: paciente.nombres || '',
          apellidos: paciente.apellidos || '',
          sexo: paciente.sexo || '',
          fecha_nacimiento: paciente.fecha_nacimiento || '',
          telefono: paciente.telefono || '',
        }))
        
        toast({
          title: "Paciente encontrado",
          description: `${paciente.nombres} ${paciente.apellidos} ya está registrado. Datos cargados automáticamente.`,
        })
      } else {
        setPacienteExistente(null)
        setHistorialPaciente([])
      }
    } catch (error) {
      console.error('Error buscando paciente:', error)
      setPacienteExistente(null)
      setHistorialPaciente([])
    } finally {
      setBuscandoPaciente(false)
    }
  }

  // Verificar completitud de secciones
  const isIdentificacionCompleta = () => {
    if (esPacienteNN) {
      return pacienteData.sexo !== "" && pacienteData.edad_aproximada !== ""
    }
    return (
      pacienteData.rut.trim() !== "" &&
      pacienteData.nombres.trim() !== "" &&
      pacienteData.apellidos.trim() !== "" &&
      pacienteData.sexo !== ""
    )
  }

  const isSignosCompletos = () => {
    return (
      signosData.presion_sistolica !== "" &&
      signosData.frecuencia_cardiaca !== "" &&
      signosData.frecuencia_respiratoria !== "" &&
      signosData.saturacion_o2 !== "" &&
      signosData.temperatura !== ""
    )
  }

  const isEvaluacionCompleta = () => {
    return (
      evaluacionData.prioridad !== "" &&
      evaluacionData.motivo_consulta.trim() !== "" &&
      evaluacionData.circunstancias.trim() !== ""
    )
  }

  const isMedicamentoCompleto = () => {
    if (!requiereMedicamento) return true
    return (
      medicamentoData.medicamento.trim() !== "" &&
      medicamentoData.dosis.trim() !== "" &&
      medicamentoData.justificacion.trim() !== ""
    )
  }

  const isFormularioCompleto = () => {
    return isIdentificacionCompleta() && isSignosCompletos() && isEvaluacionCompleta() && isMedicamentoCompleto()
  }

  // Las secciones se manejan manualmente por el usuario

  // Obtener ubicación GPS
  const obtenerUbicacion = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude }
          setUbicacion(coords)
          
          // Calcular distancia con Haversine
          const R = 6371
          const dLat = ((HOSPITAL_COORDS.lat - coords.lat) * Math.PI) / 180
          const dLng = ((HOSPITAL_COORDS.lng - coords.lng) * Math.PI) / 180
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((coords.lat * Math.PI) / 180) *
              Math.cos((HOSPITAL_COORDS.lat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          const dist = R * c
          setDistancia(dist)

          const tiempoMinutos = Math.ceil((dist / 15) * 60)
          setEta(tiempoMinutos <= 60 ? `${tiempoMinutos} min` : `${Math.floor(tiempoMinutos / 60)}h ${tiempoMinutos % 60}min`)
        },
        () => setEta("GPS no disponible")
      )
    }
  }, [])

  // Cargar fichas activas y entregadas
  const cargarFichas = useCallback(async () => {
    if (!user) return
    try {
      const response = await fichasAPI.listar({ paramedico: user.id })
      const fichas = response.results || []
      
      // Mapear fichas con datos completos
      const mapearFicha = (f: any): FichaActiva => ({
        id: f.id,
        paciente_nombre: f.paciente 
          ? `${f.paciente.nombres || ''} ${f.paciente.apellidos || ''}`.trim() 
          : 'Paciente NN',
        prioridad: f.prioridad,
        estado: f.estado,
        created_at: f.fecha_registro || f.created_at,
        motivo_consulta: f.motivo_consulta,
        circunstancias: f.circunstancias,
        signos_vitales: f.signos_vitales,
      })
      
      // Fichas activas (en ruta o en espera)
      setFichasActivas(
        fichas
          .filter((f: any) => f.estado === "en_ruta" || f.estado === "en_espera")
          .map(mapearFicha)
      )
      
      // Fichas entregadas (en hospital o atendidas) - ordenadas por fecha más reciente
      const entregadas = fichas
        .filter((f: any) => f.estado === "en_hospital" || f.estado === "atendido")
        .map(mapearFicha)
        .sort((a: FichaActiva, b: FichaActiva) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setFichasEntregadas(entregadas)
    } catch (err) {
      console.error("Error cargando fichas:", err)
    }
  }, [user])

  // Hook de control de turno
  const { 
    turnoInfo, 
    mostrarModal: mostrarModalTurno, 
    enTurno, 
    cerrarModal: cerrarModalTurno 
  } = useTurno('paramedico')

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "paramedico") {
      navigate("/", { replace: true })
      return
    }
    setUser(currentUser)
    obtenerUbicacion()
    const interval = setInterval(obtenerUbicacion, 30000)
    return () => clearInterval(interval)
  }, [navigate, obtenerUbicacion])

  useEffect(() => {
    if (user) {
      cargarFichas()
      // Recargar fichas cada 30 segundos para ver nuevos mensajes/actualizaciones
      const interval = setInterval(cargarFichas, 30000)
      return () => clearInterval(interval)
    }
  }, [user, cargarFichas])

  // Enviar todo al hospital
  const handleEnviarTodo = async () => {
    if (!isFormularioCompleto()) {
      setError("Complete todos los campos obligatorios")
      return
    }

    // Verificar errores de validación en signos vitales
    if (Object.keys(erroresValidacion).length > 0) {
      setError("Corrija los errores en los signos vitales antes de enviar")
      setSeccionesAbiertas(p => ({ ...p, signos: true }))
      return
    }

    setLoading(true)
    setError("")

    try {
      // 1. Crear o buscar paciente
      let paciente: any = null
      
      if (esPacienteNN) {
        // Crear paciente NN con ID temporal
        const idTemporal = `NN-${Date.now()}`
        paciente = await pacientesAPI.crear({
          es_nn: true,
          id_temporal: idTemporal,
          nombres: "Paciente",
          apellidos: "NN",
          sexo: pacienteData.sexo,
          edad_aproximada: parseInt(pacienteData.edad_aproximada) || null,
          caracteristicas: pacienteData.caracteristicas || null,
        })
      } else {
        try {
          const existentes = await pacientesAPI.buscar(pacienteData.rut)
          if (existentes && existentes.length > 0) {
            paciente = existentes[0]
          }
        } catch {}

        if (!paciente) {
          paciente = await pacientesAPI.crear({
            rut: pacienteData.rut,
            nombres: pacienteData.nombres,
            apellidos: pacienteData.apellidos,
            sexo: pacienteData.sexo,
            fecha_nacimiento: pacienteData.fecha_nacimiento || null,
            telefono: pacienteData.telefono || null,
            es_nn: false,
          })
        }
      }

      // 2. Crear ficha con signos vitales
      const glasgowTotal = glasgow.ocular + glasgow.verbal + glasgow.motor
      const fichaData = {
        paciente: paciente.id,
        paramedico: user.id,
        motivo_consulta: evaluacionData.motivo_consulta,
        circunstancias: evaluacionData.circunstancias,
        sintomas: evaluacionData.motivo_consulta, // Usar motivo como síntomas si no hay campo separado
        nivel_consciencia: `Glasgow ${glasgowTotal} (O${glasgow.ocular} V${glasgow.verbal} M${glasgow.motor})`,
        estado: "en_ruta",
        prioridad: evaluacionData.prioridad,
        eta: eta,
        signos_vitales_data: {
          presion_sistolica: parseInt(signosData.presion_sistolica),
          presion_diastolica: parseInt(signosData.presion_diastolica) || 80,
          frecuencia_cardiaca: parseInt(signosData.frecuencia_cardiaca),
          frecuencia_respiratoria: parseInt(signosData.frecuencia_respiratoria),
          saturacion_o2: parseInt(signosData.saturacion_o2),
          temperatura: parseFloat(signosData.temperatura),
          glucosa: signosData.glucosa ? parseInt(signosData.glucosa) : null,
          escala_glasgow: glasgowTotal,
          glasgow_ocular: glasgow.ocular,
          glasgow_verbal: glasgow.verbal,
          glasgow_motor: glasgow.motor,
          eva: eva,
        },
      }

      const ficha = await fichasAPI.crear(fichaData)

      // 3. Si requiere medicamento, crear solicitud
      if (requiereMedicamento) {
        await solicitudesMedicamentosAPI.crear({
          ficha: ficha.id,
          paramedico: user.id,
          medicamento: medicamentoData.medicamento,
          dosis: medicamentoData.dosis,
          justificacion: medicamentoData.justificacion,
        })
      }

      // Éxito
      setFichaEnviada({
        id: ficha.id,
        paciente_nombre: `${paciente.nombres} ${paciente.apellidos}`,
        prioridad: evaluacionData.prioridad,
        estado: "en_ruta",
        created_at: new Date().toISOString(),
      })
      setModo("post-envio")
      setSuccess(`Ficha #${ficha.id} enviada exitosamente al hospital`)
      await cargarFichas()
    } catch (err: any) {
      console.error("Error:", err)
      setError(err.message || "Error al enviar la ficha")
    } finally {
      setLoading(false)
    }
  }

  // Nuevo paciente
  const handleNuevoPaciente = () => {
    setModo("formulario")
    setFichaEnviada(null)
    setEsPacienteNN(false)
    setPacienteExistente(null)
    setHistorialPaciente([])
    setMostrarHistorial(false)
    setPacienteData({ rut: "", nombres: "", apellidos: "", sexo: "", fecha_nacimiento: "", telefono: "", edad_aproximada: "", caracteristicas: "" })
    setSignosData({
      presion_sistolica: "",
      presion_diastolica: "",
      frecuencia_cardiaca: "",
      frecuencia_respiratoria: "",
      saturacion_o2: "",
      temperatura: "",
      glucosa: "",
    })
    setErroresValidacion({})
    setGlasgow({ ocular: 4, verbal: 5, motor: 6 })
    setEva(0)
    setEvaluacionData({ prioridad: "", motivo_consulta: "", circunstancias: "" })
    setRequiereMedicamento(false)
    setMedicamentoData({ medicamento: "", dosis: "", justificacion: "" })
    setSeccionesAbiertas({ identificacion: true, signos: false, evaluacion: false, medicamento: false })
    setSuccess("")
    setError("")
  }

  // Abrir chat
  const handleAbrirChat = (fichaId: number) => {
    navigate(`/dashboard/paramedico/chat/${fichaId}`)
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch {}
    localStorage.removeItem("medical_system_user")
    navigate("/", { replace: true })
  }

  if (!user) return null

  const getPrioridadColor = (p: string) => {
    switch (p) {
      case "C1": return "bg-red-600"
      case "C2": return "bg-orange-500"
      case "C3": return "bg-yellow-500 text-black"
      case "C4": return "bg-green-500"
      case "C5": return "bg-blue-500"
      default: return "bg-slate-500"
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

      {/* Header Minimalista */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Atención Pre-Hospitalaria</h1>
                <p className="text-xs text-slate-400">{user.nombre_completo || `${user.first_name} ${user.last_name}`}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* ETA Badge */}
              {ubicacion && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">{eta}</p>
                    {distancia && <p className="text-xs text-slate-400">{distancia.toFixed(1)} km</p>}
                  </div>
                </div>
              )}

              {/* Panel de Notificaciones */}
              <NotificationsPanel 
                onNavigateToFicha={(fichaId) => {
                  const ficha = fichasActivas.find(f => f.id === fichaId)
                  if (ficha) {
                    toggleFichaExpandida(fichaId)
                    toast({ title: `Navegando a ficha #${fichaId}` })
                  }
                }}
                onOpenChat={(fichaId) => {
                  // Abrir chat de la ficha
                  setFichaChatAbierto(fichaId)
                }}
              />

              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Tabs de Navegación */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={vistaActiva === "formulario" ? "default" : "outline"}
            onClick={() => setVistaActiva("formulario")}
            className={cn(
              "flex-1",
              vistaActiva === "formulario"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "border-slate-700 text-slate-300 hover:bg-slate-800"
            )}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Ficha
          </Button>
          <Button
            variant={vistaActiva === "historial" ? "default" : "outline"}
            onClick={() => setVistaActiva("historial")}
            className={cn(
              "flex-1 relative",
              vistaActiva === "historial"
                ? "bg-blue-600 hover:bg-blue-700"
                : "border-slate-700 text-slate-300 hover:bg-slate-800"
            )}
          >
            <History className="w-4 h-4 mr-2" />
            Mis Traslados
            {fichasEntregadas.length > 0 && (
              <Badge className="ml-2 bg-blue-500">{fichasEntregadas.length}</Badge>
            )}
          </Button>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 border-emerald-500 bg-emerald-500/10">
            <Check className="w-4 h-4 text-emerald-500" />
            <AlertDescription className="text-emerald-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* ==================== VISTA HISTORIAL ==================== */}
        {vistaActiva === "historial" && (
          <div className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  Pacientes Entregados al Hospital
                </CardTitle>
                <p className="text-sm text-slate-400">
                  Mantén comunicación con el equipo del hospital sobre tus traslados
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {fichasEntregadas.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400">No hay traslados registrados aún</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fichasEntregadas.map((f) => {
                      const isExpanded = fichasExpandidas.has(f.id)
                      const ultimosSignos = f.signos_vitales?.[f.signos_vitales.length - 1]
                      
                      return (
                        <Card 
                          key={f.id}
                          className="border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 overflow-hidden hover:border-slate-600/50 transition-all"
                        >
                          {/* Header de la ficha */}
                          <CardHeader 
                            className="pb-3 cursor-pointer hover:bg-slate-800/30 transition-colors"
                            onClick={() => toggleFichaExpandida(f.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center",
                                    f.estado === "en_hospital" 
                                      ? "bg-amber-500/20 border border-amber-500/30"
                                      : "bg-emerald-500/20 border border-emerald-500/30"
                                  )}>
                                    {f.estado === "en_hospital" ? (
                                      <Building2 className="w-6 h-6 text-amber-400" />
                                    ) : (
                                      <Stethoscope className="w-6 h-6 text-emerald-400" />
                                    )}
                                  </div>
                                  <Badge 
                                    className={cn(
                                      "absolute -bottom-1 -right-1 text-[10px] px-1.5 py-0 shadow-lg",
                                      getPrioridadColor(f.prioridad)
                                    )}
                                  >
                                    {f.prioridad}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-white font-semibold text-lg">
                                    {f.paciente_nombre}
                                  </p>
                                  <p className="text-sm text-slate-400 flex items-center gap-2">
                                    <FileText className="w-3 h-3" />
                                    Ficha #{f.id}
                                    <span className="text-slate-600">•</span>
                                    <Clock className="w-3 h-3" />
                                    {new Date(f.created_at).toLocaleDateString("es-CL", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "shadow-lg",
                                    f.estado === "en_hospital" 
                                      ? "text-amber-400 border-amber-500/50 bg-amber-500/10" 
                                      : "text-emerald-400 border-emerald-500/50 bg-emerald-500/10"
                                  )}
                                >
                                  {f.estado === "en_hospital" ? "En Hospital" : "Atendido"}
                                </Badge>
                                <ChevronRight className={cn(
                                  "w-5 h-5 text-slate-400 transition-transform",
                                  isExpanded && "rotate-90"
                                )} />
                              </div>
                            </div>
                          </CardHeader>

                          {/* Contenido expandido */}
                          {isExpanded && (
                            <CardContent className="pt-0 space-y-4">
                              {/* Motivo y Circunstancias */}
                              <div className="grid md:grid-cols-2 gap-3">
                                {f.motivo_consulta && (
                                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                                      Motivo de Consulta
                                    </h4>
                                    <p className="text-sm text-white">{f.motivo_consulta}</p>
                                  </div>
                                )}
                                {f.circunstancias && (
                                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                      Circunstancias
                                    </h4>
                                    <p className="text-sm text-white">{f.circunstancias}</p>
                                  </div>
                                )}
                              </div>

                              {/* Signos Vitales - Estilo moderno con gradientes */}
                              {ultimosSignos && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Heart className="w-3 h-3 text-red-400" />
                                    Signos Vitales
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {ultimosSignos.presion_sistolica && (
                                      <div className="p-3 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Heart className="w-4 h-4 text-red-400" />
                                          <p className="text-xs text-slate-400">Presión</p>
                                        </div>
                                        <p className="text-lg font-bold text-white">
                                          {ultimosSignos.presion_sistolica}/{ultimosSignos.presion_diastolica}
                                          <span className="text-xs text-slate-400 ml-1">mmHg</span>
                                        </p>
                                      </div>
                                    )}
                                    {ultimosSignos.frecuencia_cardiaca && (
                                      <div className="p-3 bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Activity className="w-4 h-4 text-pink-400" />
                                          <p className="text-xs text-slate-400">FC</p>
                                        </div>
                                        <p className="text-lg font-bold text-white">
                                          {ultimosSignos.frecuencia_cardiaca}
                                          <span className="text-xs text-slate-400 ml-1">lpm</span>
                                        </p>
                                      </div>
                                    )}
                                    {ultimosSignos.saturacion_o2 && (
                                      <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Droplets className="w-4 h-4 text-blue-400" />
                                          <p className="text-xs text-slate-400">SatO₂</p>
                                        </div>
                                        <p className="text-lg font-bold text-white">
                                          {ultimosSignos.saturacion_o2}
                                          <span className="text-xs text-slate-400 ml-1">%</span>
                                        </p>
                                      </div>
                                    )}
                                    {ultimosSignos.frecuencia_respiratoria && (
                                      <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Wind className="w-4 h-4 text-cyan-400" />
                                          <p className="text-xs text-slate-400">FR</p>
                                        </div>
                                        <p className="text-lg font-bold text-white">
                                          {ultimosSignos.frecuencia_respiratoria}
                                          <span className="text-xs text-slate-400 ml-1">rpm</span>
                                        </p>
                                      </div>
                                    )}
                                    {ultimosSignos.temperatura && (
                                      <div className="p-3 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Thermometer className="w-4 h-4 text-orange-400" />
                                          <p className="text-xs text-slate-400">Temp</p>
                                        </div>
                                        <p className="text-lg font-bold text-white">
                                          {ultimosSignos.temperatura}
                                          <span className="text-xs text-slate-400 ml-1">°C</span>
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Botón de Chat */}
                              <Button
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFichaChatAbierto(f.id)
                                }}
                              >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Comunicarse con Hospital
                              </Button>
                            </CardContent>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}

                {/* Modal Chat Pantalla Completa */}
                {fichaChatAbierto && user && (
                  <ChatPanel
                    fichaId={fichaChatAbierto}
                    usuarioActual={{
                      id: user.id,
                      username: user.username || "",
                      first_name: user.first_name || "",
                      last_name: user.last_name || "",
                      rol: user.rol as "paramedico",
                    }}
                    fullScreen={true}
                    onClose={() => setFichaChatAbierto(null)}
                    pacienteNombre={
                      fichasEntregadas.find(f => f.id === fichaChatAbierto)?.paciente_nombre || 
                      `Ficha #${fichaChatAbierto}`
                    }
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== VISTA FORMULARIO ==================== */}
        {vistaActiva === "formulario" && (
          <>
            {/* Fichas Activas */}
            {fichasActivas.length > 0 && (
              <Card className="mb-6 border-slate-800 bg-slate-900/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Fichas Activas ({fichasActivas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {fichasActivas.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={getPrioridadColor(f.prioridad)}>{f.prioridad}</Badge>
                          <div>
                            <p className="text-white font-medium">#{f.id} - {f.paciente_nombre}</p>
                            <p className="text-xs text-slate-400">{f.estado}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                            onClick={() => handleAbrirChat(f.id)}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vista Post-Envío */}
            {modo === "post-envio" && fichaEnviada && (
              <Card className="border-emerald-600/50 bg-emerald-900/20">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-600 flex items-center justify-center">
                      <Check className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Ficha Enviada</h2>
                <p className="text-slate-400">El hospital ha recibido la información del paciente</p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Ficha</p>
                    <p className="text-lg font-bold text-white">#{fichaEnviada.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Prioridad</p>
                    <Badge className={getPrioridadColor(fichaEnviada.prioridad)}>{fichaEnviada.prioridad}</Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Paciente</p>
                    <p className="text-white font-medium">{fichaEnviada.paciente_nombre}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleAbrirChat(fichaEnviada.id)}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Chat con Hospital
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-800"
                  onClick={handleNuevoPaciente}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nuevo Paciente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulario Principal */}
        {modo === "formulario" && (
          <div className="space-y-4">
            {/* Prioridad (siempre visible) */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="p-4">
                <PrioridadSelector
                  value={evaluacionData.prioridad}
                  onChange={(v) => setEvaluacionData({ ...evaluacionData, prioridad: v })}
                />
              </CardContent>
            </Card>

            {/* Sección 1: Identificación */}
            <SeccionColapsable
              numero={1}
              titulo="Identificación del Paciente"
              icono={User}
              completado={isIdentificacionCompleta()}
              abierto={seccionesAbiertas.identificacion}
              onToggle={() => setSeccionesAbiertas((p) => ({ ...p, identificacion: !p.identificacion }))}
            >
              <div className="space-y-4">
                {/* Toggle Paciente NN */}
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  esPacienteNN 
                    ? "bg-amber-600/20 border-amber-500" 
                    : "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50"
                )} onClick={() => setEsPacienteNN(!esPacienteNN)}>
                  <AlertTriangle className={cn("w-5 h-5", esPacienteNN ? "text-amber-400" : "text-amber-500")} />
                  <div className="flex-1">
                    <p className={cn("text-sm font-medium", esPacienteNN ? "text-amber-300" : "text-amber-400")}>
                      {esPacienteNN ? "Paciente sin identificación (NN)" : "¿Paciente sin identificación?"}
                    </p>
                    {esPacienteNN && (
                      <p className="text-xs text-amber-400/70">Haga clic para volver al registro normal</p>
                    )}
                  </div>
                  <div className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    esPacienteNN ? "bg-amber-500" : "bg-slate-700"
                  )}>
                    <div className={cn(
                      "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all",
                      esPacienteNN ? "left-6" : "left-0.5"
                    )} />
                  </div>
                </div>

                {esPacienteNN ? (
                  /* Formulario para Paciente NN */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Sexo *</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Masculino", "Femenino"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setPacienteData({ ...pacienteData, sexo: s })}
                            className={cn(
                              "p-3 rounded-lg font-medium transition-all border",
                              pacienteData.sexo === s
                                ? "bg-emerald-600 border-emerald-400 text-white"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Edad Aproximada *</Label>
                      <Input
                        type="number"
                        placeholder="Ej: 45"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.edad_aproximada}
                        onChange={(e) => setPacienteData({ ...pacienteData, edad_aproximada: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-slate-300">Características físicas (opcional)</Label>
                      <Input
                        placeholder="Ej: Cabello negro, altura aprox 1.75m, tatuaje en brazo derecho..."
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.caracteristicas}
                        onChange={(e) => setPacienteData({ ...pacienteData, caracteristicas: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  /* Formulario Normal */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">RUT *</Label>
                      <div className="relative">
                        <Input
                          placeholder="12.345.678-9"
                          className="bg-slate-800 border-slate-700 text-white pr-10"
                          value={pacienteData.rut}
                          onChange={(e) => {
                            setPacienteData({ ...pacienteData, rut: e.target.value })
                            // Buscar paciente al escribir el RUT
                            buscarPacientePorRut(e.target.value)
                          }}
                        />
                        {buscandoPaciente && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                          </div>
                        )}
                      </div>
                      {pacienteExistente && (
                        <div className="mt-2 p-3 bg-emerald-900/30 border border-emerald-600 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm text-emerald-300 font-medium">
                                Paciente registrado
                              </span>
                            </div>
                            {historialPaciente.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMostrarHistorial(!mostrarHistorial)}
                                className="text-emerald-400 hover:text-emerald-300 p-1 h-auto"
                              >
                                <History className="w-4 h-4 mr-1" />
                                {historialPaciente.length} visitas
                              </Button>
                            )}
                          </div>
                          {mostrarHistorial && historialPaciente.length > 0 && (
                            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                              {historialPaciente.slice(0, 5).map((ficha: any) => (
                                <div key={ficha.id} className="p-2 bg-slate-800/50 rounded text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">{new Date(ficha.fecha_llegada).toLocaleDateString('es-CL')}</span>
                                    <Badge variant="outline" className="text-xs">{ficha.prioridad}</Badge>
                                  </div>
                                  <p className="text-slate-400 mt-1 truncate">{ficha.motivo_consulta}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Sexo *</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Masculino", "Femenino"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setPacienteData({ ...pacienteData, sexo: s })}
                            className={cn(
                              "p-3 rounded-lg font-medium transition-all border",
                              pacienteData.sexo === s
                                ? "bg-emerald-600 border-emerald-400 text-white"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Nombres *</Label>
                      <Input
                        placeholder="Juan Carlos"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.nombres}
                        onChange={(e) => setPacienteData({ ...pacienteData, nombres: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Apellidos *</Label>
                      <Input
                        placeholder="González Pérez"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.apellidos}
                        onChange={(e) => setPacienteData({ ...pacienteData, apellidos: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Fecha de Nacimiento</Label>
                      <Input
                        type="date"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.fecha_nacimiento}
                        onChange={(e) => setPacienteData({ ...pacienteData, fecha_nacimiento: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Teléfono</Label>
                      <Input
                        placeholder="+56 9 1234 5678"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.telefono}
                        onChange={(e) => setPacienteData({ ...pacienteData, telefono: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </SeccionColapsable>

            {/* Sección 2: Signos Vitales */}
            <SeccionColapsable
              numero={2}
              titulo="Signos Vitales"
              icono={Heart}
              completado={isSignosCompletos()}
              abierto={seccionesAbiertas.signos}
              onToggle={() => setSeccionesAbiertas((p) => ({ ...p, signos: !p.signos }))}
            >
              <div className="space-y-4">
                {/* Mensaje de rangos válidos */}
                {Object.keys(erroresValidacion).length > 0 && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {Object.values(erroresValidacion).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Presión Arterial (mmHg) *</Label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="120"
                          className={cn(
                            "bg-slate-800 border-slate-700 text-white",
                            erroresValidacion.presion_sistolica && "border-red-500 focus:border-red-500"
                          )}
                          value={signosData.presion_sistolica}
                          onChange={(e) => handleSignoChange("presion_sistolica", e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">60-250</p>
                      </div>
                      <span className="text-slate-500">/</span>
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="80"
                          className={cn(
                            "bg-slate-800 border-slate-700 text-white",
                            erroresValidacion.presion_diastolica && "border-red-500 focus:border-red-500"
                          )}
                          value={signosData.presion_diastolica}
                          onChange={(e) => handleSignoChange("presion_diastolica", e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">40-150</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">FC (lpm) *</Label>
                    <Input
                      type="number"
                      placeholder="75"
                      className={cn(
                        "bg-slate-800 border-slate-700 text-white",
                        erroresValidacion.frecuencia_cardiaca && "border-red-500 focus:border-red-500"
                      )}
                      value={signosData.frecuencia_cardiaca}
                      onChange={(e) => handleSignoChange("frecuencia_cardiaca", e.target.value)}
                    />
                    <p className="text-xs text-slate-500">30-220 lpm</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">FR (rpm) *</Label>
                    <Input
                      type="number"
                      placeholder="16"
                      className={cn(
                        "bg-slate-800 border-slate-700 text-white",
                        erroresValidacion.frecuencia_respiratoria && "border-red-500 focus:border-red-500"
                      )}
                      value={signosData.frecuencia_respiratoria}
                      onChange={(e) => handleSignoChange("frecuencia_respiratoria", e.target.value)}
                    />
                    <p className="text-xs text-slate-500">8-60 rpm</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">SatO₂ (%) *</Label>
                    <Input
                      type="number"
                      placeholder="98"
                      className={cn(
                        "bg-slate-800 border-slate-700 text-white",
                        erroresValidacion.saturacion_o2 && "border-red-500 focus:border-red-500"
                      )}
                      value={signosData.saturacion_o2}
                      onChange={(e) => handleSignoChange("saturacion_o2", e.target.value)}
                    />
                    <p className="text-xs text-slate-500">50-100%</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Temperatura (°C) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="36.5"
                      className={cn(
                        "bg-slate-800 border-slate-700 text-white",
                        erroresValidacion.temperatura && "border-red-500 focus:border-red-500"
                      )}
                      value={signosData.temperatura}
                      onChange={(e) => handleSignoChange("temperatura", e.target.value)}
                    />
                    <p className="text-xs text-slate-500">32-42°C</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Glucosa (mg/dL)</Label>
                    <Input
                      type="number"
                      placeholder="90"
                      className={cn(
                        "bg-slate-800 border-slate-700 text-white",
                        erroresValidacion.glucosa && "border-red-500 focus:border-red-500"
                      )}
                      value={signosData.glucosa}
                      onChange={(e) => handleSignoChange("glucosa", e.target.value)}
                    />
                    <p className="text-xs text-slate-500">20-600 mg/dL (opcional)</p>
                  </div>
                </div>

                {/* Glasgow */}
                <GlasgowSelector
                  ocular={glasgow.ocular}
                  verbal={glasgow.verbal}
                  motor={glasgow.motor}
                  onChange={(field, value) => setGlasgow((prev) => ({ ...prev, [field]: value }))}
                />

                {/* EVA */}
                <EvaSelector value={eva} onChange={setEva} />
              </div>
            </SeccionColapsable>

            {/* Sección 3: Evaluación Clínica */}
            <SeccionColapsable
              numero={3}
              titulo="Evaluación Clínica"
              icono={FileText}
              completado={isEvaluacionCompleta()}
              abierto={seccionesAbiertas.evaluacion}
              onToggle={() => setSeccionesAbiertas((p) => ({ ...p, evaluacion: !p.evaluacion }))}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Motivo de Consulta *</Label>
                  <Textarea
                    placeholder="Describa el motivo principal de la atención..."
                    className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    value={evaluacionData.motivo_consulta}
                    onChange={(e) => setEvaluacionData({ ...evaluacionData, motivo_consulta: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Circunstancias del Incidente *</Label>
                  <Textarea
                    placeholder="Describa cómo ocurrió el incidente, lugar, hora aproximada..."
                    className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    value={evaluacionData.circunstancias}
                    onChange={(e) => setEvaluacionData({ ...evaluacionData, circunstancias: e.target.value })}
                  />
                </div>
              </div>
            </SeccionColapsable>

            {/* Sección 4: Medicamento (Opcional) */}
            <SeccionColapsable
              numero={4}
              titulo="Solicitud de Medicamento"
              icono={Pill}
              completado={isMedicamentoCompleto() && requiereMedicamento}
              abierto={seccionesAbiertas.medicamento}
              onToggle={() => setSeccionesAbiertas((p) => ({ ...p, medicamento: !p.medicamento }))}
            >
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer border border-slate-700 hover:border-slate-600">
                  <input
                    type="checkbox"
                    checked={requiereMedicamento}
                    onChange={(e) => setRequiereMedicamento(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-white font-medium">Requiere autorización de medicamento</p>
                    <p className="text-xs text-slate-400">Marque si necesita solicitar un medicamento al médico</p>
                  </div>
                </label>

                {requiereMedicamento && (
                  <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Medicamento *</Label>
                      <Input
                        placeholder="Nombre del medicamento a administrar"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={medicamentoData.medicamento}
                        onChange={(e) => setMedicamentoData({ ...medicamentoData, medicamento: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Dosis *</Label>
                      <Input
                        placeholder="Ej: 300mg vía oral, 10mg IV, etc."
                        className="bg-slate-800 border-slate-700 text-white"
                        value={medicamentoData.dosis}
                        onChange={(e) => setMedicamentoData({ ...medicamentoData, dosis: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Justificación Clínica *</Label>
                      <Textarea
                        placeholder="Razón médica para la administración del medicamento..."
                        className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                        value={medicamentoData.justificacion}
                        onChange={(e) => setMedicamentoData({ ...medicamentoData, justificacion: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </SeccionColapsable>

            {/* Botón de Envío */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="p-4">
                {/* Indicador de ETA móvil */}
                {ubicacion && (
                  <div className="flex items-center justify-center gap-4 mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg sm:hidden">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-400">{eta}</p>
                      {distancia && <p className="text-xs text-slate-400">{distancia.toFixed(1)} km del hospital</p>}
                    </div>
                  </div>
                )}

                <Button
                  size="lg"
                  onClick={handleEnviarTodo}
                  disabled={loading || !isFormularioCompleto()}
                  className={cn(
                    "w-full h-14 text-lg font-bold transition-all",
                    isFormularioCompleto()
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/25"
                      : "bg-slate-700 text-slate-400 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Enviar al Hospital
                    </>
                  )}
                </Button>

                {!isFormularioCompleto() && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-slate-400">
                      Complete todos los campos obligatorios para enviar
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {!evaluacionData.prioridad && <Badge variant="outline" className="text-red-400 border-red-500/50">Prioridad</Badge>}
                      {!isIdentificacionCompleta() && <Badge variant="outline" className="text-red-400 border-red-500/50">Identificación</Badge>}
                      {!isSignosCompletos() && <Badge variant="outline" className="text-red-400 border-red-500/50">Signos Vitales</Badge>}
                      {!isEvaluacionCompleta() && <Badge variant="outline" className="text-red-400 border-red-500/50">Evaluación</Badge>}
                      {!isMedicamentoCompleto() && <Badge variant="outline" className="text-red-400 border-red-500/50">Medicamento</Badge>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  )
}

export default DashboardParamedicoPage
