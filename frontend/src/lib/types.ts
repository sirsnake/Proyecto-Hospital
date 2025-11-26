export interface Paciente {
  id: string
  rut?: string
  nombres: string
  apellidos: string
  fechaNacimiento?: string
  sexo: "Masculino" | "Femenino"
  telefono?: string
  direccion?: string
  esNN: boolean
  idTemporal?: string
}

export interface SignosVitales {
  presionSistolica: number
  presionDiastolica: number
  frecuenciaCardiaca: number
  frecuenciaRespiratoria: number
  saturacionO2: number
  temperatura: number
  glucosa?: number
  escalaGlasgow?: number
  eva?: number // Escala de dolor 0-10
  timestamp: string
  ubicacionGPS?: string
}

export interface SolicitudMedicamento {
  id: string
  medicamento: string
  dosis: string
  justificacion: string
  estado: "pendiente" | "autorizado" | "rechazado"
  paramedico: string
  medico?: string
  respuesta?: string
  fechaSolicitud: string
  fechaRespuesta?: string
}

export interface FichaEmergencia {
  id: string
  paciente: Paciente
  motivoConsulta: string
  circunstancias: string
  signosVitales: SignosVitales
  sintomas: string
  nivelConsciencia: string
  imagenes?: string[]
  paramedico: string
  fechaRegistro: string
  estado: "en_ruta" | "en_hospital" | "atendido"
  eta?: string
  prioridad: "C1" | "C2" | "C3" | "C4" | "C5"
  solicitudesMedicamentos?: SolicitudMedicamento[]
  anamnesis?: Anamnesis
  diagnostico?: Diagnostico
}

export interface Anamnesis {
  id: string
  fichaId: string
  historiaEnfermedadActual: string
  antecedentesMedicos: string
  alergiasMedicamentosas: string[]
  medicamentosHabituales: string
  antecedentesQuirurgicos: string
  observaciones: string
  tens: string
  fechaCreacion: string
  alergiasCriticas: boolean
}

export interface Diagnostico {
  id: string
  fichaId: string
  diagnosticoCIE10: string
  descripcion: string
  indicacionesMedicas: string
  medicamentosPrescritos: string
  medico: string
  fechaDiagnostico: string
}
