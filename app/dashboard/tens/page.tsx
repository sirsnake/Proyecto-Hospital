"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/auth"
import { authAPI, fichasAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function TensDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("ambulancias")
  const [selectedPaciente, setSelectedPaciente] = useState<string | null>(null)
  const [fichasEnRuta, setFichasEnRuta] = useState<any[]>([])
  const [fichasEnHospital, setFichasEnHospital] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "tens") {
      router.push("/")
      return
    }
    setUser(currentUser)
    cargarFichas()
    
    // Recargar fichas cada 60 segundos
    const interval = setInterval(cargarFichas, 60000)
    return () => clearInterval(interval)
  }, [router])

  const cargarFichas = async () => {
    try {
      setLoading(true)
      setError("")
      
      // Cargar fichas en ruta
      const enRuta = await fichasAPI.enRuta()
      console.log('🚑 Fichas en ruta:', enRuta)
      setFichasEnRuta(Array.isArray(enRuta) ? enRuta : [])
      
      // Cargar fichas en hospital
      const enHospital = await fichasAPI.enHospital()
      console.log('🏥 Fichas en hospital:', enHospital)
      setFichasEnHospital(Array.isArray(enHospital) ? enHospital : [])
      
      console.log(`📊 Total: ${enRuta.length || 0} en ruta, ${enHospital.length || 0} en hospital`)
    } catch (err: any) {
      console.error('Error al cargar fichas:', err)
      setError(err.message || "Error al cargar fichas")
      setFichasEnRuta([])
      setFichasEnHospital([])
    } finally {
      setLoading(false)
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
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Sistema de Urgencias</h1>
              <p className="text-sm text-slate-400">TENS: {user.nombre_completo || user.first_name + ' ' + user.last_name}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await authAPI.logout()
              } catch (error) {
                console.error('Error al cerrar sesión:', error)
              } finally {
                localStorage.removeItem("medical_system_user")
                router.push("/")
              }
            }}
          >
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="ambulancias">
              Ambulancias en Ruta
              {fichasEnRuta.length > 0 && <Badge className="ml-2 bg-red-500">{fichasEnRuta.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="hospital">En Hospital</TabsTrigger>
          </TabsList>

          <TabsContent value="ambulancias" className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {loading && fichasEnRuta.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Cargando fichas...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <svg className="w-6 h-6 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-500">Alerta: {fichasEnRuta.length} ambulancia(s) en ruta</p>
                    <p className="text-sm text-slate-400">Monitoreo en tiempo real - Preparar recepción de pacientes</p>
                  </div>
                  <Button 
                    onClick={cargarFichas} 
                    disabled={loading}
                    variant="outline" 
                    size="sm"
                    className="ml-auto"
                  >
                    {loading ? "Actualizando..." : "Actualizar"}
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
                      <Card key={ficha.id} className="border-slate-800 bg-slate-900/50">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                                {ficha.paciente?.es_nn 
                                  ? `Paciente NN (${ficha.paciente.id_temporal})`
                                  : `${ficha.paciente?.nombres || 'Sin nombre'} ${ficha.paciente?.apellidos || ''}`
                                }
                              </CardTitle>
                              <CardDescription className="text-slate-400 mt-1">
                                {ficha.paciente?.sexo} • {calcularEdad(ficha.paciente)} años • Paramédico: {ficha.paramedico_nombre || 'N/A'}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={getPrioridadColor(ficha.prioridad)}>
                                {getPrioridadLabel(ficha.prioridad)}
                              </Badge>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-white">ETA: {ficha.eta}</p>
                                <p className="text-xs text-slate-400">Tiempo estimado</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-white mb-2">Motivo de Consulta:</h4>
                            <p className="text-sm text-slate-300">{ficha.motivo_consulta}</p>
                          </div>

                          {ficha.circunstancias && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">Circunstancias:</h4>
                              <p className="text-sm text-slate-300">{ficha.circunstancias}</p>
                            </div>
                          )}

                          {signosVitales && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">Signos Vitales (Paramédico):</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">Presión Arterial</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.presion}</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">FC</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.fc} lpm</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">FR</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.fr} rpm</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">SatO₂</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.sato2}</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">Temperatura</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.temperatura}</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <p className="text-xs text-slate-400">Glasgow</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.glasgow}</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg col-span-2">
                                  <p className="text-xs text-slate-400">EVA (Escala de Dolor)</p>
                                  <p className="text-lg font-semibold text-white">{signosVitales.eva}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-sm text-blue-400">
                              📋 Ambulancia en tránsito - Los datos se actualizan automáticamente cada 30 segundos
                            </p>
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
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Pacientes en Hospital</CardTitle>
                <CardDescription className="text-slate-400">
                  Verifique signos vitales de pacientes que llegaron al hospital
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fichasEnHospital.map((ficha) => {
                    const signosFormateados = formatearSignosVitales(ficha.signos_vitales)
                    const edad = calcularEdad(ficha.paciente)
                    const nombrePaciente = ficha.paciente.es_nn 
                      ? `NN - ${ficha.paciente.id_temporal || 'Sin ID'}`
                      : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`
                    
                    return (
                      <div key={ficha.id} className="p-4 border border-slate-700 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-white">{nombrePaciente}</h3>
                            <p className="text-sm text-slate-400">
                              {edad} • Llegó: {new Date(ficha.fecha_actualizacion).toLocaleString('es-CL')}
                            </p>
                          </div>
                          <Badge className={getPrioridadColor(ficha.nivel_prioridad)}>
                            {getPrioridadLabel(ficha.nivel_prioridad)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300 mb-3">{ficha.motivo_consulta}</p>

                        {/* Signos vitales iniciales */}
                        {signosFormateados ? (
                          <div className="mb-4 p-3 bg-slate-800/30 rounded-lg">
                            <p className="text-xs font-semibold text-slate-400 mb-2">
                              Signos Vitales (Paramédico):
                            </p>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                              <div>
                                <p className="text-slate-500">PA</p>
                                <p className="text-white font-semibold">{signosFormateados.presion}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">FC</p>
                                <p className="text-white font-semibold">{signosFormateados.fc}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">FR</p>
                                <p className="text-white font-semibold">{signosFormateados.fr}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">SatO₂</p>
                              <p className="text-white font-semibold">{signosFormateados.sato2}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Temp</p>
                                <p className="text-white font-semibold">{signosFormateados.temperatura}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">EVA</p>
                                <p className="text-white font-semibold">{signosFormateados.eva}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <p className="text-sm text-amber-500">⚠️ Sin signos vitales registrados</p>
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => setSelectedPaciente(ficha.id)}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          Verificar Signos Vitales
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedPaciente && (
              <Card className="border-blue-500/30 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="text-white">Verificación de Signos Vitales en Hospital</CardTitle>
                  <CardDescription className="text-slate-400">
                    Registre los signos vitales actualizados del paciente al llegar al hospital
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="presion-hosp" className="text-slate-300">
                        Presión Arterial (mmHg)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="presion-sistolica-hosp"
                          placeholder="120"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                        <span className="text-slate-400 flex items-center">/</span>
                        <Input
                          id="presion-diastolica-hosp"
                          placeholder="80"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fc-hosp" className="text-slate-300">
                        Frecuencia Cardíaca (lpm)
                      </Label>
                      <Input
                        id="fc-hosp"
                        type="number"
                        placeholder="75"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fr-hosp" className="text-slate-300">
                        Frecuencia Respiratoria (rpm)
                      </Label>
                      <Input
                        id="fr-hosp"
                        type="number"
                        placeholder="16"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sato2-hosp" className="text-slate-300">
                        Saturación O₂ (%)
                      </Label>
                      <Input
                        id="sato2-hosp"
                        type="number"
                        placeholder="98"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temperatura-hosp" className="text-slate-300">
                        Temperatura (°C)
                      </Label>
                      <Input
                        id="temperatura-hosp"
                        type="number"
                        step="0.1"
                        placeholder="36.5"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="glasgow-hosp" className="text-slate-300">
                        Escala de Glasgow
                      </Label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 - Consciente</SelectItem>
                          <SelectItem value="14">14 - Confuso</SelectItem>
                          <SelectItem value="13">13 - Verbal inapropiado</SelectItem>
                          <SelectItem value="8">8 - Semiconsciente</SelectItem>
                          <SelectItem value="3">3 - Inconsciente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eva-hosp" className="text-slate-300">
                      EVA - Escala Visual Análoga del Dolor
                    </Label>
                    <Select>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Seleccionar nivel de dolor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Sin dolor</SelectItem>
                        <SelectItem value="1">1/10 - Dolor leve</SelectItem>
                        <SelectItem value="2">2/10 - Dolor leve</SelectItem>
                        <SelectItem value="3">3/10 - Dolor leve</SelectItem>
                        <SelectItem value="4">4/10 - Dolor moderado</SelectItem>
                        <SelectItem value="5">5/10 - Dolor moderado</SelectItem>
                        <SelectItem value="6">6/10 - Dolor moderado</SelectItem>
                        <SelectItem value="7">7/10 - Dolor severo</SelectItem>
                        <SelectItem value="8">8/10 - Dolor severo</SelectItem>
                        <SelectItem value="9">9/10 - Dolor severo</SelectItem>
                        <SelectItem value="10">10/10 - Dolor insoportable</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400">0-3: Leve • 4-6: Moderado • 7-10: Severo</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar Verificación
                    </Button>
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => setSelectedPaciente(null)}
                    >
                      Cancelar
                    </Button>
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-400">
                      💡 Esta verificación se registra automáticamente en la ficha del paciente
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
