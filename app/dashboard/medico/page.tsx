"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession, clearSession, type User } from "@/lib/auth"
import { authAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FICHAS_MOCK, getFichasPendientesAutorizacion } from "@/lib/mock-data"
import type { FichaEmergencia, SolicitudMedicamento } from "@/lib/types"
import { ModalDiagnostico } from "@/components/modal-diagnostico"

export default function MedicoDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fichasActivas, setFichasActivas] = useState<FichaEmergencia[]>([])
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudMedicamento[]>([])
  const [modalDiagnosticoOpen, setModalDiagnosticoOpen] = useState(false)
  const [fichaSeleccionada, setFichaSeleccionada] = useState<FichaEmergencia | null>(null)

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "medico") {
      router.push("/")
      return
    }
    setUser(currentUser)

    setFichasActivas(FICHAS_MOCK.filter((f) => f.estado === "en_ruta" || f.estado === "en_hospital"))
    setSolicitudesPendientes(getFichasPendientesAutorizacion())
  }, [router])

  const handleAutorizarMedicamento = (solicitudId: string, autorizar: boolean) => {
    setSolicitudesPendientes((prev) => prev.filter((s) => s.id !== solicitudId))
    console.log("[v0] Medicamento", autorizar ? "autorizado" : "rechazado", solicitudId)
  }

  const handleAbrirDiagnostico = (ficha: FichaEmergencia) => {
    setFichaSeleccionada(ficha)
    setModalDiagnosticoOpen(true)
  }

  const handleConfirmDiagnostico = (diagnostico: any) => {
    console.log("[v0] Diagnóstico guardado:", diagnostico)
    setFichaSeleccionada(null)
  }

  const handleCerrarSesion = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      clearSession()
      router.push("/")
    }
  }

  if (!user) return null

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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Sistema de Urgencias</h1>
              <p className="text-sm text-slate-400">Médico: {user.nombre_completo || user.first_name + ' ' + user.last_name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleCerrarSesion}>
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {solicitudesPendientes.length > 0 && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-amber-500">Solicitudes de Medicamentos Pendientes</p>
                <p className="text-sm text-slate-400">
                  Tienes {solicitudesPendientes.length} solicitud(es) de autorización de medicamentos
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="casos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="casos">Casos Activos</TabsTrigger>
            <TabsTrigger value="autorizaciones">
              Autorizaciones
              {solicitudesPendientes.length > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white">{solicitudesPendientes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="diagnosticos">Diagnósticos</TabsTrigger>
          </TabsList>

          {/* Casos Activos */}
          <TabsContent value="casos" className="space-y-6">
            <div className="grid gap-4">
              {fichasActivas.map((ficha) => (
                <Card key={ficha.id} className="border-slate-800 bg-slate-900/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-white">
                            {ficha.paciente.esNN
                              ? `Paciente NN (${ficha.paciente.idTemporal})`
                              : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`}
                          </CardTitle>
                          <Badge
                            variant={
                              ficha.prioridad === "rojo"
                                ? "destructive"
                                : ficha.prioridad === "amarillo"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {ficha.prioridad === "rojo"
                              ? "🔴 CRÍTICO"
                              : ficha.prioridad === "amarillo"
                                ? "🟡 URGENTE"
                                : "🟢 NO URGENTE"}
                          </Badge>
                          <Badge variant="outline" className="border-slate-700">
                            {ficha.estado === "en_ruta" ? "🚑 En Ruta" : "🏥 En Hospital"}
                          </Badge>
                        </div>
                        <CardDescription className="text-slate-400">
                          {!ficha.paciente.esNN && `RUT: ${ficha.paciente.rut} • `}
                          Sexo: {ficha.paciente.sexo} • Paramédico: {ficha.paramedico}
                          {ficha.eta && ` • ETA: ${ficha.eta}`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Datos del Paramédico */}
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <h4 className="font-semibold text-emerald-500 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Registro Paramédico
                      </h4>
                      <p className="text-sm text-slate-300 mb-3">
                        <strong>Motivo:</strong> {ficha.motivoConsulta}
                      </p>
                      <p className="text-sm text-slate-300 mb-3">
                        <strong>Circunstancias:</strong> {ficha.circunstancias}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="p-2 bg-slate-800/50 rounded">
                          <p className="text-xs text-slate-400">Presión</p>
                          <p className="text-sm font-semibold text-white">
                            {ficha.signosVitales.presionSistolica}/{ficha.signosVitales.presionDiastolica}
                          </p>
                        </div>
                        <div className="p-2 bg-slate-800/50 rounded">
                          <p className="text-xs text-slate-400">FC</p>
                          <p className="text-sm font-semibold text-white">
                            {ficha.signosVitales.frecuenciaCardiaca} lpm
                          </p>
                        </div>
                        <div className="p-2 bg-slate-800/50 rounded">
                          <p className="text-xs text-slate-400">SatO₂</p>
                          <p className="text-sm font-semibold text-white">{ficha.signosVitales.saturacionO2}%</p>
                        </div>
                        <div className="p-2 bg-slate-800/50 rounded">
                          <p className="text-xs text-slate-400">Temp</p>
                          <p className="text-sm font-semibold text-white">{ficha.signosVitales.temperatura}°C</p>
                        </div>
                      </div>
                    </div>

                    {/* Anamnesis del TENS */}
                    {ficha.anamnesis && (
                      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <h4 className="font-semibold text-blue-500 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Anamnesis TENS - {ficha.anamnesis.tens}
                        </h4>

                        {ficha.anamnesis.alergiasCriticas && (
                          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded">
                            <p className="text-sm font-semibold text-red-500">⚠️ ALERGIAS MEDICAMENTOSAS:</p>
                            <p className="text-sm text-red-400">{ficha.anamnesis.alergiasMedicamentosas.join(", ")}</p>
                          </div>
                        )}

                        <div className="space-y-2 text-sm text-slate-300">
                          <p>
                            <strong>Antecedentes Mórbidos:</strong> {ficha.anamnesis.antecedentesMorbidos}
                          </p>
                          <p>
                            <strong>Medicamentos Habituales:</strong> {ficha.anamnesis.medicamentosHabituales}
                          </p>
                          {ficha.anamnesis.antecedentesQuirurgicos && (
                            <p>
                              <strong>Antecedentes Quirúrgicos:</strong> {ficha.anamnesis.antecedentesQuirurgicos}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleAbrirDiagnostico(ficha)}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Realizar Diagnóstico
                      </Button>
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        Solicitar Exámenes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Autorizaciones de Medicamentos */}
          <TabsContent value="autorizaciones" className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Solicitudes de Autorización de Medicamentos</CardTitle>
                <CardDescription className="text-slate-400">
                  Revisa y autoriza las solicitudes de medicamentos de los paramédicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {solicitudesPendientes.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 text-slate-600 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-slate-400">No hay solicitudes pendientes de autorización</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {solicitudesPendientes.map((solicitud) => (
                      <div key={solicitud.id} className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white text-lg">{solicitud.medicamento}</h4>
                            <p className="text-sm text-slate-400">Dosis: {solicitud.dosis}</p>
                            <p className="text-sm text-slate-400">Solicitado por: {solicitud.paramedico}</p>
                          </div>
                          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Pendiente</Badge>
                        </div>

                        <div className="mb-4 p-3 bg-slate-800/50 rounded">
                          <p className="text-sm font-semibold text-slate-300 mb-1">Justificación Clínica:</p>
                          <p className="text-sm text-slate-400">{solicitud.justificacion}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleAutorizarMedicamento(solicitud.id, true)}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Autorizar
                          </Button>
                          <Button
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleAutorizarMedicamento(solicitud.id, false)}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnósticos */}
          <TabsContent value="diagnosticos" className="space-y-6">
            {fichaSeleccionada ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="text-white">
                    Diagnóstico y Alta Médica - {fichaSeleccionada.paciente.nombres}{" "}
                    {fichaSeleccionada.paciente.apellidos}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Complete el diagnóstico e indicaciones médicas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="diagnostico" className="text-slate-300">
                      Diagnóstico CIE-10
                    </Label>
                    <Textarea
                      id="diagnostico"
                      placeholder="Ej: I21.9 - Infarto agudo del miocardio"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion" className="text-slate-300">
                      Descripción del Diagnóstico
                    </Label>
                    <Textarea
                      id="descripcion"
                      placeholder="Descripción detallada del diagnóstico..."
                      className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="indicaciones" className="text-slate-300">
                      Indicaciones Médicas
                    </Label>
                    <Textarea
                      id="indicaciones"
                      placeholder="Indicaciones y tratamiento..."
                      className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medicamentos" className="text-slate-300">
                      Medicamentos Prescritos
                    </Label>
                    <Textarea
                      id="medicamentos"
                      placeholder="Lista de medicamentos con dosis y frecuencia..."
                      className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700">Guardar Diagnóstico y Dar Alta</Button>
                    <Button
                      variant="outline"
                      className="border-slate-700 bg-transparent"
                      onClick={() => setFichaSeleccionada(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 text-slate-600 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-slate-400 mb-4">Selecciona un caso activo para realizar el diagnóstico</p>
                    <Button
                      onClick={() =>
                        document.querySelector('[value="casos"]')?.dispatchEvent(new Event("click", { bubbles: true }))
                      }
                    >
                      Ver Casos Activos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de diagnóstico */}
      <ModalDiagnostico
        open={modalDiagnosticoOpen}
        onOpenChange={setModalDiagnosticoOpen}
        ficha={fichaSeleccionada}
        onConfirm={handleConfirmDiagnostico}
      />
    </div>
  )
}
