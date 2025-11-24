"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/auth"
import { pacientesAPI, fichasAPI, signosVitalesAPI, solicitudesMedicamentosAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export default function RegistrarPacienteNN() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [idTemporal, setIdTemporal] = useState("")
  
  const [formData, setFormData] = useState({
    // Datos básicos
    sexo: "",
    edadAproximada: "",
    caracteristicas: "",
    motivoConsulta: "",
    prioridad: "C3",
    // Signos vitales
    presionSistolica: "",
    presionDiastolica: "",
    frecuenciaCardiaca: "",
    frecuenciaRespiratoria: "",
    temperatura: "",
    saturacionOxigeno: "",
    glucosa: "",
    eva: "",
    escala_glasgow: "",
    // Medicamentos
    necesitaMedicamento: false,
    medicamentos: "",
    observacionesMedicamento: "",
  })

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "paramedico") {
      router.push("/")
      return
    }
    setUser(currentUser)
    
    // Generar ID temporal
    const fecha = new Date()
    const año = fecha.getFullYear()
    const numero = Math.floor(Math.random() * 9999) + 1
    setIdTemporal(`NN-${año}-${String(numero).padStart(4, "0")}`)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Validar rangos de signos vitales
      const presionSist = parseInt(formData.presionSistolica)
      const presionDiast = parseInt(formData.presionDiastolica)
      const fc = parseInt(formData.frecuenciaCardiaca)
      const fr = parseInt(formData.frecuenciaRespiratoria)
      const temp = parseFloat(formData.temperatura)
      const spo2 = parseInt(formData.saturacionOxigeno)
      const glucosa = formData.glucosa ? parseInt(formData.glucosa) : null

      // Validaciones con mensajes específicos
      if (presionSist < 50 || presionSist > 250) {
        const msg = "Presión Sistólica: El valor debe estar entre 50 y 250 mmHg"
        setError("❌ " + msg)
        toast({ title: "Error de Validación", description: msg, variant: "destructive" })
        setLoading(false)
        return
      }
      if (presionDiast < 30 || presionDiast > 150) {
        const msg = "Presión Diastólica: El valor debe estar entre 30 y 150 mmHg"
        setError("❌ " + msg)
        toast({ title: "Error de Validación", description: msg, variant: "destructive" })
        setLoading(false)
        return
      }
      if (fc < 30 || fc > 250) {
        const msg = "Frecuencia Cardíaca: El valor debe estar entre 30 y 250 lpm"
        setError("❌ " + msg)
        toast({ title: "Error de Validación", description: msg, variant: "destructive" })
        setLoading(false)
        return
      }
      if (fr < 5 || fr > 60) {
        const msg = "Frecuencia Respiratoria: El valor debe estar entre 5 y 60 rpm"
        setError("❌ " + msg)
        toast({ title: "Error de Validación", description: msg, variant: "destructive" })
        setLoading(false)
        return
      }
      if (temp < 30 || temp > 45) {
        const msg = "Temperatura: El valor debe estar entre 30 y 45 °C"
        setError("❌ " + msg)
        toast({ title: "Error de Validación", description: msg, variant: "destructive" })
        setLoading(false)
        return
      }
      if (spo2 < 50 || spo2 > 100) {
        const msg = "Saturación de Oxígeno: El valor debe estar entre 50 y 100%"
        setError("❌ " + msg)
        toast({ title: "Error de Validación", description: msg, variant: "destructive" })
        setLoading(false)
        return
      }
      if (glucosa && (glucosa < 20 || glucosa > 600)) {
        const msg = "Glucosa: El valor debe estar entre 20 y 600 mg/dL"
        setError("❌ " + msg)
        toast({ title: "Error de Validación", description: msg, variant: "destructive" })
        setLoading(false)
        return
      }

      // Generar nuevo ID temporal para cada intento (evita duplicados)
      const fecha = new Date()
      const año = fecha.getFullYear()
      const numero = Math.floor(Math.random() * 9999) + 1
      const nuevoIdTemporal = `NN-${año}-${String(numero).padStart(4, "0")}`

      // 1. Crear paciente NN
      const pacienteData = {
        rut: null,
        nombres: "NN",
        apellidos: nuevoIdTemporal,
        edad: parseInt(formData.edadAproximada),
        sexo: formData.sexo,
        telefono: null,
        direccion: formData.caracteristicas || "Sin información",
        prevision: "Sin previsión",
        es_nn: true,
        id_temporal: nuevoIdTemporal,
      }

      console.log("📋 Creando paciente NN:", pacienteData)
      const paciente = await pacientesAPI.crear(pacienteData)
      console.log("✅ Paciente NN creado:", paciente)

      // 2. Crear ficha de emergencia con signos vitales (igual que en dashboard paramedico)
      const fichaCompleta = {
        paciente: paciente.id,
        paramedico: user.id,
        motivo_consulta: formData.motivoConsulta,
        circunstancias: formData.caracteristicas || "Paciente NN sin información adicional",
        sintomas: formData.motivoConsulta,
        nivel_consciencia: formData.escala_glasgow ? `Glasgow ${formData.escala_glasgow}` : "Glasgow 15",
        estado: "en_ruta",
        prioridad: formData.prioridad,
        eta: "15 minutos",
        signos_vitales_data: {
          presion_sistolica: parseInt(formData.presionSistolica) || 0,
          presion_diastolica: parseInt(formData.presionDiastolica) || 0,
          frecuencia_cardiaca: parseInt(formData.frecuenciaCardiaca) || 0,
          frecuencia_respiratoria: parseInt(formData.frecuenciaRespiratoria) || 0,
          saturacion_o2: parseInt(formData.saturacionOxigeno) || 0,
          temperatura: parseFloat(formData.temperatura) || 36.0,
          glucosa: formData.glucosa && !isNaN(parseInt(formData.glucosa)) ? parseInt(formData.glucosa) : null,
          escala_glasgow: formData.escala_glasgow && !isNaN(parseInt(formData.escala_glasgow)) ? parseInt(formData.escala_glasgow) : null,
          eva: formData.eva && !isNaN(parseInt(formData.eva)) ? parseInt(formData.eva) : null
        }
      }

      console.log("📋 Creando ficha con signos vitales:", fichaCompleta)
      const ficha = await fichasAPI.crear(fichaCompleta)
      console.log("✅ Ficha y signos vitales creados:", ficha)

      // 4. Si necesita medicamentos, crear solicitud
      if (formData.necesitaMedicamento && formData.medicamentos) {
        const solicitudMedicamentoData = {
          ficha: ficha.id,
          solicitante: user.id,
          medicamento: formData.medicamentos,
          dosis: "Ver observaciones",
          via_administracion: "Según indicación",
          observaciones: formData.observacionesMedicamento || "Medicamento administrado en campo",
          estado: "completado",
        }

        console.log("📋 Creando solicitud de medicamento:", solicitudMedicamentoData)
        await solicitudesMedicamentosAPI.crear(solicitudMedicamentoData)
        console.log("✅ Solicitud de medicamento creada")
      }

      // Redirigir al dashboard con mensaje de éxito
      router.push("/dashboard/paramedico?success=Paciente NN registrado exitosamente")

    } catch (err: any) {
      console.error("❌ Error al registrar paciente NN:", err)
      setError(err.message || "Error al registrar paciente NN")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push("/dashboard/paramedico")
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Registro de Paciente Sin Identificación</h1>
              <p className="text-sm text-slate-400">Complete toda la información disponible del paciente</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ID Temporal */}
          <Card className="bg-slate-900 border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-amber-500 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                ID Temporal Generado
              </CardTitle>
              <CardDescription>Este identificador se asignará al paciente hasta su identificación oficial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-3xl font-mono font-bold text-amber-400 text-center">{idTemporal}</p>
              </div>
            </CardContent>
          </Card>

          {/* Datos Básicos */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Información Básica del Paciente
              </CardTitle>
              <CardDescription>Datos disponibles sobre el paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Sexo Aparente <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.sexo} onValueChange={(value) => setFormData({ ...formData, sexo: value })} required>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Edad Aproximada (años) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="Ej: 35"
                    min="0"
                    max="120"
                    title="Rango: 0-120 años"
                    value={formData.edadAproximada}
                    onChange={(e) => setFormData({ ...formData, edadAproximada: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Categorización de Urgencia <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.prioridad} onValueChange={(value) => setFormData({ ...formData, prioridad: value })}>
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

              <div className="space-y-2">
                <Label className="text-slate-300">
                  Motivo de Consulta <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Describa el motivo principal de la consulta..."
                  value={formData.motivoConsulta}
                  onChange={(e) => setFormData({ ...formData, motivoConsulta: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Características Físicas Distintivas</Label>
                <Textarea
                  placeholder="Ej: Cicatriz en brazo derecho, tatuaje en el hombro izquierdo, complexión delgada, cabello castaño..."
                  value={formData.caracteristicas}
                  onChange={(e) => setFormData({ ...formData, caracteristicas: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Signos Vitales */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Signos Vitales
              </CardTitle>
              <CardDescription>Registro inicial de signos vitales del paciente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Presión Arterial (mmHg) <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="120"
                      min="50"
                      max="250"
                      title="Rango: 50-250 mmHg"
                      value={formData.presionSistolica}
                      onChange={(e) => setFormData({ ...formData, presionSistolica: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                    />
                    <span className="text-slate-400 flex items-center">/</span>
                    <Input
                      type="number"
                      placeholder="80"
                      min="30"
                      max="150"
                      title="Rango: 30-150 mmHg"
                      value={formData.presionDiastolica}
                      onChange={(e) => setFormData({ ...formData, presionDiastolica: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400">💡 Sistólica: 50-250 mmHg • Diastólica: 30-150 mmHg</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Frecuencia Cardíaca (lpm) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="75"
                    min="30"
                    max="250"
                    title="Rango: 30-250 lpm"
                    value={formData.frecuenciaCardiaca}
                    onChange={(e) => setFormData({ ...formData, frecuenciaCardiaca: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                  <p className="text-xs text-slate-400">💡 Rango normal: 60-100 lpm</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Frecuencia Respiratoria (rpm) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="16"
                    min="5"
                    max="60"
                    title="Rango: 5-60 rpm"
                    value={formData.frecuenciaRespiratoria}
                    onChange={(e) => setFormData({ ...formData, frecuenciaRespiratoria: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                  <p className="text-xs text-slate-400">💡 Rango normal: 12-20 rpm</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Temperatura (°C) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="36.5"
                    min="30"
                    max="45"
                    title="Rango: 30-45 °C"
                    value={formData.temperatura}
                    onChange={(e) => setFormData({ ...formData, temperatura: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                  <p className="text-xs text-slate-400">💡 Rango normal: 36-37.5 °C</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Saturación O₂ (%) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="98"
                    min="50"
                    max="100"
                    title="Rango: 50-100%"
                    value={formData.saturacionOxigeno}
                    onChange={(e) => setFormData({ ...formData, saturacionOxigeno: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                  <p className="text-xs text-slate-400">💡 Rango normal: 95-100%</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Glucosa (mg/dL)</Label>
                  <Input
                    type="number"
                    placeholder="90"
                    min="20"
                    max="600"
                    title="Rango: 20-600 mg/dL"
                    value={formData.glucosa}
                    onChange={(e) => setFormData({ ...formData, glucosa: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-400">💡 Rango normal: 70-110 mg/dL</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">
                  EVA - Escala Visual Análoga del Dolor
                </Label>
                <Select value={formData.eva} onValueChange={(value) => setFormData({ ...formData, eva: value })}>
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
                <Label className="text-slate-300">
                  Escala de Glasgow
                </Label>
                <Select value={formData.escala_glasgow} onValueChange={(value) => setFormData({ ...formData, escala_glasgow: value })}>
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
            </CardContent>
          </Card>

          {/* Medicamentos */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="necesita-medicamento"
                  checked={formData.necesitaMedicamento}
                  onCheckedChange={(checked) => setFormData({ ...formData, necesitaMedicamento: checked as boolean })}
                  className="border-slate-600"
                />
                <div className="flex-1">
                  <CardTitle className="text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    ¿Se administraron medicamentos en campo?
                  </CardTitle>
                  <CardDescription>Marque esta opción si ya se administró medicación al paciente</CardDescription>
                </div>
              </div>
            </CardHeader>
            {formData.necesitaMedicamento && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Medicamentos Administrados</Label>
                  <Textarea
                    placeholder="Ej: Paracetamol 500mg vía oral&#10;Suero fisiológico 500ml IV&#10;Adrenalina 1mg IM"
                    value={formData.medicamentos}
                    onChange={(e) => setFormData({ ...formData, medicamentos: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white min-h-[100px] font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Observaciones sobre la medicación</Label>
                  <Textarea
                    placeholder="Ej: Paciente presentó reacción alérgica leve al medicamento, toleró bien la medicación, se observó mejoría inmediata..."
                    value={formData.observacionesMedicamento}
                    onChange={(e) => setFormData({ ...formData, observacionesMedicamento: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Botones de acción */}
          <div className="flex gap-4 justify-end pt-6 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando Ficha...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Generar Ficha Completa
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
