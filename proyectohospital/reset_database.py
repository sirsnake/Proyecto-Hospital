#!/usr/bin/env python
"""
Script para resetear la base de datos y recrear usuarios base.
Ejecutar con: python manage.py shell < reset_database.py
O importar y llamar: from reset_database import reset_all; reset_all()
"""

import os
import django

# Configurar Django si no está configurado
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyectohospital.settings')
try:
    django.setup()
except:
    pass

from django.contrib.auth import get_user_model
from urgencias.models import (
    Paciente, FichaEmergencia, SignosVitales, SolicitudMedicamento,
    Anamnesis, Triage, Diagnostico, SolicitudExamen, AuditLog,
    ConfiguracionHospital, Cama, ArchivoAdjunto, MensajeChat,
    Notificacion, NotaEvolucion, Turno, ConfiguracionTurno
)

Usuario = get_user_model()

# Usuarios a crear/mantener
USUARIOS = [
    # Usuarios de desarrollo (@salud.cl)
    {
        'username': 'admin',
        'email': 'admin@salud.cl',
        'password': 'admin123',
        'first_name': 'Ana',
        'last_name': 'Silva',
        'rol': 'administrador',
        'rut': '11111111-1',
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'username': 'medico',
        'email': 'medico@salud.cl',
        'password': 'medico123',
        'first_name': 'Juan',
        'last_name': 'Pérez',
        'rol': 'medico',
        'rut': '22222222-2',
        'especialidad': 'Medicina de Urgencia',
        'registro_profesional': 'MED-12345',
    },
    {
        'username': 'tens',
        'email': 'tens@salud.cl',
        'password': 'tens123',
        'first_name': 'María',
        'last_name': 'González',
        'rol': 'tens',
        'rut': '33333333-3',
    },
    {
        'username': 'paramedico',
        'email': 'paramedico@salud.cl',
        'password': 'paramedico123',
        'first_name': 'Carlos',
        'last_name': 'Muñoz',
        'rol': 'paramedico',
        'rut': '44444444-4',
    },
    
    # Usuarios de producción (@hospital.cl)
    {
        'username': 'adminprod',
        'email': 'admin@hospital.cl',
        'password': 'admin123',
        'first_name': 'Administrador',
        'last_name': 'Sistema',
        'rol': 'administrador',
        'rut': '10000000-0',
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'username': 'drperez',
        'email': 'carlos.perez@hospital.cl',
        'password': 'medico123',
        'first_name': 'Carlos',
        'last_name': 'Pérez Soto',
        'rol': 'medico',
        'rut': '12345678-9',
        'especialidad': 'Medicina de Urgencia',
        'registro_profesional': 'MED-001',
    },
    {
        'username': 'drasilva',
        'email': 'maria.silva@hospital.cl',
        'password': 'medico123',
        'first_name': 'María',
        'last_name': 'Silva González',
        'rol': 'medico',
        'rut': '12345678-0',
        'especialidad': 'Medicina Interna',
        'registro_profesional': 'MED-002',
    },
    {
        'username': 'paralopez',
        'email': 'juan.lopez@hospital.cl',
        'password': 'paramedico123',
        'first_name': 'Juan',
        'last_name': 'López Fuentes',
        'rol': 'paramedico',
        'rut': '23456789-1',
    },
    {
        'username': 'parahernandez',
        'email': 'camila.hernandez@hospital.cl',
        'password': 'paramedico123',
        'first_name': 'Camila',
        'last_name': 'Hernández Vega',
        'rol': 'paramedico',
        'rut': '23456789-2',
    },
    {
        'username': 'tenscastro',
        'email': 'roberto.castro@hospital.cl',
        'password': 'tens123',
        'first_name': 'Roberto',
        'last_name': 'Castro Vera',
        'rol': 'tens',
        'rut': '34567890-1',
    },
    {
        'username': 'tenssoto',
        'email': 'carolina.soto@hospital.cl',
        'password': 'tens123',
        'first_name': 'Carolina',
        'last_name': 'Soto Pino',
        'rol': 'tens',
        'rut': '34567890-2',
    },
]


def borrar_datos():
    """Borrar todos los datos excepto usuarios"""
    print("🗑️  Borrando datos...")
    
    # Orden importante por dependencias
    MensajeChat.objects.all().delete()
    print("   - Mensajes de chat borrados")
    
    ArchivoAdjunto.objects.all().delete()
    print("   - Archivos adjuntos borrados")
    
    Notificacion.objects.all().delete()
    print("   - Notificaciones borradas")
    
    NotaEvolucion.objects.all().delete()
    print("   - Notas de evolución borradas")
    
    Diagnostico.objects.all().delete()
    print("   - Diagnósticos borrados")
    
    SolicitudExamen.objects.all().delete()
    print("   - Solicitudes de examen borradas")
    
    SolicitudMedicamento.objects.all().delete()
    print("   - Solicitudes de medicamentos borradas")
    
    Triage.objects.all().delete()
    print("   - Triages borrados")
    
    Anamnesis.objects.all().delete()
    print("   - Anamnesis borradas")
    
    SignosVitales.objects.all().delete()
    print("   - Signos vitales borrados")
    
    FichaEmergencia.objects.all().delete()
    print("   - Fichas de emergencia borradas")
    
    Paciente.objects.all().delete()
    print("   - Pacientes borrados")
    
    AuditLog.objects.all().delete()
    print("   - Logs de auditoría borrados")
    
    Turno.objects.all().delete()
    print("   - Turnos borrados")
    
    # Mantener configuración y camas
    print("   ✓ Configuración y camas mantenidas")
    
    print("✅ Datos borrados correctamente")


