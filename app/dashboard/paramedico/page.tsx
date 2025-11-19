"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/auth"
import { authAPI, pacientesAPI, fichasAPI, solicitudesMedicamentosAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModalPacienteNN } from "@/components/modal-paciente-nn"

export default function ParamedicoDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("registro")
  const [modalNNOpen, setModalNNOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [solicitudes, setSolicitudes] = useState<any[]>([])

  // Estados del formulario de paciente
  const [pacienteData, setPacienteData] = useState({
    rut: "",
    nombres: "",
    apellidos: "",
    sexo: "",
    fecha_nacimiento: "",
    telefono: "",
    direccion: ""
  })

  // Estados del formulario de signos vitales
  const [signosData, setSignosData] = useState({
    presion_sistolica: "",
    presion_diastolica: "",
    frecuencia_cardiaca: "",
    frecuencia_respiratoria: "",
    saturacion_o2: "",
    temperatura: "",
    glucosa: "",
    eva: "",
    escala_glasgow: ""
  })

  // Estados del formulario de ficha
  const [fichaData, setFichaData] = useState({
    motivo_consulta: "",
    circunstancias: "",
    sintomas: "",
    nivel_consciencia: "",
    prioridad: "",
    eta: "15 minutos"
  })

  // Estados del formulario de solicitud de medicamento
  const [solicitudData, setSolicitudData] = useState({
    medicamento: "",
    dosis: "",
    justificacion: ""
  })

  const [pacienteCreado, setPacienteCreado] = useState<any>(null)
  const [pacienteNN, setPacienteNN] = useState<any>(null)

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "paramedico") {
      router.push("/")
      return
    }
    setUser(currentUser)
    cargarSolicitudes()
  }, [router])

  const cargarSolicitudes = async () => {
    try {
      const data = await solicitudesMedicamentosAPI.listar()
      setSolicitudes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error al cargar solicitudes:", err)
      setSolicitudes([])
    }
  }

  const handleConfirmNN = async (data: any) => {
    try {
      setLoading(true)
      setError("")
      
      const pacienteNNData = {
        nombres: "Paciente",
        apellidos: "NN",
        sexo: data.sexo,
        es_nn: true,
        id_temporal: data.idTemporal,
        edad_aproximada: parseInt(data.edadAproximada),
        caracteristicas: data.caracteristicas || ""
      }
      
      console.log('Enviando paciente NN:', pacienteNNData)
      
      const paciente = await pacientesAPI.crear(pacienteNNData)
      setPacienteNN(paciente)
      setPacienteCreado(paciente)
      setSuccess("Paciente NN registrado exitosamente")
      setModalNNOpen(false)
      setTimeout(() => setSuccess(""), 5000)
    } catch (err: any) {
      console.error('Error al registrar paciente NN:', err)
      setError(err.message || "Error al registrar paciente NN")
    } finally {
      setLoading(false)
    }
  }

  const handleRegistrarPaciente = async () => {
    try {
      setLoading(true)
      setError("")
      
      if (!pacienteData.rut || !pacienteData.nombres || !pacienteData.apellidos || !pacienteData.sexo) {
        setError("Complete los campos obligatorios: RUT, nombres, apellidos y sexo")
        return
      }
      
      // Primero buscar si el paciente ya existe por RUT
      try {
        const pacientesExistentes = await pacientesAPI.buscar(pacienteData.rut)
        if (pacientesExistentes && pacientesExistentes.length > 0) {
          // Paciente ya existe, usarlo en lugar de crear uno nuevo
          const pacienteExistente = pacientesExistentes[0]
          setPacienteCreado(pacienteExistente)
          setSuccess(`⚠️ El RUT ${pacienteData.rut} ya existe en el sistema. Paciente cargado: ${pacienteExistente.nombres} ${pacienteExistente.apellidos}`)
          setTimeout(() => setSuccess(""), 8000)
          return
        }
      } catch (searchErr) {
        // Si falla la búsqueda, continuar con la creación
        console.log('No se encontró paciente existente, procediendo a crear')
      }
      
      const data = {
        ...pacienteData,
        es_nn: false
      }
      
      console.log('Enviando datos del paciente:', data)
      
      const paciente = await pacientesAPI.crear(data)
      setPacienteCreado(paciente)
      setSuccess("Paciente registrado exitosamente")
      setTimeout(() => setSuccess(""), 5000)
    } catch (err: any) {
      console.error('Error al registrar paciente:', err)
      setError(err.message || "Error al registrar paciente")
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarFicha = async () => {
    try {
      setLoading(true)
      setError("")
      
      if (!pacienteCreado && !pacienteNN) {
        setError("Primero debe registrar un paciente")
        return
      }
      
      if (!fichaData.motivo_consulta || !fichaData.circunstancias || !fichaData.prioridad) {
        setError("Complete todos los campos obligatorios de la ficha")
        return
      }
      
      if (!signosData.presion_sistolica || !signosData.frecuencia_cardiaca || !signosData.saturacion_o2) {
        setError("Complete los signos vitales obligatorios")
        return
      }
      
      const fichaCompleta = {
        paciente: (pacienteCreado || pacienteNN).id,
        paramedico: user.id,
        motivo_consulta: fichaData.motivo_consulta,
        circunstancias: fichaData.circunstancias,
        sintomas: fichaData.sintomas || "Sin síntomas adicionales",
        nivel_consciencia: fichaData.nivel_consciencia || `Glasgow ${signosData.escala_glasgow || '15'}`,
        estado: "en_ruta",
        prioridad: fichaData.prioridad,
        eta: fichaData.eta,
        signos_vitales_data: {
          presion_sistolica: parseInt(signosData.presion_sistolica) || 0,
          presion_diastolica: parseInt(signosData.presion_diastolica) || 0,
          frecuencia_cardiaca: parseInt(signosData.frecuencia_cardiaca) || 0,
          frecuencia_respiratoria: parseInt(signosData.frecuencia_respiratoria) || 0,
          saturacion_o2: parseInt(signosData.saturacion_o2) || 0,
          temperatura: parseFloat(signosData.temperatura) || 36.0,
          glucosa: signosData.glucosa && !isNaN(parseInt(signosData.glucosa)) ? parseInt(signosData.glucosa) : null,
          escala_glasgow: signosData.escala_glasgow && !isNaN(parseInt(signosData.escala_glasgow)) ? parseInt(signosData.escala_glasgow) : null,
          eva: signosData.eva && !isNaN(parseInt(signosData.eva)) ? parseInt(signosData.eva) : null
        }
      }
      
      console.log('📤 Enviando ficha:', fichaCompleta)
      
      const response = await fichasAPI.crear(fichaCompleta)
      console.log('✅ Respuesta del servidor:', response)
      
      if (response && response.id) {
        setSuccess(`¡Ficha #${response.id} enviada al hospital exitosamente!`)
      } else {
        setSuccess("¡Ficha enviada al hospital exitosamente!")
      }
      
      // Limpiar formularios
      setPacienteData({
        rut: "", nombres: "", apellidos: "", sexo: "", fecha_nacimiento: "", telefono: "", direccion: ""
      })
      setSignosData({
        presion_sistolica: "", presion_diastolica: "", frecuencia_cardiaca: "",
        frecuencia_respiratoria: "", saturacion_o2: "", temperatura: "",
        glucosa: "", eva: "", escala_glasgow: ""
      })
      setFichaData({
        motivo_consulta: "", circunstancias: "", sintomas: "",
        nivel_consciencia: "", prioridad: "", eta: "15 minutos"
      })
      setPacienteCreado(null)
      setPacienteNN(null)
      
      setTimeout(() => setSuccess(""), 5000)
    } catch (err: any) {
      console.error('Error completo:', err)
      setError(err.message || "Error al enviar ficha")
    } finally {
      setLoading(false)
    }
  }

  const handleSolicitarMedicamento = async () => {
    try {
      setLoading(true)
      setError("")
      
      if (!solicitudData.medicamento || !solicitudData.dosis || !solicitudData.justificacion) {
        setError("Complete todos los campos de la solicitud")
        return
      }
      
      if (!pacienteCreado && !pacienteNN) {
        setError("Primero debe registrar un paciente y crear una ficha")
        return
      }
      
      // Aquí necesitarías tener el ID de la ficha creada
      // Por simplicidad, asumimos que hay una ficha reciente
      const fichas = await fichasAPI.listar({ paramedico: user.id, estado: 'en_ruta' })
      if (fichas.length === 0) {
        setError("No hay fichas activas para solicitar medicamentos")
        return
      }
      
      const solicitud = {
        ficha: fichas[0].id,
        paramedico: user.id,
        medicamento: solicitudData.medicamento,
        dosis: solicitudData.dosis,
        justificacion: solicitudData.justificacion
      }
      
      await solicitudesMedicamentosAPI.crear(solicitud)
      setSuccess("Solicitud de medicamento enviada al médico")
      setSolicitudData({ medicamento: "", dosis: "", justificacion: "" })
      await cargarSolicitudes()
      setTimeout(() => setSuccess(""), 5000)
    } catch (err: any) {
      setError(err.message || "Error al enviar solicitud")
    } finally {
      setLoading(false)
    }
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
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-4 border-emerald-500 bg-emerald-500/10">
            <AlertDescription className="text-emerald-500">{success}</AlertDescription>
          </Alert>
        )}

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
                        RUT *
                      </Label>
                      <Input 
                        id="rut" 
                        placeholder="12.345.678-9" 
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.rut}
                        onChange={(e) => setPacienteData({...pacienteData, rut: e.target.value})}
                        disabled={!!pacienteNN}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sexo" className="text-slate-300">
                        Sexo *
                      </Label>
                      <Select 
                        value={pacienteData.sexo}
                        onValueChange={(value) => setPacienteData({...pacienteData, sexo: value})}
                        disabled={!!pacienteNN}
                      >
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
                      <Label htmlFor="nombres" className="text-slate-300">
                        Nombres *
                      </Label>
                      <Input
                        id="nombres"
                        placeholder="Juan Carlos"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.nombres}
                        onChange={(e) => setPacienteData({...pacienteData, nombres: e.target.value})}
                        disabled={!!pacienteNN}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellidos" className="text-slate-300">
                        Apellidos *
                      </Label>
                      <Input
                        id="apellidos"
                        placeholder="González Pérez"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.apellidos}
                        onChange={(e) => setPacienteData({...pacienteData, apellidos: e.target.value})}
                        disabled={!!pacienteNN}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefono" className="text-slate-300">
                        Teléfono
                      </Label>
                      <Input
                        id="telefono"
                        placeholder="+56912345678"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.telefono}
                        onChange={(e) => setPacienteData({...pacienteData, telefono: e.target.value})}
                        disabled={!!pacienteNN}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fecha_nacimiento" className="text-slate-300">
                        Fecha de Nacimiento
                      </Label>
                      <Input
                        id="fecha_nacimiento"
                        type="date"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={pacienteData.fecha_nacimiento}
                        onChange={(e) => setPacienteData({...pacienteData, fecha_nacimiento: e.target.value})}
                        disabled={!!pacienteNN}
                      />
                    </div>
                  </div>
                  
                  {!pacienteNN && !pacienteCreado && (
                    <Button 
                      onClick={handleRegistrarPaciente} 
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? "Registrando..." : "Registrar Paciente"}
                    </Button>
                  )}
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
                        Presión Arterial (mmHg) *
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="presion-sistolica"
                          type="number"
                          placeholder="120"
                          className="bg-slate-800 border-slate-700 text-white"
                          value={signosData.presion_sistolica}
                          onChange={(e) => setSignosData({...signosData, presion_sistolica: e.target.value})}
                        />
                        <span className="text-slate-400 flex items-center">/</span>
                        <Input
                          id="presion-diastolica"
                          type="number"
                          placeholder="80"
                          className="bg-slate-800 border-slate-700 text-white"
                          value={signosData.presion_diastolica}
                          onChange={(e) => setSignosData({...signosData, presion_diastolica: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fc" className="text-slate-300">
                        Frecuencia Cardíaca (lpm) *
                      </Label>
                      <Input
                        id="fc"
                        type="number"
                        placeholder="75"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={signosData.frecuencia_cardiaca}
                        onChange={(e) => setSignosData({...signosData, frecuencia_cardiaca: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fr" className="text-slate-300">
                        Frecuencia Respiratoria (rpm) *
                      </Label>
                      <Input
                        id="fr"
                        type="number"
                        placeholder="16"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={signosData.frecuencia_respiratoria}
                        onChange={(e) => setSignosData({...signosData, frecuencia_respiratoria: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sato2" className="text-slate-300">
                        Saturación O₂ (%) *
                      </Label>
                      <Input
                        id="sato2"
                        type="number"
                        placeholder="98"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={signosData.saturacion_o2}
                        onChange={(e) => setSignosData({...signosData, saturacion_o2: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temperatura" className="text-slate-300">
                        Temperatura (°C) *
                      </Label>
                      <Input
                        id="temperatura"
                        type="number"
                        step="0.1"
                        placeholder="36.5"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={signosData.temperatura}
                        onChange={(e) => setSignosData({...signosData, temperatura: e.target.value})}
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
                        value={signosData.glucosa}
                        onChange={(e) => setSignosData({...signosData, glucosa: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eva" className="text-slate-300">
                      EVA - Escala Visual Análoga del Dolor
                    </Label>
                    <Select value={signosData.eva} onValueChange={(value) => setSignosData({...signosData, eva: value})}>
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
                    <Select value={signosData.escala_glasgow} onValueChange={(value) => setSignosData({...signosData, escala_glasgow: value})}>
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
                      Motivo de Consulta *
                    </Label>
                    <Textarea
                      id="motivo"
                      placeholder="Ej: Dolor torácico intenso hace 30 minutos"
                      className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                      value={fichaData.motivo_consulta}
                      onChange={(e) => setFichaData({...fichaData, motivo_consulta: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="circunstancias" className="text-slate-300">
                      Circunstancias del Incidente *
                    </Label>
                    <Textarea
                      id="circunstancias"
                      placeholder="Ej: Paciente en domicilio, refiere dolor opresivo irradiado a brazo izquierdo"
                      className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                      value={fichaData.circunstancias}
                      onChange={(e) => setFichaData({...fichaData, circunstancias: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prioridad" className="text-slate-300">
                      Categorización de Urgencia *
                    </Label>
                    <Select value={fichaData.prioridad} onValueChange={(value) => setFichaData({...fichaData, prioridad: value})}>
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
                  <Button 
                    onClick={handleEnviarFicha}
                    disabled={loading || (!pacienteCreado && !pacienteNN)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {loading ? "Enviando..." : "Enviar al Hospital"}
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
                    Medicamento *
                  </Label>
                  <Select 
                    value={solicitudData.medicamento}
                    onValueChange={(value) => setSolicitudData({...solicitudData, medicamento: value})}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Seleccionar medicamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aspirina 300mg">Aspirina 300mg</SelectItem>
                      <SelectItem value="Morfina 10mg">Morfina 10mg</SelectItem>
                      <SelectItem value="Epinefrina 1mg">Epinefrina 1mg</SelectItem>
                      <SelectItem value="Nitroglicerina sublingual">Nitroglicerina sublingual</SelectItem>
                      <SelectItem value="Adrenalina 1mg">Adrenalina 1mg</SelectItem>
                      <SelectItem value="Midazolam 5mg">Midazolam 5mg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosis" className="text-slate-300">
                    Dosis *
                  </Label>
                  <Input
                    id="dosis"
                    placeholder="Ej: 300mg vía oral"
                    className="bg-slate-800 border-slate-700 text-white"
                    value={solicitudData.dosis}
                    onChange={(e) => setSolicitudData({...solicitudData, dosis: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="justificacion" className="text-slate-300">
                    Justificación Clínica *
                  </Label>
                  <Textarea
                    id="justificacion"
                    placeholder="Ej: Sospecha de síndrome coronario agudo, paciente sin contraindicaciones"
                    className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    value={solicitudData.justificacion}
                    onChange={(e) => setSolicitudData({...solicitudData, justificacion: e.target.value})}
                  />
                </div>

                <Button 
                  onClick={handleSolicitarMedicamento}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  {loading ? "Enviando..." : "Enviar Solicitud al Médico"}
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
                {!Array.isArray(solicitudes) || solicitudes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No hay solicitudes registradas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {solicitudes.map((solicitud) => (
                      <div 
                        key={solicitud.id}
                        className={`p-4 border rounded-lg ${
                          solicitud.estado === 'pendiente'
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : solicitud.estado === 'autorizada'
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-red-500/30 bg-red-500/5'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-white">{solicitud.medicamento}</p>
                            <p className="text-sm text-slate-400">Dosis: {solicitud.dosis}</p>
                            <p className="text-sm text-slate-400">
                              Paciente: {solicitud.paciente?.nombre_completo || 'Paciente NN'}
                            </p>
                          </div>
                          <Badge className={
                            solicitud.estado === 'pendiente'
                              ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                              : solicitud.estado === 'autorizada'
                              ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-500 border-red-500/30'
                          }>
                            {solicitud.estado === 'pendiente' 
                              ? 'Pendiente'
                              : solicitud.estado === 'autorizada'
                              ? 'Autorizada'
                              : 'Rechazada'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">
                          Justificación: {solicitud.justificacion}
                        </p>
                        {solicitud.autorizado_por && (
                          <p className="text-sm text-slate-400 mb-2">
                            {solicitud.estado === 'autorizada' ? 'Autorizado' : 'Rechazado'} por: {solicitud.autorizado_por}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {new Date(solicitud.fecha_solicitud).toLocaleString('es-CL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <ModalPacienteNN open={modalNNOpen} onOpenChange={setModalNNOpen} onConfirm={handleConfirmNN} />
    </div>
  )
}
