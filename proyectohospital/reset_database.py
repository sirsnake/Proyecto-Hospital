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
    
    # Usuarios personalizados (@hospital.cl) - Para producción y desarrollo
    {
        'username': 'bnunez',
        'email': 'bnunez@hospital.cl',
        'password': 'tens123',
        'first_name': 'Brayan',
        'last_name': 'Nuñez',
        'rol': 'tens',
        'rut': '19000001-1',
    },
    {
        'username': 'rcastillo',
        'email': 'rcastillo@hospital.cl',
        'password': 'paramedico123',
        'first_name': 'Ruben',
        'last_name': 'Castillo',
        'rol': 'paramedico',
        'rut': '19000002-2',
    },
    {
        'username': 'dmejias',
        'email': 'dmejias@hospital.cl',
        'password': 'medico123',
        'first_name': 'Diego',
        'last_name': 'Mejias',
        'rol': 'medico',
        'rut': '19000003-3',
        'especialidad': 'Medicina de Urgencia',
        'registro_profesional': 'MED-100',
    },
    
    # Admin de producción
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
    """Crear camas iniciales - BORRANDO las existentes primero"""
    print("🛏️  Configurando camas...")
    
    # BORRAR TODAS LAS CAMAS EXISTENTES
    Cama.objects.all().delete()
    print("   - Camas anteriores eliminadas")
    
    camas_data = [
        # Boxes de urgencia (5 boxes)
        {'numero': 'BOX-01', 'tipo': 'box', 'piso': 1, 'sala': 'Urgencias', 'estado': 'disponible'},
        {'numero': 'BOX-02', 'tipo': 'box', 'piso': 1, 'sala': 'Urgencias', 'estado': 'disponible'},
        {'numero': 'BOX-03', 'tipo': 'box', 'piso': 1, 'sala': 'Urgencias', 'estado': 'disponible'},
        {'numero': 'BOX-04', 'tipo': 'box', 'piso': 1, 'sala': 'Urgencias', 'estado': 'disponible'},
        {'numero': 'BOX-05', 'tipo': 'box', 'piso': 1, 'sala': 'Urgencias', 'estado': 'disponible'},
        
        # Hospitalización (10 camas)
        {'numero': 'HOSP-01', 'tipo': 'hospitalizacion', 'piso': 2, 'sala': 'Hospitalización A', 'estado': 'disponible'},
        {'numero': 'HOSP-02', 'tipo': 'hospitalizacion', 'piso': 2, 'sala': 'Hospitalización A', 'estado': 'disponible'},
        {'numero': 'HOSP-03', 'tipo': 'hospitalizacion', 'piso': 2, 'sala': 'Hospitalización A', 'estado': 'disponible'},
        {'numero': 'HOSP-04', 'tipo': 'hospitalizacion', 'piso': 2, 'sala': 'Hospitalización A', 'estado': 'disponible'},
        {'numero': 'HOSP-05', 'tipo': 'hospitalizacion', 'piso': 2, 'sala': 'Hospitalización A', 'estado': 'disponible'},
        {'numero': 'HOSP-06', 'tipo': 'hospitalizacion', 'piso': 3, 'sala': 'Hospitalización B', 'estado': 'disponible'},
        {'numero': 'HOSP-07', 'tipo': 'hospitalizacion', 'piso': 3, 'sala': 'Hospitalización B', 'estado': 'disponible'},
        {'numero': 'HOSP-08', 'tipo': 'hospitalizacion', 'piso': 3, 'sala': 'Hospitalización B', 'estado': 'disponible'},
        {'numero': 'HOSP-09', 'tipo': 'hospitalizacion', 'piso': 3, 'sala': 'Hospitalización B', 'estado': 'disponible'},
        {'numero': 'HOSP-10', 'tipo': 'hospitalizacion', 'piso': 3, 'sala': 'Hospitalización B', 'estado': 'disponible'},
        
        # UCI (5 camas)
        {'numero': 'UCI-01', 'tipo': 'uci', 'piso': 4, 'sala': 'Unidad de Cuidados Intensivos', 'estado': 'disponible'},
        {'numero': 'UCI-02', 'tipo': 'uci', 'piso': 4, 'sala': 'Unidad de Cuidados Intensivos', 'estado': 'disponible'},
        {'numero': 'UCI-03', 'tipo': 'uci', 'piso': 4, 'sala': 'Unidad de Cuidados Intensivos', 'estado': 'disponible'},
        {'numero': 'UCI-04', 'tipo': 'uci', 'piso': 4, 'sala': 'Unidad de Cuidados Intensivos', 'estado': 'disponible'},
        {'numero': 'UCI-05', 'tipo': 'uci', 'piso': 4, 'sala': 'Unidad de Cuidados Intensivos', 'estado': 'disponible'},
    ]
    
    for cama_data in camas_data:
        Cama.objects.create(**cama_data)
        print(f"   + {cama_data['numero']} ({cama_data['tipo']})")
    
    print(f"✅ {len(camas_data)} camas creadas")


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
        from datetime import time
        ConfiguracionTurno.objects.create(
            tipo='AM',
            hora_inicio=time(8, 0),
            hora_fin=time(20, 0),
            descripcion='Turno de día',
            activo=True
        )
        ConfiguracionTurno.objects.create(
            tipo='PM',
            hora_inicio=time(20, 0),
            hora_fin=time(8, 0),
            descripcion='Turno de noche',
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
    print("USUARIOS PERSONALIZADOS (@hospital.cl):")
    print("  bnunez@hospital.cl    / tens123      (TENS - Brayan)")
    print("  rcastillo@hospital.cl / paramedico123 (Paramédico - Ruben)")
    print("  dmejias@hospital.cl   / medico123    (Médico - Diego)")
    print("  admin@hospital.cl     / admin123     (Admin)")
    print("-"*50 + "\n")


if __name__ == '__main__':
    reset_all()
