import type React from "react"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getSession, clearSession, type User, getRoleName } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Activity, LogOut, UserIcon } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
  requiredRole?: string
}

export function DashboardLayout({ children, requiredRole }: DashboardLayoutProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getSession()

    if (!currentUser) {
      navigate("/")
      return
    }

    if (requiredRole && currentUser.rol !== requiredRole) {
      navigate("/")
      return
    }

    setUser(currentUser)
    setLoading(false)
  }, [navigate, requiredRole])

  const handleLogout = () => {
    clearSession()
    navigate("/")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const initials = (user.first_name || user.username || "Usuario")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Activity className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none text-white">Sistema de Gestión Médica</h1>
              <p className="text-xs text-slate-400">Servicio de Salud Regional</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-500 text-white">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-slate-900 border-slate-800" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-white">{user.first_name} {user.last_name}</p>
                  <p className="text-xs leading-none text-slate-400">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem disabled className="text-slate-400">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>{getRoleName(user.rol)}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-900/20">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container py-6 px-4 text-white">{children}</main>
    </div>
  )
}

export default DashboardLayout
