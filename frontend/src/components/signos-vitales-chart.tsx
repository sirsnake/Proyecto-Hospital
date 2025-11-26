import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

interface SignoVital {
  id: number
  presionSistolica: number
  presionDiastolica: number
  frecuenciaCardiaca: number
  frecuenciaRespiratoria: number
  saturacionO2: number
  temperatura: number
  escalaGlasgow?: number
  fechaRegistro: string
}

interface SignosVitalesChartProps {
  signosVitales: SignoVital[]
  tipo: 'presion' | 'frecuencia' | 'saturacion' | 'temperatura' | 'completo'
}

interface TooltipPayloadEntry {
  color: string
  name: string
  value: number
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

const formatFecha = (fecha: string) => {
  const d = new Date(fecha)
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl">
        <p className="text-xs text-slate-400 mb-2">{label}</p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
            {entry.dataKey.includes('presion') && ' mmHg'}
            {entry.dataKey.includes('frecuenciaCardiaca') && ' bpm'}
            {entry.dataKey.includes('frecuenciaRespiratoria') && ' rpm'}
            {entry.dataKey.includes('saturacion') && '%'}
            {entry.dataKey.includes('temperatura') && '°C'}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function SignosVitalesChart({ signosVitales, tipo }: SignosVitalesChartProps) {
  // Preparar datos para el gráfico (ordenados por fecha, más antiguo primero)
  const data = [...signosVitales]
    .sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime())
    .map((sv, index) => ({
      ...sv,
      nombre: index === 0 ? 'Inicial' : `#${index + 1}`,
      hora: formatFecha(sv.fechaRegistro),
    }))

  if (data.length < 2) {
    return (
      <div className="text-center text-slate-500 py-4">
        Se necesitan al menos 2 mediciones para mostrar el gráfico evolutivo
      </div>
    )
  }

  if (tipo === 'presion') {
    return (
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hora" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis domain={[40, 200]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine y={140} stroke="#fbbf24" strokeDasharray="5 5" label={{ value: 'Límite alto', fill: '#fbbf24', fontSize: 10 }} />
            <ReferenceLine y={90} stroke="#fbbf24" strokeDasharray="5 5" label={{ value: 'Límite bajo', fill: '#fbbf24', fontSize: 10 }} />
            <Line 
              type="monotone" 
              dataKey="presionSistolica" 
              name="Sistólica" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="presionDiastolica" 
              name="Diastólica" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (tipo === 'frecuencia') {
    return (
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hora" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis domain={[0, 150]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine y={100} stroke="#fbbf24" strokeDasharray="5 5" />
            <ReferenceLine y={60} stroke="#fbbf24" strokeDasharray="5 5" />
            <Line 
              type="monotone" 
              dataKey="frecuenciaCardiaca" 
              name="FC (bpm)" 
              stroke="#f97316" 
              strokeWidth={2}
              dot={{ fill: '#f97316', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="frecuenciaRespiratoria" 
              name="FR (rpm)" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (tipo === 'saturacion') {
    return (
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hora" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis domain={[85, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine y={95} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Normal ≥95%', fill: '#22c55e', fontSize: 10 }} />
            <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Crítico <90%', fill: '#ef4444', fontSize: 10 }} />
            <Line 
              type="monotone" 
              dataKey="saturacionO2" 
              name="SatO₂ (%)" 
              stroke="#06b6d4" 
              strokeWidth={3}
              dot={{ fill: '#06b6d4', strokeWidth: 2 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (tipo === 'temperatura') {
    return (
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hora" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis domain={[35, 42]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine y={37.5} stroke="#fbbf24" strokeDasharray="5 5" label={{ value: 'Febrícula', fill: '#fbbf24', fontSize: 10 }} />
            <ReferenceLine y={38.5} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Fiebre', fill: '#ef4444', fontSize: 10 }} />
            <Line 
              type="monotone" 
              dataKey="temperatura" 
              name="Temp (°C)" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Gráfico completo (todos los signos normalizados)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
          <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Presión Arterial
          </h5>
          <SignosVitalesChart signosVitales={signosVitales} tipo="presion" />
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
          <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            Frecuencias
          </h5>
          <SignosVitalesChart signosVitales={signosVitales} tipo="frecuencia" />
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
          <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-500" />
            Saturación O₂
          </h5>
          <SignosVitalesChart signosVitales={signosVitales} tipo="saturacion" />
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
          <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            Temperatura
          </h5>
          <SignosVitalesChart signosVitales={signosVitales} tipo="temperatura" />
        </div>
      </div>
    </div>
  )
}
