"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/auth"
import { authAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModalPacienteNN } from "@/components/modal-paciente-nn"

export default function ParamedicoDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("registro")
  const [modalNNOpen, setModalNNOpen] = useState(false)
  const [pacienteNN, setPacienteNN] = useState<any>(null)

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "paramedico") {
      router.push("/")
      return
    }
    setUser(currentUser)
  }, [router])

  const handleConfirmNN = (data: any) => {
    setPacienteNN(data)
    console.log("[v0] Paciente NN registrado:", data)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Sistema de Urgencias</h1>
              <p className="text-sm text-slate-400">Paramédico: {user.nombre_completo || user.first_name + ' ' + user.last_name}</p>
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
            <TabsTrigger value="registro">Registrar Paciente</TabsTrigger>
            <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
          </TabsList>

          <TabsContent value="registro" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Registro de Paciente en Terreno</CardTitle>
                <CardDescription className="text-slate-400">
                  Complete los datos mínimos del paciente y signos vitales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Datos del Paciente */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Identificación del Paciente
                  </h3>

                  <div className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-500">¿Paciente sin identificación?</p>
                      <p className="text-xs text-slate-400">Use el botón "Paciente NN" para generar ID temporal</p>
                    </div>
                    <Button onClick={() => setModalNNOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
                      Paciente NN
                    </Button>
                  </div>

                  {pacienteNN && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <p className="text-sm font-semibold text-emerald-500 mb-2">✓ Paciente NN Registrado</p>
                      <p className="text-sm text-white">
                        <strong>ID Temporal:</strong> {pacienteNN.idTemporal}
                      </p>
                      <p className="text-sm text-white">
                        <strong>Sexo:</strong> {pacienteNN.sexo} • <strong>Edad aprox:</strong>{" "}
                        {pacienteNN.edadAproximada} años
                      </p>
                      {pacienteNN.caracteristicas && (
                        <p className="text-sm text-slate-300">
                          <strong>Características:</strong> {pacienteNN.caracteristicas}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="rut" className="text-slate-300">
                        RUT
                      </Label>
                      <Input id="rut" placeholder="12.345.678-9" className="bg-slate-800 border-slate-700 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sexo" className="text-slate-300">
                        Sexo
                      </Label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="femenino">Femenino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nombres" className="text-slate-300">
                        Nombres
                      </Label>
                      <Input
                        id="nombres"
                        placeholder="Juan Carlos"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellidos" className="text-slate-300">
                        Apellidos
                      </Label>
                      <Input
                        id="apellidos"
                        placeholder="González Pérez"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edad" className="text-slate-300">
                        Edad (años)
                      </Label>
                      <Input
                        id="edad"
                        type="number"
                        placeholder="45"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prevision" className="text-slate-300">
                        Previsión
                      </Label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fonasa">FONASA</SelectItem>
                          <SelectItem value="isapre">ISAPRE</SelectItem>
                          <SelectItem value="particular">PARTICULAR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Signos Vitales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    Signos Vitales
                  </h3>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="presion" className="text-slate-300">
                        Presión Arterial (mmHg)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="presion-sistolica"
                          placeholder="120"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                        <span className="text-slate-400 flex items-center">/</span>
                        <Input
                          id="presion-diastolica"
                          placeholder="80"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fc" className="text-slate-300">
                        Frecuencia Cardíaca (lpm)
                      </Label>
                      <Input
                        id="fc"
                        type="number"
                        placeholder="75"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fr" className="text-slate-300">
                        Frecuencia Respiratoria (rpm)
                      </Label>
                      <Input
                        id="fr"
                        type="number"
                        placeholder="16"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sato2" className="text-slate-300">
                        Saturación O₂ (%)
                      </Label>
                      <Input
                        id="sato2"
                        type="number"
                        placeholder="98"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temperatura" className="text-slate-300">
                        Temperatura (°C)
                      </Label>
                      <Input
                        id="temperatura"
                        type="number"
                        step="0.1"
                        placeholder="36.5"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="glucosa" className="text-slate-300">
                        Glucosa (mg/dL)
                      </Label>
                      <Input
                        id="glucosa"
                        type="number"
                        placeholder="90"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eva" className="text-slate-300">
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

                  <div className="space-y-2">
                    <Label htmlFor="glasgow" className="text-slate-300">
                      Escala de Glasgow
                    </Label>
                    <Select>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Seleccionar nivel de consciencia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 - Consciente y orientado</SelectItem>
                        <SelectItem value="14">14 - Confuso</SelectItem>
                        <SelectItem value="13">13 - Respuesta verbal inapropiada</SelectItem>
                        <SelectItem value="8">8 - Semiconsciente</SelectItem>
                        <SelectItem value="3">3 - Inconsciente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Motivo de Consulta */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Evaluación Clínica
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="motivo" className="text-slate-300">
                      Motivo de Consulta
                    </Label>
                    <Textarea
                      id="motivo"
                      placeholder="Ej: Dolor torácico intenso hace 30 minutos"
                      className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="circunstancias" className="text-slate-300">
                      Circunstancias del Incidente
                    </Label>
                    <Textarea
                      id="circunstancias"
                      placeholder="Ej: Paciente en domicilio, refiere dolor opresivo irradiado a brazo izquierdo"
                      className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prioridad" className="text-slate-300">
                      Categorización de Urgencia
                    </Label>
                    <Select>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Seleccionar nivel de urgencia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="C1">🔴 C1: Urgencia vital / inmediato</SelectItem>
                        <SelectItem value="C2">🟠 C2: Riesgo vital / 30 min</SelectItem>
                        <SelectItem value="C3">🟡 C3: Patología urgente / 1h30</SelectItem>
                        <SelectItem value="C4">🟢 C4: Urgencia relativa / 3hrs</SelectItem>
                        <SelectItem value="C5">⚪ C5: No urgente / 3-4hrs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enviar al Hospital
                  </Button>
                  <Button className="bg-slate-600 hover:bg-slate-500 text-white">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                    Guardar Borrador
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Solicitar Medicamento */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Solicitar Autorización de Medicamento</CardTitle>
                <CardDescription className="text-slate-400">
                  Solicite autorización al médico de turno para administrar medicamentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="medicamento" className="text-slate-300">
                    Medicamento
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Seleccionar medicamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aspirina">Aspirina 300mg</SelectItem>
                      <SelectItem value="morfina">Morfina 10mg</SelectItem>
                      <SelectItem value="epinefrina">Epinefrina 1mg</SelectItem>
                      <SelectItem value="nitroglicerina">Nitroglicerina sublingual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosis" className="text-slate-300">
                    Dosis
                  </Label>
                  <Input
                    id="dosis"
                    placeholder="Ej: 300mg vía oral"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="justificacion" className="text-slate-300">
                    Justificación Clínica
                  </Label>
                  <Textarea
                    id="justificacion"
                    placeholder="Ej: Sospecha de síndrome coronario agudo, paciente sin contraindicaciones"
                    className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                  />
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Enviar Solicitud al Médico
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="solicitudes" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Solicitudes de Medicamentos</CardTitle>
                <CardDescription className="text-slate-400">Estado de las autorizaciones solicitadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-white">Aspirina 300mg</p>
                        <p className="text-sm text-slate-400">Dosis: 300mg vía oral</p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Pendiente</Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">Justificación: Sospecha de síndrome coronario agudo</p>
                    <p className="text-xs text-slate-500">Solicitado hace 5 minutos</p>
                  </div>

                  <div className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-white">Morfina 10mg</p>
                        <p className="text-sm text-slate-400">Dosis: 10mg IV</p>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">Autorizado</Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">Autorizado por: Dr. Juan Pérez</p>
                    <p className="text-xs text-slate-500">Hace 15 minutos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <ModalPacienteNN open={modalNNOpen} onOpenChange={setModalNNOpen} onConfirm={handleConfirmNN} />
    </div>
  )
}
