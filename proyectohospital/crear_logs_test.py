#!/usr/bin/env python
"""Script para crear logs de auditoría de prueba"""

import os
import sys
import django
from datetime import timedelta

# Setup Django
sys.path.append('/Users/diego/Desktop/Hospital/proyectohospital')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyectohospital.settings')
django.setup()

from django.utils import timezone
from urgencias.models import Usuario, AuditLog

# Obtener usuario admin
admin = Usuario.objects.filter(rol='administrador').first()

if not admin:
    pass  # No hay usuario administrador
    sys.exit(1)

# Crear logs de prueba
logs_data = [
    {
        'accion': 'login',
        'modelo': 'Usuario',
        'objeto_id': str(admin.id),
        'detalles': {'mensaje': 'Ingreso al sistema'},
        'timestamp': timezone.now()
    },
    {
        'accion': 'crear',
        'modelo': 'Usuario',
        'objeto_id': '1',
        'detalles': {'username': 'nuevo_usuario', 'rol': 'medico'},
        'timestamp': timezone.now() - timedelta(hours=2)
    },
    {
        'accion': 'editar',
        'modelo': 'Paciente',
        'objeto_id': '5',
        'detalles': {'cambio': 'Actualización de datos personales'},
        'timestamp': timezone.now() - timedelta(hours=1)
    },
    {
        'accion': 'autorizar',
        'modelo': 'SolicitudMedicamento',
        'objeto_id': '10',
        'detalles': {'medicamento': 'Paracetamol 500mg', 'cantidad': 2},
        'timestamp': timezone.now() - timedelta(minutes=30)
    },
    {
        'accion': 'eliminar',
        'modelo': 'Usuario',
        'objeto_id': '99',
        'detalles': {'username': 'usuario_test', 'motivo': 'Usuario de prueba'},
        'timestamp': timezone.now() - timedelta(hours=3)
    },
]

created = 0
for log_data in logs_data:
    AuditLog.objects.create(
        usuario=admin,
        accion=log_data['accion'],
        modelo=log_data['modelo'],
        objeto_id=log_data['objeto_id'],
        detalles=log_data['detalles'],
        ip_address='127.0.0.1',
        timestamp=log_data['timestamp']
    )
    created += 1

# Logs de auditoría creados
