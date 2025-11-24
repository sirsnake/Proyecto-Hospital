"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

interface ModalPacienteNNProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: any) => void
}

export function ModalPacienteNN({ open, onOpenChange, onConfirm }: ModalPacienteNNProps) {
  const [formData, setFormData] = useState({
    sexo: "",
    edadAproximada: "",
    caracteristicas: "",
    // Signos vitales
    presionSistolica: "",
    presionDiastolica: "",
    frecuenciaCardiaca: "",
    frecuenciaRespiratoria: "",
    temperatura: "",
    saturacionOxigeno: "",
    glicemia: "",
    // Medicamentos
    necesitaMedicamento: false,
    medicamentos: "",
    observacionesMedicamento: "",
  })

  const generarIdTemporal = () => {
    const fecha = new Date()
    const año = fecha.getFullYear()
    const numero = Math.floor(Math.random() * 9999) + 1
    return `NN-${año}-${String(numero).padStart(4, "0")}`
  }

  const handleConfirm = () => {
    const idTemporal = generarIdTemporal()
    onConfirm({
      ...formData,
      idTemporal,
      esNN: true,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Registrar Paciente Sin Identificación (NN)</DialogTitle>
          <DialogDescription className="text-slate-400">
            Se generará un ID temporal para el paciente. Complete los datos disponibles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-500 font-semibold">ID Temporal que se generará:</p>
            <p className="text-lg font-mono text-white mt-1">{generarIdTemporal()}</p>
          </div>

          {/* DATOS BÁSICOS */}
          <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Datos Básicos del Paciente
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sexo-nn" className="text-slate-300">
                  Sexo Aparente <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.sexo} onValueChange={(value) => setFormData({ ...formData, sexo: value })}>
                  <SelectTrigger id="sexo-nn" className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edad-nn" className="text-slate-300">
                  Edad Aproximada (años) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edad-nn"
                  type="number"
                  placeholder="Ej: 35"
                  value={formData.edadAproximada}
                  onChange={(e) => setFormData({ ...formData, edadAproximada: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caracteristicas-nn" className="text-slate-300">
                Características Físicas Distintivas
              </Label>
              <Textarea
                id="caracteristicas-nn"
                placeholder="Ej: Cicatriz en brazo derecho, tatuaje en el hombro, complexión delgada..."
                value={formData.caracteristicas}
                onChange={(e) => setFormData({ ...formData, caracteristicas: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white min-h-[60px]"
              />
            </div>
          </div>

          {/* SIGNOS VITALES */}
          <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Signos Vitales <span className="text-red-500">*</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300">Presión Arterial (mmHg) <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Sistólica"
                    value={formData.presionSistolica}
                    onChange={(e) => setFormData({ ...formData, presionSistolica: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <span className="text-slate-400 self-center">/</span>
                  <Input
                    type="number"
                    placeholder="Diastólica"
                    value={formData.presionDiastolica}
                    onChange={(e) => setFormData({ ...formData, presionDiastolica: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Frecuencia Cardíaca (lpm) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  placeholder="Ej: 80"
                  value={formData.frecuenciaCardiaca}
                  onChange={(e) => setFormData({ ...formData, frecuenciaCardiaca: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Frecuencia Respiratoria (rpm) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  placeholder="Ej: 16"
                  value={formData.frecuenciaRespiratoria}
                  onChange={(e) => setFormData({ ...formData, frecuenciaRespiratoria: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Temperatura (°C) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ej: 36.5"
                  value={formData.temperatura}
                  onChange={(e) => setFormData({ ...formData, temperatura: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Saturación O2 (%) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  placeholder="Ej: 98"
                  value={formData.saturacionOxigeno}
                  onChange={(e) => setFormData({ ...formData, saturacionOxigeno: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Glicemia (mg/dL)</Label>
                <Input
                  type="number"
                  placeholder="Opcional"
                  value={formData.glicemia}
                  onChange={(e) => setFormData({ ...formData, glicemia: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* MEDICAMENTOS */}
          <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3">
              <Checkbox
                id="necesita-medicamento"
                checked={formData.necesitaMedicamento}
                onCheckedChange={(checked) => setFormData({ ...formData, necesitaMedicamento: checked as boolean })}
                className="border-slate-600"
              />
              <Label htmlFor="necesita-medicamento" className="text-lg font-semibold text-white cursor-pointer flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                ¿Requiere medicamentos inmediatos?
              </Label>
            </div>

            {formData.necesitaMedicamento && (
              <div className="space-y-3 mt-3 pl-8">
                <div className="space-y-2">
                  <Label className="text-slate-300">Medicamentos Administrados</Label>
                  <Textarea
                    placeholder="Ej: Paracetamol 500mg vía oral&#10;Suero fisiológico 500ml IV"
                    value={formData.medicamentos}
                    onChange={(e) => setFormData({ ...formData, medicamentos: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Observaciones sobre medicación</Label>
                  <Textarea
                    placeholder="Ej: Paciente presentó reacción alérgica leve..."
                    value={formData.observacionesMedicamento}
                    onChange={(e) => setFormData({ ...formData, observacionesMedicamento: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white min-h-[60px]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400">
              💡 Este ID temporal se usará hasta que se identifique al paciente. Todos los registros médicos quedarán
              asociados a este ID.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleConfirm}
            disabled={
              !formData.sexo || 
              !formData.edadAproximada || 
              !formData.presionSistolica || 
              !formData.presionDiastolica ||
              !formData.frecuenciaCardiaca ||
              !formData.frecuenciaRespiratoria ||
              !formData.temperatura ||
              !formData.saturacionOxigeno
            }
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Generar Ficha Completa
          </Button>
          <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
