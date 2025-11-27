import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, AlertTriangle, CheckCircle, Coffee } from 'lucide-react'
import { turnosAPI } from '@/lib/api'

interface TurnoInfo {
  tiene_turno_programado: boolean
  turno_actual: {
    id: number
    tipo_turno: string
    tipo_turno_display: string
    horario: { inicio: string; fin: string } | null
    en_turno: boolean
    es_voluntario: boolean
  } | null
  en_horario: boolean
  en_turno: boolean
  puede_iniciar_voluntario: boolean
  mensaje: string
}

interface ModalTurnoProps {
  open: boolean
  turnoInfo: TurnoInfo | null
  onTurnoIniciado: () => void
  onSalir: () => void
}

export function ModalTurno({ open, turnoInfo, onTurnoIniciado, onSalir }: ModalTurnoProps) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleIniciarTurno = async () => {
    setCargando(true)
    setError(null)
    try {
      if (turnoInfo?.tiene_turno_programado && turnoInfo?.en_horario) {
        // Turno programado en horario
        await turnosAPI.iniciarTurno()
      } else {
        // Turno voluntario
        await turnosAPI.iniciarVoluntario()
      }
      onTurnoIniciado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar turno')
    } finally {
      setCargando(false)
    }
  }

  const handleNoTrabajar = () => {
    onSalir()
  }

  if (!turnoInfo) return null

  // Si ya está en turno, no mostrar modal
  if (turnoInfo.en_turno) {
    return null
  }

  // Determinar el tipo de situación
  const esDescanso = turnoInfo.turno_actual?.tipo_turno === 'DESCANSO'
  const tieneTurnoPeroFueraDeHorario = turnoInfo.tiene_turno_programado && !turnoInfo.en_horario && !esDescanso
  const noTieneTurno = !turnoInfo.tiene_turno_programado
  const tieneTurnoEnHorario = turnoInfo.tiene_turno_programado && turnoInfo.en_horario

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {esDescanso && (
              <>
                <Coffee className="h-5 w-5 text-blue-500" />
                Día de Descanso
              </>
            )}
            {tieneTurnoPeroFueraDeHorario && (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Fuera de Horario
              </>
            )}
            {noTieneTurno && (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Sin Turno Programado
              </>
            )}
            {tieneTurnoEnHorario && (
              <>
                <Clock className="h-5 w-5 text-green-500" />
                Turno Disponible
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-left pt-2">
            {esDescanso && (
              <>Hoy es tu día de descanso programado. No tienes obligación de trabajar.</>
            )}
            
            {tieneTurnoPeroFueraDeHorario && turnoInfo.turno_actual && (
              <>
                Tu turno programado es <strong>{turnoInfo.turno_actual.tipo_turno_display}</strong>
                {turnoInfo.turno_actual.horario && (
                  <> ({turnoInfo.turno_actual.horario.inicio} - {turnoInfo.turno_actual.horario.fin})</>
                )}, pero la hora actual está fuera de ese horario.
              </>
            )}
            
            {noTieneTurno && (
              <>No tienes ningún turno programado para hoy en el sistema.</>
            )}
            
            {tieneTurnoEnHorario && turnoInfo.turno_actual && (
              <>
                Tienes turno <strong>{turnoInfo.turno_actual.tipo_turno_display}</strong>
                {turnoInfo.turno_actual.horario && (
                  <> ({turnoInfo.turno_actual.horario.inicio} - {turnoInfo.turno_actual.horario.fin})</>
                )}. Presiona el botón para iniciar tu jornada.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!tieneTurnoEnHorario && (
            <p className="font-medium text-foreground">
              ¿Deseas trabajar de todas formas?
            </p>
          )}

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">ℹ️ Información:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Si inicias turno, recibirás notificaciones de urgencias</li>
              <li>El sistema registrará tu hora de entrada</li>
              {!turnoInfo.tiene_turno_programado && (
                <li>Este turno se registrará como voluntario</li>
              )}
            </ul>
          </div>

          {error && (
            <p className="text-destructive text-sm bg-destructive/10 p-2 rounded">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleNoTrabajar}
            disabled={cargando}
            className="w-full sm:w-auto"
          >
            No, salir
          </Button>
          <Button
            onClick={handleIniciarTurno}
            disabled={cargando}
            className="w-full sm:w-auto"
          >
            {cargando ? (
              'Iniciando...'
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {tieneTurnoEnHorario ? 'Iniciar Turno' : 'Sí, quiero trabajar'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
