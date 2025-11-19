"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

        <div className="space-y-4 py-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-500 font-semibold">ID Temporal que se generará:</p>
            <p className="text-lg font-mono text-white mt-1">{generarIdTemporal()}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sexo-nn" className="text-slate-300">
              Sexo Aparente <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.sexo} onValueChange={(value) => setFormData({ ...formData, sexo: value })}>
              <SelectTrigger id="sexo-nn" className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="femenino">Femenino</SelectItem>
                <SelectItem value="indeterminado">Indeterminado</SelectItem>
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

          <div className="space-y-2">
            <Label htmlFor="caracteristicas-nn" className="text-slate-300">
              Características Físicas Distintivas
            </Label>
            <Input
              id="caracteristicas-nn"
              placeholder="Ej: Cicatriz en brazo derecho, tatuaje..."
              value={formData.caracteristicas}
              onChange={(e) => setFormData({ ...formData, caracteristicas: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
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
            disabled={!formData.sexo || !formData.edadAproximada}
          >
            Generar ID y Continuar
          </Button>
          <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
