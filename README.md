# 🏥 Sistema de Gestión de Urgencias Hospitalarias

[![Django](https://img.shields.io/badge/Django-5.2-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev/)

Sistema integral de gestión de urgencias médicas hospitalarias con flujo completo desde la atención pre-hospitalaria hasta el alta del paciente. Desarrollado con Django REST Framework y React + TypeScript.

---

## 📋 Tabla de Contenidos
- [Descripción](#-descripción)
- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Roles y Permisos](#-roles-y-permisos)
- [API Endpoints](#-api-endpoints)
- [Modelos de Datos](#-modelos-de-datos)
- [Sistema de Auditoría](#-sistema-de-auditoría)
- [Contribuir](#-contribuir)

---

## 📖 Descripción

Sistema completo de información médica para la gestión de urgencias hospitalarias que abarca todo el ciclo de atención:

1. **Atención Pre-hospitalaria**: Paramédicos registran pacientes en terreno
2. **Recepción en Hospital**: TENS realizan triage ESI y anamnesis
3. **Atención Médica**: Médicos diagnostican y definen tratamiento
4. **Gestión Administrativa**: Control de camas, usuarios y auditoría

---

## ✨ Características

### 🚑 Paramédicos
- Registro de pacientes en terreno (incluye pacientes NN)
- Captura de signos vitales en tiempo real
- Solicitud de medicamentos con autorización médica
- Geolocalización del incidente
- Chat en tiempo real con equipo médico
- Adjuntar fotos y documentos

### 🏥 TENS (Técnicos en Enfermería)
- Sistema de Triage ESI (5 niveles de urgencia)
- Registro completo de anamnesis
- Historial de alergias y antecedentes
- Monitoreo de signos vitales
- Gestión de exámenes solicitados
- Administración de medicamentos autorizados

### 👨‍⚕️ Médicos
- Vista de pacientes por prioridad
- Diagnósticos con códigos CIE-10
- Prescripción de tratamientos
- Autorización de medicamentos
- Solicitud de exámenes
- Tipos de alta: domicilio, hospitalización, UCI, derivación, fallecimiento
- Generación de documentos PDF (fichas, recetas, órdenes)

### 👔 Administradores
- **Gestión de Usuarios**: CRUD completo con roles
- **Gestión de Camas**: Estados (disponible/ocupada), asignación automática
- **Reportes y Estadísticas**: Atenciones, tiempos, ocupación
- **Auditoría Completa**: Registro de TODAS las acciones del sistema
- **Configuración del Hospital**: Capacidades y recursos

### 🔔 Sistema de Notificaciones
- Notificaciones en tiempo real por rol
- Alertas de emergencias críticas (ESI 1-2)
- Avisos de medicamentos autorizados/rechazados
- Mensajes de chat entre equipos

### 📊 Dashboard en Tiempo Real
- Estadísticas de ocupación
- Pacientes por estado y prioridad
- Tiempos de atención promedio
- Gráficos interactivos

---

## 🚀 Tecnologías

### Backend
| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| Python | 3.12+ | Lenguaje de programación |
| Django | 5.2.8 | Framework web |
| Django REST Framework | 3.15+ | API REST |
| MySQL | 8.0+ | Base de datos |
| WeasyPrint | 63+ | Generación de PDFs |

### Frontend
| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| React | 19 | Biblioteca UI |
| TypeScript | 5.6 | Tipado estático |
| Vite | 6.0 | Build tool |
| Tailwind CSS | 4.0 | Framework CSS |
| shadcn/ui | Latest | Componentes UI |
| Lucide React | Latest | Iconos |
| Recharts | 2.15 | Gráficos |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui    │
│                    (localhost:3001)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST API
                          │ (JSON + CSRF)
┌─────────────────────────▼───────────────────────────────────┐
│                        BACKEND                               │
│         Django 5.2 + Django REST Framework                   │
│                    (localhost:8000)                          │
├──────────────────────────────────────────────────────────────┤
│  Views │ Serializers │ Models │ Permissions │ AuditLog      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                       DATABASE                               │
│                   MySQL 8.0 (hospital)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Instalación

### Prerrequisitos
- Python 3.12+
- Node.js 18+
- MySQL 8.0+
- Git

### 1. Clonar el repositorio

```bash
git clone https://github.com/sirsnake/Proyecto-Hospital.git
cd Proyecto-Hospital
```

### 2. Configurar Backend (Django)

```bash
# Crear entorno virtual
python -m venv .venv

# Activar entorno virtual
# En macOS/Linux:
source .venv/bin/activate
# En Windows:
# .venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Ir al directorio del proyecto Django
cd proyectohospital

# Crear base de datos MySQL
mysql -u root -p
```

```sql
CREATE DATABASE hospital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'snaket';
GRANT ALL PRIVILEGES ON hospital.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Aplicar migraciones
python manage.py migrate

# Crear usuarios de prueba
python manage.py crear_usuarios

# Crear superusuario (opcional)
python manage.py createsuperuser
```

### 3. Configurar Frontend (React + Vite)

```bash
# Ir al directorio frontend
cd ../frontend

# Instalar dependencias
npm install
```

---

## 🎯 Uso

### Iniciar el Backend

```bash
cd proyectohospital
python manage.py runserver
```

El backend estará disponible en: `http://localhost:8000`

**Panel de administración Django:** `http://localhost:8000/admin`

### Iniciar el Frontend

En otra terminal:

```bash
cd frontend
npm run dev
```

El frontend estará disponible en: `http://localhost:3001`

---

## 👤 Roles y Permisos

### Usuarios de Prueba

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| `paramedico` | `para123` | Paramédico | Registro en terreno |
| `tens` | `tens123` | TENS | Triage y anamnesis |
| `medico` | `medico123` | Médico | Diagnóstico y tratamiento |
| `admin` | `admin123` | Administrador | Gestión completa |

### Matriz de Permisos

| Funcionalidad | Paramédico | TENS | Médico | Admin |
|--------------|:----------:|:----:|:------:|:-----:|
| Crear fichas de emergencia | ✅ | ❌ | ❌ | ❌ |
| Registrar signos vitales | ✅ | ✅ | ❌ | ❌ |
| Solicitar medicamentos | ✅ | ❌ | ❌ | ❌ |
| Autorizar medicamentos | ❌ | ❌ | ✅ | ❌ |
| Realizar triage | ❌ | ✅ | ❌ | ❌ |
| Registrar anamnesis | ❌ | ✅ | ❌ | ❌ |
| Crear diagnósticos | ❌ | ❌ | ✅ | ❌ |
| Dar de alta pacientes | ❌ | ❌ | ✅ | ❌ |
| Gestionar usuarios | ❌ | ❌ | ❌ | ✅ |
| Gestionar camas | ❌ | ❌ | ❌ | ✅ |
| Ver auditoría | ❌ | ❌ | ❌ | ✅ |
| Ver reportes | ❌ | ❌ | ❌ | ✅ |

---

## 📡 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/csrf/` | Obtener CSRF token |
| `POST` | `/api/login/` | Iniciar sesión |
| `POST` | `/api/logout/` | Cerrar sesión |
| `GET` | `/api/current-user/` | Usuario actual |

### Pacientes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/pacientes/` | Listar pacientes |
| `POST` | `/api/pacientes/` | Crear paciente |
| `GET` | `/api/pacientes/{id}/` | Obtener paciente |
| `GET` | `/api/pacientes/buscar/?q=...` | Buscar paciente |
| `GET` | `/api/pacientes/{id}/historial/` | Historial completo |

### Fichas de Emergencia
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/fichas/` | Listar fichas |
| `POST` | `/api/fichas/` | Crear ficha |
| `GET` | `/api/fichas/en_ruta/` | Fichas en ruta |
| `GET` | `/api/fichas/en_hospital/` | Fichas en hospital |
| `GET` | `/api/fichas/atendidas/` | Fichas atendidas |
| `GET` | `/api/fichas/dados_de_alta/` | Pacientes dados de alta |
| `GET` | `/api/fichas/hospitalizados/` | Pacientes hospitalizados |
| `GET` | `/api/fichas/en_uci/` | Pacientes en UCI |
| `POST` | `/api/fichas/{id}/cambiar_estado/` | Cambiar estado |
| `POST` | `/api/fichas/{id}/asignar_medico/` | Asignar médico |

### Triage
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/triage/` | Listar triages |
| `POST` | `/api/triage/` | Crear triage |
| `GET` | `/api/triage/pendientes/` | Fichas sin triage |
| `GET` | `/api/triage/estadisticas/` | Estadísticas del día |

### Solicitudes de Medicamentos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/solicitudes-medicamentos/` | Listar solicitudes |
| `POST` | `/api/solicitudes-medicamentos/` | Crear solicitud |
| `GET` | `/api/solicitudes-medicamentos/pendientes/` | Pendientes |
| `POST` | `/api/solicitudes-medicamentos/{id}/autorizar/` | Autorizar |
| `POST` | `/api/solicitudes-medicamentos/{id}/rechazar/` | Rechazar |

### Exámenes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/solicitudes-examenes/` | Listar exámenes |
| `POST` | `/api/solicitudes-examenes/` | Solicitar examen |
| `GET` | `/api/solicitudes-examenes/pendientes/` | Pendientes |
| `POST` | `/api/solicitudes-examenes/{id}/marcar_proceso/` | En proceso |
| `POST` | `/api/solicitudes-examenes/{id}/completar/` | Completar |

### Camas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/camas/` | Listar camas |
| `POST` | `/api/camas/` | Crear cama |
| `DELETE` | `/api/camas/{id}/` | Eliminar cama |
| `GET` | `/api/camas/disponibles/` | Camas disponibles |
| `GET` | `/api/camas/estadisticas/` | Estadísticas |
| `POST` | `/api/camas/{id}/asignar/` | Asignar paciente |
| `POST` | `/api/camas/{id}/liberar/` | Liberar cama |
| `POST` | `/api/camas/{id}/cambiar_estado/` | Cambiar estado |

### Usuarios (Solo Admin)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/usuarios/` | Listar usuarios |
| `POST` | `/api/usuarios/` | Crear usuario |
| `PUT` | `/api/usuarios/{id}/` | Editar usuario |
| `DELETE` | `/api/usuarios/{id}/` | Desactivar usuario |
| `GET` | `/api/usuarios/medicos/` | Listar médicos |
| `GET` | `/api/usuarios/estadisticas/` | Estadísticas |

### Auditoría (Solo Admin)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/audit/` | Listar logs |
| `GET` | `/api/audit/resumen/` | Resumen del día |

### Documentos PDF
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/documentos/ficha/{id}/` | PDF ficha completa |
| `GET` | `/api/documentos/receta/{id}/` | PDF receta médica |
| `GET` | `/api/documentos/orden-examenes/{id}/` | PDF orden exámenes |
| `GET` | `/api/documentos/alta/{id}/` | PDF alta médica |

### Notificaciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/notificaciones/` | Mis notificaciones |
| `GET` | `/api/notificaciones/no_leidas/` | No leídas |
| `GET` | `/api/notificaciones/conteo/` | Conteo no leídas |
| `POST` | `/api/notificaciones/{id}/marcar_leida/` | Marcar leída |
| `POST` | `/api/notificaciones/marcar_todas_leidas/` | Marcar todas |

### Chat
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/mensajes/?ficha={id}` | Mensajes de ficha |
| `POST` | `/api/mensajes/` | Enviar mensaje |
| `GET` | `/api/poll-updates/` | Polling tiempo real |

---

## 🗄️ Modelos de Datos

### Diagrama Simplificado

```
Usuario (AbstractUser)
    │
    ├── rol: paramedico | tens | medico | administrador
    ├── rut, telefono, especialidad
    └── is_active, date_joined
    
Paciente
    │
    ├── rut, nombres, apellidos
    ├── es_nn (paciente no identificado)
    ├── id_temporal (para NN)
    └── datos demográficos
    
FichaEmergencia
    │
    ├── paciente (FK)
    ├── paramedico (FK)
    ├── estado: en_ruta | en_hospital | atendido | dado_de_alta | hospitalizado | uci | derivado | fallecido
    ├── prioridad: C1-C5
    ├── motivo_consulta
    └── geolocalización
    
SignosVitales
    │
    ├── ficha (FK)
    ├── frecuencia_cardiaca, presion, temperatura
    ├── saturacion_oxigeno, frecuencia_respiratoria
    └── timestamp
    
Triage
    │
    ├── ficha (FK)
    ├── nivel_esi: 1-5
    ├── motivo_consulta_triage
    └── evaluación de dolor, movilidad, etc.
    
Anamnesis
    │
    ├── ficha (FK)
    ├── tens (FK)
    ├── alergias, antecedentes
    └── medicamentos habituales
    
Diagnostico
    │
    ├── ficha (FK)
    ├── medico (FK)
    ├── diagnostico_principal, secundario
    ├── codigo_cie10
    ├── tratamiento, indicaciones
    └── tipo_alta: domicilio | hospitalizacion | uci | derivacion | voluntaria | fallecido
    
Cama
    │
    ├── numero, piso, tipo
    ├── estado: disponible | ocupada | mantenimiento | limpieza
    └── ficha_actual (FK nullable)
    
AuditLog
    │
    ├── usuario (FK)
    ├── accion, modelo, objeto_id
    ├── detalles (JSON)
    └── ip_address, timestamp
```

---

## 🔍 Sistema de Auditoría

El sistema registra **TODAS** las acciones realizadas:

### Acciones Auditadas

| Modelo | Acciones |
|--------|----------|
| **Sesión** | login, logout |
| **Paciente** | crear, editar |
| **FichaEmergencia** | crear, cambiar_estado, asignar_medico, alta |
| **SignosVitales** | crear |
| **Anamnesis** | crear, editar |
| **Triage** | crear |
| **Diagnostico** | crear |
| **SolicitudMedicamento** | autorizar, rechazar |
| **SolicitudExamen** | crear, marcar_proceso, completar |
| **Cama** | crear, editar, eliminar, asignar, liberar |
| **Usuario** | crear, editar, eliminar |
| **ArchivoAdjunto** | crear, eliminar |
| **MensajeChat** | crear |
| **DocumentosPDF** | generar_pdf |

### Datos Registrados

Cada entrada de auditoría incluye:
- `usuario`: Quién realizó la acción
- `accion`: Tipo de acción
- `modelo`: Entidad afectada
- `objeto_id`: ID del registro
- `detalles`: JSON con contexto
- `ip_address`: IP del cliente
- `timestamp`: Fecha y hora

---

## 📁 Estructura del Proyecto

```
Proyecto-Hospital/
├── frontend/                     # React + Vite
│   ├── src/
│   │   ├── components/          # Componentes reutilizables
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   └── ...
│   │   ├── pages/               # Páginas de la aplicación
│   │   │   ├── LoginPage.tsx
│   │   │   └── dashboard/
│   │   │       ├── admin/       # Dashboard administrador
│   │   │       ├── medico/      # Dashboard médico
│   │   │       ├── paramedico/  # Dashboard paramédico
│   │   │       └── tens/        # Dashboard TENS
│   │   ├── lib/                 # Utilidades
│   │   │   ├── api.ts           # Cliente API
│   │   │   ├── auth.ts          # Autenticación
│   │   │   └── types.ts         # Tipos TypeScript
│   │   ├── hooks/               # Custom hooks
│   │   └── App.tsx              # Componente raíz
│   ├── package.json
│   └── vite.config.ts
│
├── proyectohospital/            # Django Backend
│   ├── urgencias/               # App principal
│   │   ├── models.py            # 15 modelos de datos
│   │   ├── serializers.py       # Serializers REST
│   │   ├── views.py             # ViewSets y endpoints
│   │   ├── urls.py              # Rutas API
│   │   ├── admin.py             # Panel admin
│   │   ├── templates/pdf/       # Templates para PDFs
│   │   └── management/commands/ # Comandos personalizados
│   ├── proyectohospital/        # Configuración Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── manage.py
│
├── requirements.txt             # Dependencias Python
├── README.md                    # Este archivo
└── .gitignore
```

---

## 🔧 Comandos Útiles

### Django

```bash
# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Recrear usuarios de prueba
python manage.py crear_usuarios

# Verificar proyecto
python manage.py check

# Shell de Django
python manage.py shell
```

### Frontend

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Preview de producción
npm run preview

# Linting
npm run lint
```

---

## 🔒 Seguridad

- ✅ Autenticación por sesiones de Django
- ✅ CSRF tokens en todas las peticiones
- ✅ CORS configurado para orígenes permitidos
- ✅ Protección de rutas por rol
- ✅ Auditoría completa de acciones
- ✅ Passwords hasheados con PBKDF2
- ✅ Validación de datos en backend

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/NuevaFuncionalidad`)
3. Commit tus cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/NuevaFuncionalidad`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es para uso educativo e institucional.

---

## 👥 Autores

Sistema desarrollado como proyecto de gestión hospitalaria.

---

## 🐛 Reportar Issues

Para reportar bugs o solicitar funcionalidades, crear un issue en:
https://github.com/sirsnake/Proyecto-Hospital/issues

---

**⚠️ Nota:** Este sistema está en desarrollo. Requiere configuración adicional de seguridad para uso en producción.
