import { useState, useEffect, useCallback } from 'react'
import { turnosAPI } from '@/lib/api'

export interface TurnoInfo {
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

export function useTurno(rol: string) {
  const [turnoInfo, setTurnoInfo] = useState<TurnoInfo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [yaVerificado, setYaVerificado] = useState(false)

  // Solo verificar turno para roles que tienen turnos (no admin)
  const necesitaTurno = rol !== 'administrador'

  const verificarTurno = useCallback(async () => {
    if (!necesitaTurno) {
      setCargando(false)
      return
    }

    try {
      const info = await turnosAPI.miTurno()
      setTurnoInfo(info)
      
      // Si no está en turno y es primera verificación, mostrar modal
      if (!info.en_turno && !yaVerificado) {
        setMostrarModal(true)
      }
      
      setYaVerificado(true)
    } catch (error) {
      console.error('Error verificando turno:', error)
    } finally {
      setCargando(false)
    }
  }, [necesitaTurno, yaVerificado])

  useEffect(() => {
    verificarTurno()
  }, [verificarTurno])

  const iniciarTurno = async () => {
    try {
      if (turnoInfo?.tiene_turno_programado && turnoInfo?.en_horario) {
        await turnosAPI.iniciarTurno()
      } else {
        await turnosAPI.iniciarVoluntario()
      }
      // Actualizar info
      const newInfo = await turnosAPI.miTurno()
      setTurnoInfo(newInfo)
      setMostrarModal(false)
    } catch (error) {
      console.error('Error iniciando turno:', error)
      throw error
    }
  }

  const finalizarTurno = async () => {
    try {
      await turnosAPI.finalizarTurno()
      const newInfo = await turnosAPI.miTurno()
      setTurnoInfo(newInfo)
    } catch (error) {
      console.error('Error finalizando turno:', error)
      throw error
    }
  }

  const cerrarModal = () => {
    setMostrarModal(false)
  }

  return {
    turnoInfo,
    cargando,
    mostrarModal,
    enTurno: turnoInfo?.en_turno ?? false,
    necesitaTurno,
    iniciarTurno,
    finalizarTurno,
    cerrarModal,
    verificarTurno,
  }
}
