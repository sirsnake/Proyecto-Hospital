import type { FichaEmergencia, Paciente, SolicitudMedicamento } from "./types"

export const PACIENTES_MOCK: Paciente[] = [
  {
    id: "p1",
    rut: "16.789.456-3",
    nombres: "Pedro",
    apellidos: "Ramírez González",
    fechaNacimiento: "1985-03-15",
    sexo: "Masculino",
    telefono: "+56912345678",
    direccion: "Av. Libertador 1234, Santiago",
    esNN: false,
  },
  {
    id: "p2",
    nombres: "Paciente",
    apellidos: "NN",
    sexo: "Femenino",
    esNN: true,
    idTemporal: "NN-2025-001",
  },
]

export const FICHAS_MOCK: FichaEmergencia[] = [
  {
    id: "f1",
    paciente: PACIENTES_MOCK[0],
    motivoConsulta: "Dolor torácico intenso hace 30 minutos",
    circunstancias: "Paciente en domicilio, refiere dolor opresivo en pecho irradiado a brazo izquierdo",
    signosVitales: {
      presionSistolica: 160,
      presionDiastolica: 95,
      frecuenciaCardiaca: 110,
      frecuenciaRespiratoria: 24,
      saturacionO2: 92,
      temperatura: 36.8,
      glucosa: 145,
      escalaGlasgow: 15,
      timestamp: "2025-11-01T13:45:00",
      ubicacionGPS: "-33.4489, -70.6693",
    },
    sintomas: "Dolor torácico, diaforesis, náuseas",
    nivelConsciencia: "Consciente, orientado en tiempo y espacio",
    paramedico: "Carlos Muñoz",
    fechaRegistro: "2025-11-01T13:45:00",
    estado: "en_ruta",
    eta: "15 minutos",
    prioridad: "rojo",
    solicitudesMedicamentos: [
      {
        id: "sm1",
        medicamento: "Aspirina 300mg",
        dosis: "300mg vía oral",
        justificacion: "Sospecha de síndrome coronario agudo, paciente sin contraindicaciones",
        estado: "pendiente",
        paramedico: "Carlos Muñoz",
        fechaSolicitud: "2025-11-01T13:50:00",
      },
    ],
  },
  {
    id: "f2",
    paciente: PACIENTES_MOCK[1],
    motivoConsulta: "Encontrada inconsciente en vía pública",
    circunstancias: "Paciente femenina aproximadamente 30 años, encontrada inconsciente, sin documentación",
    signosVitales: {
      presionSistolica: 90,
      presionDiastolica: 60,
      frecuenciaCardiaca: 55,
      frecuenciaRespiratoria: 10,
      saturacionO2: 88,
      temperatura: 35.5,
      escalaGlasgow: 8,
      timestamp: "2025-11-01T14:00:00",
      ubicacionGPS: "-33.4372, -70.6506",
    },
    sintomas: "Inconsciencia, hipotermia, bradicardia",
    nivelConsciencia: "Glasgow 8 (O2, V2, M4)",
    paramedico: "Carlos Muñoz",
    fechaRegistro: "2025-11-01T14:00:00",
    estado: "en_ruta",
    eta: "8 minutos",
    prioridad: "rojo",
  },
  {
    id: "f3",
    paciente: {
      id: "p3",
      rut: "18.234.567-8",
      nombres: "María",
      apellidos: "López Fernández",
      fechaNacimiento: "1992-07-22",
      sexo: "Femenino",
      telefono: "+56987654321",
      esNN: false,
    },
    motivoConsulta: "Fractura de tobillo por caída",
    circunstancias: "Caída en escaleras, dolor intenso en tobillo derecho, imposibilidad de apoyo",
    signosVitales: {
      presionSistolica: 125,
      presionDiastolica: 80,
      frecuenciaCardiaca: 88,
      frecuenciaRespiratoria: 18,
      saturacionO2: 98,
      temperatura: 36.5,
      escalaGlasgow: 15,
      timestamp: "2025-11-01T12:30:00",
      ubicacionGPS: "-33.4569, -70.6483",
    },
    sintomas: "Dolor intenso tobillo derecho, edema, imposibilidad de movimiento",
    nivelConsciencia: "Consciente, orientada",
    paramedico: "Carlos Muñoz",
    fechaRegistro: "2025-11-01T12:30:00",
    estado: "en_hospital",
    prioridad: "amarillo",
    anamnesis: {
      id: "a1",
      fichaId: "f3",
      historiaEnfermedadActual: "Paciente refiere caída en escaleras hace 2 horas, dolor inmediato en tobillo derecho",
      antecedentesMorbidos: "Hipertensión arterial en tratamiento",
      alergiasMedicamentosas: ["Penicilina"],
      medicamentosHabituales: "Enalapril 10mg cada 12 horas",
      antecedentesQuirurgicos: "Cesárea hace 3 años",
      observaciones: "Paciente estable, dolor controlado con analgesia",
      tens: "María González",
      fechaCreacion: "2025-11-01T13:00:00",
      alergiasCriticas: true,
    },
  },
]

export function getFichasPorEstado(estado: FichaEmergencia["estado"]): FichaEmergencia[] {
  return FICHAS_MOCK.filter((f) => f.estado === estado)
}

export function getFichasPendientesAutorizacion(): SolicitudMedicamento[] {
  const solicitudes: SolicitudMedicamento[] = []
  FICHAS_MOCK.forEach((ficha) => {
    if (ficha.solicitudesMedicamentos) {
      ficha.solicitudesMedicamentos.filter((s) => s.estado === "pendiente").forEach((s) => solicitudes.push(s))
    }
  })
  return solicitudes
}
