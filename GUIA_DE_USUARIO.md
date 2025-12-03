# 📘 Guía de Usuario - Sistema de Gestión Hospitalaria de Emergencias

## 📑 Índice

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Dashboard Paramédico](#3-dashboard-paramédico)
4. [Dashboard TENS](#4-dashboard-tens)
5. [Dashboard Médico](#5-dashboard-médico)
6. [Dashboard Administrador](#6-dashboard-administrador)
7. [Elementos Comunes](#7-elementos-comunes)
8. [Flujo de Trabajo](#8-flujo-de-trabajo)
9. [Preguntas Frecuentes](#9-preguntas-frecuentes)

---

## 1. Introducción

### 1.1 ¿Qué es este Sistema?

El **Sistema de Gestión Hospitalaria de Emergencias** es una plataforma integral diseñada para gestionar todo el flujo de atención de pacientes de urgencia, desde el momento en que el paramédico recibe la llamada de emergencia hasta que el paciente es dado de alta.

### 1.2 Roles del Sistema

El sistema cuenta con **4 roles principales**, cada uno con funciones específicas:

| Rol | Función Principal | Acceso |
|-----|-------------------|--------|
| **Paramédico** | Atención pre-hospitalaria, creación de fichas, traslado de pacientes | Ambulancia / Móvil |
| **TENS** | Triage, toma de signos vitales, preparación del paciente | Urgencias |
| **Médico** | Diagnóstico, tratamiento, prescripción, alta médica | Urgencias / Hospital |
| **Administrador** | Gestión de usuarios, turnos, camas y configuración | Administración |

### 1.3 Requisitos del Sistema

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet estable
- Resolución mínima recomendada: 1280x720

---

## 2. Acceso al Sistema

### 2.1 Pantalla de Login

Para acceder al sistema, ingrese a la URL proporcionada por su institución.

| Elemento | Descripción | Ejemplo |
|----------|-------------|---------|
| **Campo Email** | Ingrese su correo electrónico institucional | medico@hospital.cl |
| **Campo Contraseña** | Ingrese su contraseña de acceso | ******** |
| **Botón "Iniciar Sesión"** | Valida credenciales y redirige al dashboard según su rol | - |
| **Selector de Tema 🌙/☀️** | Alterna entre modo oscuro y modo claro | - |

### 2.2 Credenciales de Demostración

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@hospital.cl | admin123 |
| Médico | medico@hospital.cl | medico123 |
| Paramédico | paramedico@hospital.cl | paramedico123 |
| TENS | tens@hospital.cl | tens123 |

---

## 3. Dashboard Paramédico

### 3.1 Descripción General

El **Paramédico** es el primer eslabón en la cadena de atención de emergencias. Su rol es fundamental para:

- ✅ Crear fichas de emergencia con datos del paciente
- ✅ Registrar signos vitales durante el traslado
- ✅ Categorizar la urgencia del paciente
- ✅ Comunicarse con el equipo del hospital
- ✅ Coordinar la entrega del paciente

### 3.2 Pantalla Principal - Atención Pre-Hospitalaria

#### Header Superior

| Elemento | Ubicación | Descripción |
|----------|-----------|-------------|
| **Logo + "Atención Pre-Hospitalaria"** | Izquierda | Identifica el módulo actual del paramédico |
| **Indicador "20 min / 4.8 km"** | Derecha | Tiempo estimado y distancia al hospital más cercano |
| **🔔 Campana de Notificaciones** | Derecha | Alertas del sistema y mensajes del hospital |
| **↪️ Botón Salir** | Extremo derecho | Cierra la sesión |

#### Botones de Navegación Principal

| Botón | Apariencia | Función |
|-------|------------|---------|
| **"+ Nueva Ficha"** | Verde sólido | Abre formulario para crear nueva ficha de emergencia |
| **"Mis Traslados [N]"** | Azul con contador | Lista de pacientes trasladados |

#### Barra de Estado Inferior

| Elemento | Descripción |
|----------|-------------|
| **🟢 "En turno: Turno PM (Noche) (Voluntario)"** | Indica turno actual del paramédico |

### 3.3 Crear Nueva Ficha de Emergencia

#### Paso 1: Categorización de Urgencia

| Categoría | Color | Nombre | Significado | Tiempo de Atención |
|-----------|-------|--------|-------------|-------------------|
| **C1** | 🔴 Rojo oscuro | Vital | Riesgo vital inmediato | Inmediato |
| **C2** | 🟠 Naranja | Emergencia | Emergencia rápida | < 10 minutos |
| **C3** | 🟡 Amarillo | Urgente | Urgente pero estable | < 30 minutos |
| **C4** | 🟢 Verde claro | Menor | Urgencia menor | < 60 minutos |
| **C5** | 🟢 Verde oscuro | No Urgente | Puede esperar | < 120 minutos |

#### Paso 2: Identificación del Paciente

| Campo | Obligatorio | Descripción | Ejemplo |
|-------|-------------|-------------|---------|
| **Toggle "¿Paciente sin identificación?"** | - | Para pacientes NN/inconscientes | - |
| **RUT** | ✅ Sí | Identificación del paciente | 12.345.678-9 |
| **Sexo** | ✅ Sí | Masculino o Femenino | Masculino |
| **Nombres** | ✅ Sí | Nombres completos | Juan Carlos |
| **Apellidos** | ✅ Sí | Apellidos | González Pérez |
| **Fecha de Nacimiento** | ✅ Sí | Para calcular edad | 11/11/1991 |
| **Teléfono** | No | Contacto | 999999999 |

#### Paso 3: Signos Vitales

| Signo Vital | Rango Normal | Unidad | Descripción |
|-------------|--------------|--------|-------------|
| **Presión Arterial** | 90-140 / 60-90 | mmHg | Sistólica/Diastólica |
| **Frecuencia Cardíaca (FC)** | 60-100 | lpm | Latidos por minuto |
| **Frecuencia Respiratoria (FR)** | 12-20 | rpm | Respiraciones por minuto |
| **Saturación O₂ (SatO₂)** | 95-100 | % | Oxígeno en sangre |
| **Temperatura** | 36.0-37.5 | °C | Temperatura corporal |
| **Glucosa** | 70-110 | mg/dL | Azúcar en sangre (opcional) |

#### Paso 4: Escala de Glasgow (3-15 puntos)

**Apertura Ocular (O) - Máximo 4 puntos**

| Respuesta | Puntaje | Descripción |
|-----------|---------|-------------|
| **Espontánea** | 4 | Abre los ojos sin estímulo |
| **Al hablarle** | 3 | Abre al escuchar orden verbal |
| **Al dolor** | 2 | Solo ante estímulo doloroso |
| **Ninguna** | 1 | No abre los ojos |

**Respuesta Verbal (V) - Máximo 5 puntos**

| Respuesta | Puntaje | Descripción |
|-----------|---------|-------------|
| **Orientada** | 5 | Conversación coherente |
| **Confusa** | 4 | Conversa pero desorientado |
| **Inapropiada** | 3 | Palabras incoherentes |
| **Sonidos** | 2 | Solo quejidos |
| **Ninguna** | 1 | Sin respuesta |

**Respuesta Motora (M) - Máximo 6 puntos**

| Respuesta | Puntaje | Descripción |
|-----------|---------|-------------|
| **Obedece** | 6 | Obedece órdenes |
| **Localiza** | 5 | Localiza el dolor |
| **Retira** | 4 | Retira ante dolor |
| **Flexión** | 3 | Flexión anormal |
| **Extensión** | 2 | Extensión anormal |
| **Ninguna** | 1 | Sin respuesta |

**Interpretación del Puntaje Total**

| Rango | Clasificación | Significado |
|-------|---------------|-------------|
| **15** | Normal | Completamente alerta |
| **13-14** | Leve | Alteración leve |
| **9-12** | Moderado | Alteración moderada |
| **3-8** | Severo | Coma, requiere UCI |

#### Paso 5: Escala EVA de Dolor (0-10)

| Valor | Color | Clasificación |
|-------|-------|---------------|
| **0** | 🟢 Verde | Sin dolor |
| **1-3** | 🟢 Verde claro | Dolor leve |
| **4-6** | 🟡 Amarillo | Dolor moderado |
| **7-9** | 🟠 Naranja | Dolor severo |
| **10** | 🔴 Rojo | Dolor máximo |

#### Paso 6: Evaluación Clínica

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Motivo de Consulta** | ✅ Sí | Razón principal de la emergencia |
| **Circunstancias del Incidente** | ✅ Sí | Cómo, cuándo y dónde ocurrió |

#### Paso 7: Solicitud de Medicamento (Opcional)

| Campo | Descripción |
|-------|-------------|
| **Medicamento** | Nombre del medicamento |
| **Dosis** | Cantidad y unidad |
| **Vía** | Oral, IV, IM, SC |
| **Motivo** | Justificación clínica |

#### Botón "Enviar al Hospital"

Crea la ficha y notifica al hospital de la llegada del paciente.

### 3.4 Mis Traslados

#### Tarjeta de Paciente

| Elemento | Descripción |
|----------|-------------|
| **Icono con Categoría (C1-C5)** | Categoría de urgencia con color |
| **Nombre del Paciente** | Nombre completo |
| **Número de Ficha** | Ej: Ficha #2 |
| **Fecha y Hora** | Momento de creación |
| **Badge de Estado** | Estado actual en el hospital |
| **Flecha ˅** | Expandir detalles |

#### Estados Posibles

| Estado | Color | Significado |
|--------|-------|-------------|
| **En Hospital** | 🟢 Verde | Esperando atención |
| **En Atención** | 🔵 Azul | Siendo atendido |
| **Hospitalizado** | 🟣 Morado | Ingresado en cama |
| **En UCI** | 🔴 Rojo | Cuidados intensivos |
| **Dado de Alta** | ⚪ Gris | Finalizado |

#### Tarjetas de Signos Vitales (Expandido)

| Tarjeta | Icono | Ejemplo |
|---------|-------|---------|
| **Presión** | ❤️ | 120/80 mmHg |
| **FC** | 📈 | 75 lpm |
| **SatO₂** | 💨 | 98% |
| **FR** | 🫁 | 16 rpm |
| **Temp** | 🌡️ | 36.0 °C |

### 3.5 Chat de Coordinación

#### Header del Chat

| Elemento | Descripción |
|----------|-------------|
| **← Flecha atrás** | Volver a Mis Traslados |
| **"Chat - Ficha #N"** | Identificador de la ficha |
| **Nombre del Paciente** | Referencia rápida |
| **Badge "Activo"** | Chat activo |

#### Área de Mensajes

| Posición | Color | Significado |
|----------|-------|-------------|
| **Izquierda (gris)** | Mensajes de otros | Incluye avatar y rol |
| **Derecha (azul)** | Mis mensajes | Mi avatar |

#### Colores de Avatar por Rol

| Rol | Color |
|-----|-------|
| **Paramédico** | 🔵 Azul |
| **TENS** | 🟢 Verde |
| **Médico** | 🟣 Morado |
| **Admin** | 🟠 Naranja |

#### Barra de Entrada

| Elemento | Función |
|----------|---------|
| **Botón "+"** | Adjuntar archivos |
| **Campo de texto** | Escribir mensaje |
| **Botón ✈️** | Enviar mensaje |

---

## 4. Dashboard TENS

### 4.1 Descripción General

El **TENS** es el segundo en recibir al paciente:

- ✅ Realizar el **Triage**
- ✅ Tomar **signos vitales**
- ✅ Preparar al paciente
- ✅ Solicitar medicamentos
- ✅ Asistir al médico

### 4.2 Realizar Triage

| Campo | Descripción |
|-------|-------------|
| **Nivel de Triage** | 1 (Resucitación) a 5 (No urgente) |
| **Motivo Principal** | Síntoma principal |
| **Signos Vitales** | Mediciones actuales |
| **Dolor (EVA)** | 0-10 |
| **Observaciones** | Notas adicionales |

### 4.3 Solicitud de Medicamentos

| Campo | Descripción |
|-------|-------------|
| **Medicamento** | Nombre del fármaco |
| **Dosis** | Cantidad y unidad |
| **Vía** | Ruta de administración |
| **Motivo** | Justificación |

#### Estados de Solicitud

| Estado | Color | Significado |
|--------|-------|-------------|
| **Pendiente** | 🟡 Amarillo | Esperando autorización |
| **Aprobada** | 🟢 Verde | Puede administrar |
| **Rechazada** | 🔴 Rojo | Ver motivo |

---

## 5. Dashboard Médico

### 5.1 Descripción General

El **Médico** es responsable del diagnóstico y tratamiento:

- ✅ Realizar **anamnesis**
- ✅ Establecer **diagnósticos** (CIE-10)
- ✅ Prescribir **tratamientos**
- ✅ Autorizar **medicamentos**
- ✅ Solicitar **exámenes**
- ✅ Escribir **notas de evolución** (SOAP)
- ✅ Dar de **alta**

### 5.2 Pestañas de la Ficha

| Pestaña | Contenido |
|---------|-----------|
| **Resumen** | Vista general del caso |
| **Anamnesis** | Historia clínica |
| **Diagnóstico** | Diagnósticos CIE-10 |
| **Evolución** | Notas SOAP |
| **Exámenes** | Solicitudes y resultados |
| **Medicamentos** | Prescripciones |
| **Documentos** | PDFs y archivos |

### 5.3 Anamnesis

| Sección | Contenido |
|---------|-----------|
| **Motivo de Consulta** | Síntoma principal |
| **Enfermedad Actual** | Historia del problema |
| **Antecedentes Personales** | Enfermedades previas |
| **Antecedentes Familiares** | Historia familiar |
| **Medicamentos Habituales** | Medicación crónica |
| **Alergias** | Alergias conocidas |
| **Hábitos** | Tabaco, alcohol, etc. |
| **Examen Físico** | Hallazgos |

### 5.4 Notas de Evolución (SOAP)

| Sección | Significado |
|---------|-------------|
| **S - Subjetivo** | Lo que refiere el paciente |
| **O - Objetivo** | Examen físico, signos vitales |
| **A - Análisis** | Interpretación médica |
| **P - Plan** | Plan de manejo |

### 5.5 Documentos PDF

| Documento | Contenido |
|-----------|-----------|
| **Ficha Médica** | Resumen completo |
| **Receta Médica** | Medicamentos prescritos |
| **Orden de Exámenes** | Exámenes solicitados |
| **Alta Médica** | Documento de egreso |

---

## 6. Dashboard Administrador

### 6.1 Descripción General

El **Administrador** gestiona el sistema:

- ✅ Gestión de **usuarios**
- ✅ Programación de **turnos**
- ✅ Gestión de **camas**
- ✅ **Configuración** del sistema
- ✅ **Auditoría** de acciones

### 6.2 Menú de Navegación

| Opción | Función |
|--------|---------|
| **Dashboard** | Estadísticas generales |
| **Usuarios** | Gestión de personal |
| **Turnos** | Programación |
| **Camas** | Gestión de camas |
| **Fichas** | Todas las fichas |
| **Configuración** | Ajustes |
| **Auditoría** | Logs |

### 6.3 Gestión de Usuarios

| Campo | Descripción |
|-------|-------------|
| **RUT** | Identificación |
| **Nombres** | Nombres completos |
| **Apellidos** | Apellidos |
| **Email** | Correo (usuario) |
| **Contraseña** | Acceso |
| **Rol** | Tipo de usuario |
| **Activo** | Estado |

### 6.4 Tipos de Turno

| Turno | Horario | Color |
|-------|---------|-------|
| **Mañana** | 08:00 - 14:00 | 🔵 Azul |
| **Tarde** | 14:00 - 20:00 | 🟠 Naranja |
| **Noche** | 20:00 - 08:00 | 🟣 Morado |

### 6.5 Estados de Cama

| Estado | Color | Significado |
|--------|-------|-------------|
| **Disponible** | 🟢 Verde | Lista |
| **Ocupada** | 🔴 Rojo | Con paciente |
| **Limpieza** | 🟡 Amarillo | Preparándose |
| **Mantenimiento** | ⚫ Gris | No disponible |

---

## 7. Elementos Comunes

### 7.1 Indicadores de Prioridad

| Categoría | Color | Tiempo Máximo |
|-----------|-------|---------------|
| **C1** | 🔴 Rojo | Inmediato |
| **C2** | 🟠 Naranja | < 10 min |
| **C3** | 🟡 Amarillo | < 30 min |
| **C4** | 🟢 Verde claro | < 60 min |
| **C5** | 🟢 Verde | < 120 min |

---

## 8. Flujo de Trabajo

```
📞 EMERGENCIA
     │
     ▼
┌─────────────┐
│ PARAMÉDICO  │ → Crea ficha, signos vitales, traslada
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    TENS     │ → Triage, signos vitales, prepara
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   MÉDICO    │ → Anamnesis, diagnóstico, tratamiento
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│           DECISIÓN MÉDICA           │
├────────┬────────┬────────┬─────────┤
│  ALTA  │HOSPITAL│  UCI   │ DERIVAR │
└────────┴────────┴────────┴─────────┘
```

---

## 9. Preguntas Frecuentes

**¿Olvidé mi contraseña?**
> Contacte al administrador.

**¿Cómo cambio el tema claro/oscuro?**
> Use el selector 🌙/☀️ en login o menú de usuario.

**¿Los datos se guardan automáticamente?**
> No. Debe presionar "Guardar" o "Enviar".

---

## 10. Glosario

| Término | Significado |
|---------|-------------|
| **Anamnesis** | Historia clínica completa |
| **CIE-10** | Clasificación Internacional de Enfermedades |
| **EVA** | Escala Visual Analógica del dolor |
| **Glasgow** | Escala de consciencia |
| **SOAP** | Subjetivo, Objetivo, Análisis, Plan |
| **TENS** | Técnico en Enfermería |
| **Triage** | Clasificación de urgencia |
| **UCI** | Unidad de Cuidados Intensivos |

---

**Sistema de Gestión Hospitalaria de Emergencias**
Versión 1.0.0 | Noviembre 2025
