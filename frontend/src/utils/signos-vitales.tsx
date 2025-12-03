import { TrendingUp, TrendingDown, Minus } from "lucide-react"

// Función para evaluar estado de signos vitales
export function evaluarSignoVital(tipo: string, valor: number): "normal" | "warning" | "critical" {
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

// Función para calcular tiempo de espera
export function calcularTiempoEspera(fechaLlegada: string | Date): { texto: string, minutos: number, urgente: boolean } {
  if (!fechaLlegada) return { texto: "N/A", minutos: 0, urgente: false }
  
  const llegada = new Date(fechaLlegada)
  const ahora = new Date()
  const diffMs = ahora.getTime() - llegada.getTime()
  const diffMinutos = Math.floor(diffMs / (1000 * 60))
  
  if (diffMinutos < 0) return { texto: "Recién llegado", minutos: 0, urgente: false }
  
  const horas = Math.floor(diffMinutos / 60)
  const minutos = diffMinutos % 60
  
  let texto = ""
  if (horas > 0) {
    texto = `${horas}h ${minutos}m`
  } else {
    texto = `${minutos}m`
  }
  
  // Consideramos urgente si lleva más de 2 horas esperando
  const urgente = diffMinutos > 120
  
  return { texto, minutos: diffMinutos, urgente }
}

// Componente de Signo Vital Individual
export interface SignoVitalCardProps {
  icon: any
  label: string
  value: string | number
  unit?: string
  status?: "normal" | "warning" | "critical"
  trend?: "up" | "down" | "stable"
}

export function SignoVitalCard({ 
  icon: Icon, 
  label, 
  value, 
  unit, 
  status = "normal",
  trend
}: SignoVitalCardProps) {
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

// Colores según prioridad de triage
export const prioridadConfig: Record<string, { color: string, bgColor: string, label: string }> = {
  C1: { color: "text-red-500", bgColor: "bg-red-500/20", label: "Resucitación" },
  C2: { color: "text-orange-500", bgColor: "bg-orange-500/20", label: "Emergencia" },
  C3: { color: "text-yellow-500", bgColor: "bg-yellow-500/20", label: "Urgencia" },
  C4: { color: "text-green-500", bgColor: "bg-green-500/20", label: "Menor" },
  C5: { color: "text-blue-500", bgColor: "bg-blue-500/20", label: "No Urgente" }
}

// Obtener color de prioridad
export function getPrioridadColor(prioridad: string): string {
  return prioridadConfig[prioridad]?.color || "text-slate-400"
}

export function getPrioridadBgColor(prioridad: string): string {
  return prioridadConfig[prioridad]?.bgColor || "bg-slate-500/20"
}

export function getPrioridadLabel(prioridad: string): string {
  return prioridadConfig[prioridad]?.label || prioridad
}
