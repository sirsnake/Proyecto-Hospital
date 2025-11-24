"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSession } from "@/lib/auth"
import { pacientesAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function HistorialPaciente() {
  const router = useRouter()
  const params = useParams()
  const pacienteId = params?.id as string
  
  const [user, setUser] = useState<any>(null)
  const [paciente, setPaciente] = useState<any>(null)
  const [fichas, setFichas] = useState<any[]>([])
  const [totalAtenciones, setTotalAtenciones] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const initAuth = async () => {
      const session = await getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUser(session)
      cargarHistorial()
    }
    initAuth()
  }, [router, pacienteId])

  const cargarHistorial = async () => {
    try {
      setLoading(true)
      setError("")
      
      const data = await pacientesAPI.historial(parseInt(pacienteId))
      
      setPaciente(data.paciente)
      setFichas(data.fichas || [])
      setTotalAtenciones(data.total_atenciones || 0)
    } catch (err: any) {
      console.error('Error al cargar historial:', err)
      setError(err.message || "Error al cargar historial del paciente")
    } finally {
      setLoading(false)
    }
  }

  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return "N/A"
    const hoy = new Date()
    const nacimiento = new Date(fechaNacimiento)
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return edad
  }

  const getEstadoBadge = (estado: string) => {
    const estados: { [key: string]: string } = {
      'en_ruta': 'bg-blue-500',
      'en_hospital': 'bg-yellow-500',
      'atendido': 'bg-green-500'
    }
    return estados[estado] || 'bg-slate-500'
  }

  const getPrioridadBadge = (prioridad: string) => {
    const prioridades: { [key: string]: string } = {
      'C1': 'bg-red-500',
      'C2': 'bg-orange-500',
      'C3': 'bg-yellow-500',
      'C4': 'bg-green-500',
      'C5': 'bg-slate-500'
    }
    return prioridades[prioridad] || 'bg-slate-500'
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="border-slate-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver
              </Button>
              <h1 className="text-2xl font-bold text-white">
                📋 Historial Clínico
              </h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">{user.email}</p>
              <p className="text-xs text-slate-500">{user.rol}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-400">Cargando historial...</p>
            </div>
          </div>
        ) : paciente ? (
          <>
            {/* Información del Paciente */}
            <Card className="border-slate-800 bg-slate-900/50 mb-6">
              <CardHeader>
                <CardTitle className="text-white text-2xl">
                  {paciente.es_nn 
                    ? `Paciente NN - ${paciente.id_temporal || 'Sin ID'}` 
                    : `${paciente.nombres} ${paciente.apellidos}`
                  }
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Total de atenciones registradas: {totalAtenciones}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {!paciente.es_nn && paciente.rut && (
                    <div>
                      <p className="text-slate-400">RUT</p>
                      <p className="text-white font-semibold">{paciente.rut}</p>
                    </div>
                  )}
                  {paciente.fecha_nacimiento && (
                    <div>
                      <p className="text-slate-400">Edad</p>
                      <p className="text-white font-semibold">{calcularEdad(paciente.fecha_nacimiento)} años</p>
                    </div>
                  )}
                  {paciente.es_nn && paciente.edad_aproximada && (
                    <div>
                      <p className="text-slate-400">Edad Aproximada</p>
                      <p className="text-white font-semibold">~{paciente.edad_aproximada}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-400">Sexo</p>
                    <p className="text-white font-semibold">
                      {paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Femenino' : 'Otro'}
                    </p>
                  </div>
                  {paciente.telefono && (
                    <div>
                      <p className="text-slate-400">Teléfono</p>
                      <p className="text-white font-semibold">{paciente.telefono}</p>
                    </div>
                  )}
                  {paciente.direccion && (
                    <div className="col-span-2">
                      <p className="text-slate-400">Dirección</p>
                      <p className="text-white font-semibold">{paciente.direccion}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fichas de Atención */}
            {fichas.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <p className="text-slate-400">No hay registros de atenciones para este paciente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {fichas.map((ficha, index) => (
                  <Card key={ficha.id} className="border-slate-800 bg-slate-900/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            🏥 Atención #{fichas.length - index}
                            <Badge className={getEstadoBadge(ficha.estado)}>
                              {ficha.estado === 'en_ruta' ? 'En Ruta' : ficha.estado === 'en_hospital' ? 'En Hospital' : 'Atendido'}
                            </Badge>
                            <Badge className={getPrioridadBadge(ficha.nivel_prioridad)}>
                              {ficha.nivel_prioridad}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-slate-400 mt-1">
                            {new Date(ficha.fecha_creacion).toLocaleString('es-CL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Motivo de Consulta */}
                      <div className="p-3 bg-slate-800/30 rounded-lg">
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">Motivo de Consulta</h4>
                        <p className="text-white">{ficha.motivo_consulta}</p>
                        {ficha.circunstancias && (
                          <>
                            <h4 className="text-sm font-semibold text-slate-300 mt-3 mb-2">Circunstancias</h4>
                            <p className="text-white">{ficha.circunstancias}</p>
                          </>
                        )}
                      </div>

                      {/* Paramédico */}
                      <div className="text-sm">
                        <span className="text-slate-400">Paramédico:</span>{" "}
                        <span className="text-white">{ficha.paramedico_nombre}</span>
                      </div>

                      {/* Signos Vitales */}
                      {ficha.signos_vitales && ficha.signos_vitales.length > 0 && (
                        <div className="space-y-2">
                          {ficha.signos_vitales.map((signos: any, idx: number) => (
                            <div key={signos.id} className="p-3 bg-slate-800/30 rounded-lg">
                              <h4 className="text-sm font-semibold text-slate-300 mb-2">
                                {idx === 0 ? '📋 Signos Vitales - Paramédico' : `📊 Signos Vitales - TENS (Medición ${idx})`}
                                <span className="ml-2 text-slate-500">
                                  {new Date(signos.timestamp).toLocaleString('es-CL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </h4>
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                <div>
                                  <p className="text-slate-500">PA</p>
                                  <p className="text-white font-semibold">{signos.presion_sistolica}/{signos.presion_diastolica}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">FC</p>
                                  <p className="text-white font-semibold">{signos.frecuencia_cardiaca}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">FR</p>
                                  <p className="text-white font-semibold">{signos.frecuencia_respiratoria}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">SatO₂</p>
                                  <p className="text-white font-semibold">{signos.saturacion_o2}%</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Temp</p>
                                  <p className="text-white font-semibold">{signos.temperatura}°C</p>
                                </div>
                                {signos.escala_glasgow && (
                                  <div>
                                    <p className="text-slate-500">Glasgow</p>
                                    <p className="text-white font-semibold">{signos.escala_glasgow}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Medicamentos Solicitados */}
                      {ficha.solicitudes_medicamentos && ficha.solicitudes_medicamentos.length > 0 && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <h4 className="text-sm font-semibold text-blue-300 mb-2">💊 Medicamentos Solicitados</h4>
                          {ficha.solicitudes_medicamentos.map((med: any) => (
                            <div key={med.id} className="text-sm mb-2 last:mb-0">
                              <span className="text-white font-semibold">{med.medicamento_solicitado}</span>
                              <span className="text-slate-400"> - Dosis: {med.dosis}</span>
                              <Badge className={med.estado === 'autorizado' ? 'bg-green-500 ml-2' : med.estado === 'rechazado' ? 'bg-red-500 ml-2' : 'bg-yellow-500 ml-2'}>
                                {med.estado}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Anamnesis */}
                      {ficha.anamnesis && (
                        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                          <h4 className="text-sm font-semibold text-purple-300 mb-2">📝 Anamnesis (TENS)</h4>
                          {ficha.anamnesis.antecedentes_medicos && (
                            <p className="text-sm text-white mb-1">
                              <span className="text-slate-400">Antecedentes:</span> {ficha.anamnesis.antecedentes_medicos}
                            </p>
                          )}
                          {ficha.anamnesis.alergias_criticas && (
                            <p className="text-sm text-red-400 mb-1">
                              <span className="font-semibold">⚠️ Alergias:</span> {ficha.anamnesis.alergias_medicamentosas?.join(', ')}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Exámenes Solicitados */}
                      {ficha.solicitudes_examenes && ficha.solicitudes_examenes.length > 0 && (
                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                          <h4 className="text-sm font-semibold text-cyan-300 mb-2">🧪 Exámenes Solicitados</h4>
                          {ficha.solicitudes_examenes.map((examen: any) => (
                            <div key={examen.id} className="text-sm mb-2 last:mb-0">
                              <span className="text-white font-semibold">{examen.tipo_examen}</span>
                              <Badge className={examen.estado === 'completado' ? 'bg-green-500 ml-2' : examen.estado === 'en_proceso' ? 'bg-yellow-500 ml-2' : 'bg-slate-500 ml-2'}>
                                {examen.estado}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Diagnóstico */}
                      {ficha.diagnostico && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          <h4 className="text-sm font-semibold text-emerald-300 mb-2">✅ Diagnóstico Médico</h4>
                          <p className="text-sm text-white mb-1">
                            <span className="text-slate-400">CIE-10:</span> {ficha.diagnostico.codigo_cie10}
                          </p>
                          <p className="text-sm text-white mb-1">
                            <span className="text-slate-400">Diagnóstico:</span> {ficha.diagnostico.descripcion}
                          </p>
                          {ficha.diagnostico.indicaciones_medicas && (
                            <p className="text-sm text-white mb-1">
                              <span className="text-slate-400">Indicaciones:</span> {ficha.diagnostico.indicaciones_medicas}
                            </p>
                          )}
                          <p className="text-sm text-slate-400 mt-2">
                            Por: {ficha.diagnostico.medico_nombre} • {new Date(ficha.diagnostico.fecha_diagnostico).toLocaleString('es-CL')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="py-12 text-center">
              <p className="text-slate-400">No se pudo cargar la información del paciente</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
