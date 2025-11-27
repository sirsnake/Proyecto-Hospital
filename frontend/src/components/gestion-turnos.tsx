import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/hooks/use-toast'
import { turnosAPI } from '@/lib/api'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Clock, 
  Sun, 
  Moon, 
  Coffee,
  Timer,
  Save,
  RefreshCw,
  UserCheck,
  Settings
} from 'lucide-react'

interface StaffMember {
  id: number
  nombre: string
  username: string
  especialidad?: string
}

interface PersonalTurno {
  usuario_id: number
  nombre: string
  tipo_turno: string
  tipo_turno_display: string
  en_turno: boolean
  esta_en_horario: boolean
  hora_entrada: string | null
  es_voluntario: boolean
}

interface Turno {
  id: number
  usuario: number
  usuario_nombre: string
  usuario_rol: string
  fecha: string
  tipo_turno: 'AM' | 'PM' | 'DOBLE' | 'DESCANSO'
  tipo_turno_display: string
  en_turno: boolean
  es_voluntario: boolean
  horario: { inicio: string; fin: string } | null
}

interface CalendarioData {
  mes: number
  anio: number
  calendario: { [fecha: string]: Turno[] }
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const TIPOS_TURNO = [
  { value: 'AM', label: 'AM (Día)', icon: Sun, color: 'bg-amber-500' },
  { value: 'PM', label: 'PM (Noche)', icon: Moon, color: 'bg-indigo-500' },
  { value: 'DOBLE', label: 'Doble (24h)', icon: Timer, color: 'bg-purple-500' },
  { value: 'DESCANSO', label: 'Descanso', icon: Coffee, color: 'bg-slate-500' },
]

export function GestionTurnos() {
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1)
  const [anioActual, setAnioActual] = useState(new Date().getFullYear())
  const [rolFiltro, setRolFiltro] = useState<string>('all')
  const [staffPorRol, setStaffPorRol] = useState<{ [rol: string]: StaffMember[] }>({})
  const [calendario, setCalendario] = useState<CalendarioData | null>(null)
  const [cargando, setCargando] = useState(false)
  const [personalEnTurno, setPersonalEnTurno] = useState<{
    total_asignados: number
    total_activos: number
    por_rol: { [rol: string]: PersonalTurno[] }
  } | null>(null)
  
  // Modal de asignación
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<StaffMember | null>(null)
  const [turnosAsignar, setTurnosAsignar] = useState<{ [fecha: string]: string }>({})
  const [guardando, setGuardando] = useState(false)
  