def borrar_usuarios():
    """Borrar todos los usuarios"""
    print("🗑️  Borrando usuarios...")
    Usuario.objects.all().delete()
    print("✅ Usuarios borrados")


def crear_usuarios():
    """Crear usuarios base"""
    print("👤 Creando usuarios...")
    
    for datos in USUARIOS:
        password = datos.pop('password')
        username = datos['username']
        
        usuario, created = Usuario.objects.get_or_create(
            username=username,
            defaults=datos
        )
        
        if created:
            usuario.set_password(password)
            usuario.save()
            print(f"   + {usuario.email} ({usuario.rol})")
        else:
            # Actualizar datos existentes
            for key, value in datos.items():
                setattr(usuario, key, value)
            usuario.set_password(password)
            usuario.save()
            print(f"   ~ {usuario.email} ({usuario.rol}) actualizado")
    
    print("✅ Usuarios creados")


def crear_camas():
    """Crear camas iniciales si no existen"""
    print("🛏️  Verificando camas...")
    
    if Cama.objects.count() == 0:
        camas_data = [
            # Boxes de urgencia
            {'nombre': 'Box 1', 'tipo': 'box', 'ubicacion': 'Urgencias'},
            {'nombre': 'Box 2', 'tipo': 'box', 'ubicacion': 'Urgencias'},
            {'nombre': 'Box 3', 'tipo': 'box', 'ubicacion': 'Urgencias'},
            {'nombre': 'Box 4', 'tipo': 'box', 'ubicacion': 'Urgencias'},
            {'nombre': 'Box 5', 'tipo': 'box', 'ubicacion': 'Urgencias'},
            # Hospitalización
            {'nombre': 'Cama H-101', 'tipo': 'hospitalizacion', 'ubicacion': 'Piso 1'},
            {'nombre': 'Cama H-102', 'tipo': 'hospitalizacion', 'ubicacion': 'Piso 1'},
            {'nombre': 'Cama H-103', 'tipo': 'hospitalizacion', 'ubicacion': 'Piso 1'},
            {'nombre': 'Cama H-201', 'tipo': 'hospitalizacion', 'ubicacion': 'Piso 2'},
            {'nombre': 'Cama H-202', 'tipo': 'hospitalizacion', 'ubicacion': 'Piso 2'},
            # UCI
            {'nombre': 'UCI-1', 'tipo': 'uci', 'ubicacion': 'UCI'},
            {'nombre': 'UCI-2', 'tipo': 'uci', 'ubicacion': 'UCI'},
            {'nombre': 'UCI-3', 'tipo': 'uci', 'ubicacion': 'UCI'},
        ]
        
        for cama_data in camas_data:
            Cama.objects.create(**cama_data)
            print(f"   + {cama_data['nombre']}")
        
        print("✅ Camas creadas")
    else:
        print("   ✓ Camas ya existen")


def crear_configuracion():
    """Crear configuración inicial si no existe"""
    print("⚙️  Verificando configuración...")
    
    if not ConfiguracionHospital.objects.exists():
        ConfiguracionHospital.objects.create(
            nombre_hospital='Hospital de Urgencias',
            direccion='Av. Principal 123',
            telefono='+56 2 1234 5678',
            email_contacto='contacto@hospital.cl'
        )
        print("   + Configuración creada")
    else:
        print("   ✓ Configuración ya existe")
    
    # Configuración de turnos
    if not ConfiguracionTurno.objects.exists():
        ConfiguracionTurno.objects.create(
            nombre='Turno Día',
            hora_inicio='08:00',
            hora_fin='20:00',
            activo=True
        )
        ConfiguracionTurno.objects.create(
            nombre='Turno Noche',
            hora_inicio='20:00',
            hora_fin='08:00',
            activo=True
        )
        print("   + Configuración de turnos creada")
    else:
        print("   ✓ Configuración de turnos ya existe")


def reset_all():
    """Ejecutar reset completo"""
    print("\n" + "="*50)
    print("🔄 RESETEANDO BASE DE DATOS")
    print("="*50 + "\n")
    
    borrar_datos()
    print()
    borrar_usuarios()
    print()
    crear_usuarios()
    print()
    crear_camas()
    print()
    crear_configuracion()
    
    print("\n" + "="*50)
    print("✅ BASE DE DATOS RESETEADA CORRECTAMENTE")
    print("="*50)
    print("\n📋 Credenciales de acceso:")
    print("-"*50)
    print("DESARROLLO (@salud.cl):")
    print("  admin@salud.cl      / admin123")
    print("  medico@salud.cl     / medico123")
    print("  tens@salud.cl       / tens123")
    print("  paramedico@salud.cl / paramedico123")
    print("-"*50)
    print("PRODUCCIÓN (@hospital.cl):")
    print("  admin@hospital.cl          / admin123")
    print("  carlos.perez@hospital.cl   / medico123")
    print("  maria.silva@hospital.cl    / medico123")
    print("  juan.lopez@hospital.cl     / paramedico123")
    print("  camila.hernandez@hospital.cl / paramedico123")
    print("  roberto.castro@hospital.cl / tens123")
    print("  carolina.soto@hospital.cl  / tens123")
    print("-"*50 + "\n")


if __name__ == '__main__':
    reset_all()
