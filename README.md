# 🏥 Sistema de Gestión de Urgencias Médicas

Sistema completo de gestión de urgencias hospitalarias con backend Django + MySQL y frontend Next.js + TypeScript.

## 📋 Descripción

Sistema de información médica para la gestión de urgencias que permite:

- 🚑 Registro de pacientes en terreno por paramédicos
- 📊 Seguimiento de signos vitales en tiempo real
- 💊 Solicitud y autorización de medicamentos
- 📝 Registro de anamnesis por TENS
- 🩺 Diagnósticos médicos con códigos CIE-10
- 👥 Gestión por roles (Paramédico, TENS, Médico, Administrador)

## 🚀 Tecnologías

### Backend
- **Django 5.2** - Framework web Python
- **Django REST Framework** - API REST
- **MySQL** - Base de datos
- **Python 3.14** - Lenguaje de programación

### Frontend
- **Next.js 16** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **shadcn/ui** - Componentes UI

## 📦 Instalación

### Prerrequisitos
- Python 3.14+
- Node.js 18+
- MySQL 8.0+
- Git

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Hospital
```

### 2. Configurar Backend (Django)

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En macOS/Linux:
source venv/bin/activate
# En Windows:
# venv\Scripts\activate

# Instalar dependencias
pip install django djangorestframework mysqlclient django-cors-headers python-decouple

# Ir al directorio del proyecto Django
cd proyectohospital

# Crear base de datos MySQL
mysql -u root -p
CREATE DATABASE hospital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'snaket';
GRANT ALL PRIVILEGES ON hospital.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Aplicar migraciones
python manage.py migrate

# Crear usuarios de prueba
python manage.py crear_usuarios

# Crear superusuario (opcional)
python manage.py createsuperuser
```

### 3. Configurar Frontend (Next.js)

```bash
# Volver al directorio raíz
cd ..

# Instalar dependencias
npm install
# o
pnpm install
```

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
npm run dev
# o
pnpm dev
```

El frontend estará disponible en: `http://localhost:3000`

## 👤 Usuarios de Prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| paramedico@salud.cl | para123 | Paramédico |
| tens@salud.cl | tens123 | TENS |
| medico@salud.cl | medico123 | Médico |
| admin@salud.cl | admin123 | Administrador |

## 📡 API Endpoints

### Autenticación
- `POST /api/login/` - Iniciar sesión
- `POST /api/logout/` - Cerrar sesión
- `GET /api/current-user/` - Obtener usuario actual

### Pacientes
- `GET /api/pacientes/` - Listar pacientes
- `POST /api/pacientes/` - Crear paciente
- `GET /api/pacientes/{id}/` - Obtener paciente
- `GET /api/pacientes/buscar/?rut=...` - Buscar paciente

### Fichas de Emergencia
- `GET /api/fichas/` - Listar fichas
- `POST /api/fichas/` - Crear ficha
- `GET /api/fichas/en_ruta/` - Fichas en ruta
- `GET /api/fichas/en_hospital/` - Fichas en hospital
- `POST /api/fichas/{id}/cambiar_estado/` - Cambiar estado

### Solicitudes de Medicamentos
- `GET /api/solicitudes-medicamentos/` - Listar solicitudes
- `POST /api/solicitudes-medicamentos/` - Crear solicitud
- `GET /api/solicitudes-medicamentos/pendientes/` - Solicitudes pendientes
- `POST /api/solicitudes-medicamentos/{id}/autorizar/` - Autorizar
- `POST /api/solicitudes-medicamentos/{id}/rechazar/` - Rechazar

### Anamnesis
- `POST /api/anamnesis/` - Crear anamnesis
- `PATCH /api/anamnesis/{id}/` - Actualizar anamnesis

### Diagnósticos
- `POST /api/diagnosticos/` - Crear diagnóstico
- `PATCH /api/diagnosticos/{id}/` - Actualizar diagnóstico

## 📁 Estructura del Proyecto

```
Hospital/
├── app/                          # Frontend Next.js
│   ├── dashboard/               # Dashboards por rol
│   │   ├── paramedico/
│   │   ├── tens/
│   │   ├── medico/
│   │   └── administrador/
│   ├── layout.tsx
│   └── page.tsx                 # Página de login
│
├── components/                   # Componentes React
│   ├── ui/                      # Componentes de UI
│   ├── login-form.tsx
│   └── dashboard-layout.tsx
│
├── lib/                         # Utilidades
│   ├── api.ts                   # Servicio de API
│   ├── auth.ts                  # Autenticación
│   └── types.ts                 # Tipos TypeScript
│
├── proyectohospital/            # Backend Django
│   ├── urgencias/               # App principal
│   │   ├── models.py            # Modelos de BD
│   │   ├── serializers.py       # Serializers
│   │   ├── views.py             # Views/Endpoints
│   │   ├── urls.py              # URLs
│   │   └── admin.py             # Admin
│   └── proyectohospital/        # Configuración
│       └── settings.py
│
├── public/                      # Archivos estáticos
├── styles/                      # Estilos globales
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

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

# Shell de Django
python manage.py shell
```

### Next.js

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar producción
npm start

# Linting
npm run lint
```

## 🗄️ Base de Datos

### Modelos Principales

- **Usuario** - Usuarios del sistema con roles
- **Paciente** - Información de pacientes (incluye NN)
- **FichaEmergencia** - Fichas de emergencia completas
- **SignosVitales** - Registro de signos vitales
- **SolicitudMedicamento** - Solicitudes y autorizaciones
- **Anamnesis** - Historia clínica del paciente
- **Diagnostico** - Diagnósticos médicos CIE-10

## 🔒 Seguridad

- Autenticación por sesiones de Django
- CSRF tokens automáticos
- CORS configurado para localhost
- Credenciales incluidas en peticiones
- Protección de rutas por rol

## 📝 Documentación Adicional

- `README_INTEGRACION.md` - Guía detallada de integración backend-frontend
- Panel de admin Django: `http://localhost:8000/admin`

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es para uso interno de la institución médica.

## 👥 Autores

- Sistema desarrollado para gestión de urgencias hospitalarias

## 🐛 Reportar Issues

Para reportar bugs o solicitar funcionalidades, crear un issue en el repositorio.

---

**Nota:** Este es un sistema en desarrollo. No usar en producción sin configuración adicional de seguridad y optimización.
