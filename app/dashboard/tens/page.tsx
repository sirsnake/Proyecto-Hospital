"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/auth"
import { authAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function TensDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("ambulancias")
  const [selectedPaciente, setSelectedPaciente] = useState<string | null>(null)

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "tens") {
      router.push("/")
      return
    }
    setUser(currentUser)
  }, [router])

  if (!user) return null

  const ambulanciasEnRuta = [
    {
      id: "f1",
      paciente: "Pedro Ramírez González",
      edad: 40,
      sexo: "Masculino",
      motivo: "Dolor torácico intenso hace 30 minutos",
      prioridad: "C1",
      eta: "15 minutos",
      paramedico: "Carlos Muñoz",
      signosVitales: {
        presion: "160/95",
        fc: "110",
        fr: "24",
        sato2: "92%",
        temperatura: "36.8°C",
        glasgow: "15",
        eva: "8/10",
      },
    },
    {
      id: "f2",
      paciente: "Paciente NN-2025-001",
      edad: "~30",
      sexo: "Femenino",
      motivo: "Encontrada inconsciente en vía pública",
      prioridad: "C1",
      eta: "8 minutos",
      paramedico: "Carlos Muñoz",
      signosVitales: {
        presion: "90/60",
        fc: "55",
        fr: "10",
        sato2: "88%",
        temperatura: "35.5°C",
        glasgow: "8",
        eva: "N/A",
      },
    },
  ]

  const pacientesEnHospital = [
    {
      id: "f3",
      paciente: "María López Fernández",
      edad: 33,
      motivo: "Fractura de tobillo por caída",
      prioridad: "C3",
      tiempoLlegada: "Hace 30 minutos",
      signosVitalesIniciales: {
        presion: "120/80",
        fc: "85",
        fr: "18",
        sato2: "98%",
        temperatura: "36.5°C",
        eva: "7/10",
      },
    },
  ]

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
              {ambulanciasEnRuta.length > 0 && <Badge className="ml-2 bg-red-500">{ambulanciasEnRuta.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="hospital">En Hospital</TabsTrigger>
          </TabsList>

          <TabsContent value="ambulancias" className="space-y-6">
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
                <p className="font-semibold text-red-500">Alerta: {ambulanciasEnRuta.length} ambulancia(s) en ruta</p>
                <p className="text-sm text-slate-400">Monitoreo en tiempo real - Preparar recepción de pacientes</p>
              </div>
            </div>

            <div className="grid gap-6">
              {ambulanciasEnRuta.map((ambulancia) => (
                <Card key={ambulancia.id} className="border-slate-800 bg-slate-900/50">
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
                          {ambulancia.paciente}
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-1">
                          {ambulancia.sexo} • {ambulancia.edad} años • Paramédico: {ambulancia.paramedico}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getPrioridadColor(ambulancia.prioridad)}>
                          {getPrioridadLabel(ambulancia.prioridad)}
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">ETA: {ambulancia.eta}</p>
                          <p className="text-xs text-slate-400">Tiempo estimado</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Motivo de Consulta:</h4>
                      <p className="text-sm text-slate-300">{ambulancia.motivo}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Signos Vitales (Paramédico):</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400">Presión Arterial</p>
                          <p className="text-lg font-semibold text-white">{ambulancia.signosVitales.presion}</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400">FC</p>
                          <p className="text-lg font-semibold text-white">{ambulancia.signosVitales.fc} lpm</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400">FR</p>
                          <p className="text-lg font-semibold text-white">{ambulancia.signosVitales.fr} rpm</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400">SatO₂</p>
                          <p className="text-lg font-semibold text-white">{ambulancia.signosVitales.sato2}</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400">Temperatura</p>
                          <p className="text-lg font-semibold text-white">{ambulancia.signosVitales.temperatura}</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400">Glasgow</p>
                          <p className="text-lg font-semibold text-white">{ambulancia.signosVitales.glasgow}</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg col-span-2">
                          <p className="text-xs text-slate-400">EVA (Escala de Dolor)</p>
                          <p className="text-lg font-semibold text-white">{ambulancia.signosVitales.eva}</p>
                          <p className="text-xs text-slate-400">
                            {ambulancia.signosVitales.eva !== "N/A" &&
                              (Number.parseInt(ambulancia.signosVitales.eva) <= 3
                                ? "Dolor leve"
                                : Number.parseInt(ambulancia.signosVitales.eva) <= 6
                                  ? "Dolor moderado"
                                  : "Dolor severo")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-sm text-blue-400">
                        📋 Ambulancia en tránsito - Los datos se actualizan automáticamente
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                  {pacientesEnHospital.map((paciente) => (
                    <div key={paciente.id} className="p-4 border border-slate-700 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white">{paciente.paciente}</h3>
                          <p className="text-sm text-slate-400">
                            {paciente.edad} años • {paciente.tiempoLlegada}
                          </p>
                        </div>
                        <Badge className={getPrioridadColor(paciente.prioridad)}>
                          {getPrioridadLabel(paciente.prioridad)}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-300 mb-3">{paciente.motivo}</p>

                      {/* Signos vitales iniciales */}
                      <div className="mb-4 p-3 bg-slate-800/30 rounded-lg">
                        <p className="text-xs font-semibold text-slate-400 mb-2">
                          Signos Vitales Iniciales (Paramédico):
                        </p>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                          <div>
                            <p className="text-slate-500">PA</p>
                            <p className="text-white font-semibold">{paciente.signosVitalesIniciales.presion}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">FC</p>
                            <p className="text-white font-semibold">{paciente.signosVitalesIniciales.fc}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">FR</p>
                            <p className="text-white font-semibold">{paciente.signosVitalesIniciales.fr}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">SatO₂</p>
                            <p className="text-white font-semibold">{paciente.signosVitalesIniciales.sato2}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Temp</p>
                            <p className="text-white font-semibold">{paciente.signosVitalesIniciales.temperatura}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">EVA</p>
                            <p className="text-white font-semibold">{paciente.signosVitalesIniciales.eva}</p>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => setSelectedPaciente(paciente.id)}
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
                  ))}
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