  // Modal de detalle de personal en turno
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false)
  const [detalleRol, setDetalleRol] = useState<string | null>(null)
  
  // Modal de configuración de horarios
  const [modalHorariosOpen, setModalHorariosOpen] = useState(false)
  const [horarios, setHorarios] = useState<{ [tipo: string]: { inicio: string; fin: string } }>({
    AM: { inicio: '08:00', fin: '20:00' },
    PM: { inicio: '20:00', fin: '08:00' },
    DOBLE: { inicio: '08:00', fin: '08:00' },
  })

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [staffData, calendarioData, enTurnoData, horariosData] = await Promise.all([
        turnosAPI.staffDisponible(),
        turnosAPI.calendarioMensual(mesActual, anioActual, rolFiltro === 'all' ? undefined : rolFiltro),
        turnosAPI.personalEnTurno(),
        turnosAPI.obtenerHorarios()
      ])
      
      setStaffPorRol(staffData)
      setCalendario(calendarioData)
      setPersonalEnTurno(enTurnoData)
      setHorarios(horariosData)
    } catch (error) {
      console.error('Error cargando datos de turnos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de turnos',
        variant: 'destructive'
      })
    } finally {
      setCargando(false)
    }
  }

  // Cargar datos al montar y cuando cambian los filtros
  useEffect(() => {
    cargarDatos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesActual, anioActual, rolFiltro])

  const getDiasDelMes = () => {
    const primerDia = new Date(anioActual, mesActual - 1, 1)
    const ultimoDia = new Date(anioActual, mesActual, 0)
    const diasEnMes = ultimoDia.getDate()
    const primerDiaSemana = primerDia.getDay()
    
    const dias: { fecha: string; dia: number; esMesActual: boolean }[] = []
    
    // Días del mes anterior para llenar la primera semana
    const diasMesAnterior = new Date(anioActual, mesActual - 1, 0).getDate()
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const diaAnterior = diasMesAnterior - i
      const mesAnterior = mesActual === 1 ? 12 : mesActual - 1
      const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual
      dias.push({
        fecha: `${anioAnterior}-${String(mesAnterior).padStart(2, '0')}-${String(diaAnterior).padStart(2, '0')}`,
        dia: diaAnterior,
        esMesActual: false
      })
    }
    
    // Días del mes actual
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push({
        fecha: `${anioActual}-${String(mesActual).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
        dia,
        esMesActual: true
      })
    }
    
    // Días del mes siguiente para completar la última semana
    const diasRestantes = 42 - dias.length // 6 semanas * 7 días
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const mesSiguiente = mesActual === 12 ? 1 : mesActual + 1
      const anioSiguiente = mesActual === 12 ? anioActual + 1 : anioActual
      dias.push({
        fecha: `${anioSiguiente}-${String(mesSiguiente).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
        dia,
        esMesActual: false
      })
    }
    
    return dias
  }

  const cambiarMes = (delta: number) => {
    let nuevoMes = mesActual + delta
    let nuevoAnio = anioActual
    
    if (nuevoMes < 1) {
      nuevoMes = 12
      nuevoAnio--
    } else if (nuevoMes > 12) {
      nuevoMes = 1
      nuevoAnio++
    }
    
    setMesActual(nuevoMes)
    setAnioActual(nuevoAnio)
  }

  const abrirModalAsignar = (usuario: StaffMember) => {
    setUsuarioSeleccionado(usuario)
    setTurnosAsignar({})
    setModalAsignarOpen(true)
  }

  const toggleTurnoDia = (fecha: string, tipo: string) => {
    setTurnosAsignar(prev => {
      if (prev[fecha] === tipo) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [fecha]: removed, ...rest } = prev
        return rest
      }
      return { ...prev, [fecha]: tipo }
    })
  }

  const guardarTurnos = async () => {
    if (!usuarioSeleccionado) return
    
    const turnosList = Object.entries(turnosAsignar).map(([fecha, tipo_turno]) => ({
      fecha,
      tipo_turno
    }))
    
    if (turnosList.length === 0) {
      toast({
        title: 'Sin cambios',
        description: 'No hay turnos para asignar',
        variant: 'destructive'
      })
      return
    }
    
    setGuardando(true)
    try {
      await turnosAPI.asignarMasivo(usuarioSeleccionado.id, turnosList)
      toast({
        title: 'Turnos asignados',
        description: `Se asignaron ${turnosList.length} turnos a ${usuarioSeleccionado.nombre}`
      })
      setModalAsignarOpen(false)
      cargarDatos()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron asignar los turnos',
        variant: 'destructive'
      })
    } finally {
      setGuardando(false)
    }
  }

  const guardarHorarios = async () => {
    try {
      await turnosAPI.actualizarHorarios(horarios)
      toast({
        title: 'Horarios actualizados',
        description: 'Los horarios de turnos se guardaron correctamente'
      })
      setModalHorariosOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron guardar los horarios',
        variant: 'destructive'
      })
    }
  }

  const getTurnosPorFecha = (fecha: string): Turno[] => {
    return calendario?.calendario[fecha] || []
  }

  const getRolLabel = (rol: string) => {
    switch (rol) {
      case 'medico': return 'Médicos'
      case 'tens': return 'TENS'
      case 'paramedico': return 'Paramédicos'
      default: return rol
    }
  }

  const getTurnoIcon = (tipo: string) => {
    const turnoConfig = TIPOS_TURNO.find(t => t.value === tipo)
    return turnoConfig?.icon || Clock
  }

  const getTurnoColor = (tipo: string) => {
    const turnoConfig = TIPOS_TURNO.find(t => t.value === tipo)
    return turnoConfig?.color || 'bg-slate-500'
  }

  const abrirModalDetalle = (rol: string | null) => {
    setDetalleRol(rol)
    setModalDetalleOpen(true)
  }

  const getPersonalPorRol = (rol: string | null) => {
    if (!personalEnTurno) return []
    if (rol === null) {
      // Todos los roles
      return Object.entries(personalEnTurno.por_rol).flatMap(([r, personal]) => 
        personal.map(p => ({ ...p, rol: r }))
      )
    }
    return (personalEnTurno.por_rol[rol] || []).map(p => ({ ...p, rol }))
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas - Clickeables */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="bg-slate-800/50 border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors"
          onClick={() => abrirModalDetalle(null)}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <UserCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{personalEnTurno?.total_asignados || 0}</p>
                <p className="text-xs text-slate-400">Personal en turno hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {['medico', 'tens', 'paramedico'].map(rol => (
          <Card 
            key={rol} 
            className="bg-slate-800/50 border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors"
            onClick={() => abrirModalDetalle(rol)}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  rol === 'medico' ? 'bg-blue-500/20' : 
                  rol === 'tens' ? 'bg-green-500/20' : 'bg-orange-500/20'
                }`}>
                  <Users className={`h-5 w-5 ${
                    rol === 'medico' ? 'text-blue-400' : 
                    rol === 'tens' ? 'text-green-400' : 'text-orange-400'
                  }`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {personalEnTurno?.por_rol?.[rol]?.length || 0}
                  </p>
                  <p className="text-xs text-slate-400">{getRolLabel(rol)} en turno</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => cambiarMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold text-white min-w-[180px] text-center">
            {MESES[mesActual - 1]} {anioActual}
          </h2>
          <Button variant="outline" size="icon" onClick={() => cambiarMes(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={rolFiltro} onValueChange={setRolFiltro}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="medico">Médicos</SelectItem>
              <SelectItem value="tens">TENS</SelectItem>
              <SelectItem value="paramedico">Paramédicos</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={cargarDatos} disabled={cargando}>
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          </Button>

          <Button variant="outline" onClick={() => setModalHorariosOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Horarios
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de personal */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {Object.entries(staffPorRol).map(([rol, staff]) => (
                  <div key={rol}>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">
                      {getRolLabel(rol)} ({staff.length})
                    </h3>
                    <div className="space-y-1">
                      {staff.map(persona => (
                        <Button
                          key={persona.id}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-slate-700"
                          onClick={() => abrirModalAsignar(persona)}
                        >
                          <div>
                            <p className="text-sm text-white">{persona.nombre}</p>
                            {persona.especialidad && (
                              <p className="text-xs text-slate-400">{persona.especialidad}</p>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Calendario */}
        <Card className="lg:col-span-3 bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario de Turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DIAS_SEMANA.map(dia => (
                <div key={dia} className="text-center text-xs font-medium text-slate-400 py-2">
                  {dia}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-1">
              {getDiasDelMes().map(({ fecha, dia, esMesActual }) => {
                const turnos = getTurnosPorFecha(fecha)
                const esHoy = fecha === new Date().toISOString().split('T')[0]
                
                return (
                  <div
                    key={fecha}
                    className={`min-h-[80px] p-1 rounded-lg border ${
                      esMesActual 
                        ? esHoy 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : 'border-slate-700 bg-slate-900/50'
                        : 'border-slate-800 bg-slate-900/20 opacity-50'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 ${
                      esHoy ? 'text-emerald-400' : esMesActual ? 'text-slate-300' : 'text-slate-500'
                    }`}>
                      {dia}
                    </div>
                    <div className="space-y-0.5">
                      {turnos.slice(0, 3).map(turno => {
                        const Icon = getTurnoIcon(turno.tipo_turno)
                        return (
                          <div
                            key={turno.id}
                            className={`text-[10px] px-1 py-0.5 rounded flex items-center gap-1 ${getTurnoColor(turno.tipo_turno)} text-white truncate`}
                            title={`${turno.usuario_nombre} - ${turno.tipo_turno_display}`}
                          >
                            <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate">{turno.usuario_nombre.split(' ')[0]}</span>
                          </div>
                        )
                      })}
                      {turnos.length > 3 && (
                        <div className="text-[10px] text-slate-400 text-center">
                          +{turnos.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-700">
              {TIPOS_TURNO.map(tipo => {
                const Icon = tipo.icon
                return (
                  <div key={tipo.value} className="flex items-center gap-2">
                    <div className={`p-1 rounded ${tipo.color}`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs text-slate-400">{tipo.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de asignación de turnos */}
      <Dialog open={modalAsignarOpen} onOpenChange={setModalAsignarOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Asignar Turnos - {usuarioSeleccionado?.nombre}</DialogTitle>
            <DialogDescription>
              Selecciona el tipo de turno para cada día del mes. Haz clic en el tipo de turno debajo de cada día.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh]">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-2 mb-2 sticky top-0 bg-background z-10 py-2">
              {DIAS_SEMANA.map(dia => (
                <div key={dia} className="text-center text-sm font-medium text-muted-foreground">
                  {dia}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-2">
              {getDiasDelMes().map(({ fecha, dia, esMesActual }) => {
                const turnoSeleccionado = turnosAsignar[fecha]
                const turnoExistente = getTurnosPorFecha(fecha).find(
                  t => t.usuario === usuarioSeleccionado?.id
                )
                
                if (!esMesActual) {
                  return <div key={fecha} className="p-2 rounded-lg bg-muted/20 opacity-30" />
                }
                
                return (
                  <div
                    key={fecha}
                    className="p-2 rounded-lg border bg-card"
                  >
                    <div className="text-sm font-medium text-center mb-2">{dia}</div>
                    <div className="grid grid-cols-2 gap-1">
                      {TIPOS_TURNO.map(tipo => {
                        const Icon = tipo.icon
                        const isSelected = turnoSeleccionado === tipo.value
                        const isExisting = turnoExistente?.tipo_turno === tipo.value && !turnoSeleccionado
                        
                        return (
                          <button
                            key={tipo.value}
                            onClick={() => toggleTurnoDia(fecha, tipo.value)}
                            className={`p-1.5 rounded flex items-center justify-center transition-all ${
                              isSelected 
                                ? `${tipo.color} text-white ring-2 ring-offset-2 ring-offset-background`
                                : isExisting
                                  ? `${tipo.color}/50 text-white`
                                  : 'bg-muted hover:bg-muted/80'
                            }`}
                            title={tipo.label}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-sm text-muted-foreground">
                {Object.keys(turnosAsignar).length} días seleccionados
              </span>
            </div>
            <Button variant="outline" onClick={() => setModalAsignarOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarTurnos} disabled={guardando}>
              {guardando ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Turnos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de configuración de horarios */}
      <Dialog open={modalHorariosOpen} onOpenChange={setModalHorariosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuración de Horarios</DialogTitle>
            <DialogDescription>
              Define las horas de inicio y fin para cada tipo de turno.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {TIPOS_TURNO.filter(t => t.value !== 'DESCANSO').map(tipo => {
              const Icon = tipo.icon
              return (
                <div key={tipo.value} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${tipo.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <Label className="font-medium">{tipo.label}</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pl-8">
                    <div>
                      <Label className="text-xs text-muted-foreground">Hora inicio</Label>
                      <Input
                        type="time"
                        value={horarios[tipo.value]?.inicio || ''}
                        onChange={(e) => setHorarios(prev => ({
                          ...prev,
                          [tipo.value]: { ...prev[tipo.value], inicio: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Hora fin</Label>
                      <Input
                        type="time"
                        value={horarios[tipo.value]?.fin || ''}
                        onChange={(e) => setHorarios(prev => ({
                          ...prev,
                          [tipo.value]: { ...prev[tipo.value], fin: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalHorariosOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarHorarios}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Horarios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de detalle de personal en turno */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {detalleRol === null 
                ? 'Todo el personal en turno hoy' 
                : `${getRolLabel(detalleRol)} en turno hoy`}
            </DialogTitle>
            <DialogDescription>
              Personal con turno asignado para el día de hoy
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            {detalleRol === null ? (
              // Mostrar todos agrupados por rol
              <div className="space-y-4">
                {['medico', 'tens', 'paramedico'].map(rol => {
                  const personal = personalEnTurno?.por_rol?.[rol] || []
                  if (personal.length === 0) return null
                  return (
                    <div key={rol}>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <Users className={`h-4 w-4 ${
                          rol === 'medico' ? 'text-blue-400' : 
                          rol === 'tens' ? 'text-green-400' : 'text-orange-400'
                        }`} />
                        {getRolLabel(rol)} ({personal.length})
                      </h3>
                      <div className="space-y-2">
                        {personal.map((persona, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${persona.esta_en_horario ? 'bg-green-500' : 'bg-slate-500'}`} />
                              <span className="font-medium">{persona.nombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${getTurnoColor(persona.tipo_turno)} text-white`}>
                                {persona.tipo_turno_display}
                              </span>
                              {persona.es_voluntario && (
                                <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-400">
                                  Voluntario
                                </span>
                              )}
                              {persona.esta_en_horario && (
                                <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                  Activo
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {Object.values(personalEnTurno?.por_rol || {}).every(arr => arr.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay personal con turno asignado para hoy
                  </p>
                )}
              </div>
            ) : (
              // Mostrar solo un rol
              <div className="space-y-2">
                {getPersonalPorRol(detalleRol).map((persona, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${persona.esta_en_horario ? 'bg-green-500' : 'bg-slate-500'}`} />
                      <span className="font-medium">{persona.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${getTurnoColor(persona.tipo_turno)} text-white`}>
                        {persona.tipo_turno_display}
                      </span>
                      {persona.es_voluntario && (
                        <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-400">
                          Voluntario
                        </span>
                      )}
                      {persona.esta_en_horario && (
                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                          Activo
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {getPersonalPorRol(detalleRol).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay {getRolLabel(detalleRol).toLowerCase()} con turno asignado para hoy
                  </p>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDetalleOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
