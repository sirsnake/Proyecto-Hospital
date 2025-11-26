

import * as React from "react"
import { useState } from "react"
import { ChatPanel } from "./chat-panel"
import { SubidaArchivos } from "./subida-archivos"
import { GaleriaArchivos } from "./galeria-archivos"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Paperclip, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface Usuario {
  id: number
  username: string
  first_name: string
  last_name: string
  rol: string
}

interface ChatFlotanteProps {
  fichaId: number
  usuarioActual: Usuario
  className?: string
}

export function ChatFlotante({
  fichaId,
  usuarioActual,
  className,
}: ChatFlotanteProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)

  // Callback cuando se recibe un nuevo mensaje (para el contador de no leídos)
  // Se actualizará desde el ChatPanel

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className={cn(
            "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg",
            className
          )}
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {mensajesNoLeidos > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {mensajesNoLeidos > 9 ? "9+" : mensajesNoLeidos}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comunicación - Ficha #{fichaId}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Panel de comunicación para la ficha de emergencia
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mx-4 mt-4 flex-shrink-0">
            <TabsTrigger value="chat" className="gap-1">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="subir" className="gap-1">
              <Paperclip className="h-4 w-4" />
              Subir
            </TabsTrigger>
            <TabsTrigger value="archivos" className="gap-1">
              <FolderOpen className="h-4 w-4" />
              Archivos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 mt-0 p-4 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
            <ChatPanel
              fichaId={fichaId}
              usuarioActual={usuarioActual}
              className="flex-1 border-0 shadow-none flex flex-col overflow-hidden"
            />
          </TabsContent>

          <TabsContent value="subir" className="flex-1 mt-0 p-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sube imágenes, PDFs u otros documentos relacionados con esta ficha.
              </p>
              <SubidaArchivos
                fichaId={fichaId}
                onArchivoSubido={(archivo) => {
                  // Opcionalmente cambiar a tab de archivos después de subir
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="archivos" className="flex-1 mt-0 p-4 overflow-auto">
            <GaleriaArchivos
              fichaId={fichaId}
              className="border-0 shadow-none"
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
