#!/usr/bin/env python
"""Script para inicializar configuración y camas"""

import os
import sys
import django

# Setup Django
sys.path.append('/Users/diego/Desktop/Hospital/proyectohospital')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyectohospital.settings')
django.setup()

from urgencias.models import ConfiguracionHospital, Cama, Usuario

# Crear configuración inicial
config = ConfiguracionHospital.get_configuracion()
# Configuración creada

# Crear camas de ejemplo
camas_creadas = 0

# Camas generales (1-30)
for i in range(1, 31):
    cama, created = Cama.objects.get_or_create(
        numero=f"G-{i:02d}",
        defaults={
            'tipo': 'general',
            'estado': 'disponible',
            'piso': (i // 10) + 1,
            'sala': f"Sala {((i-1) // 5) + 1}"
        }
    )
    if created:
        camas_creadas += 1

# Camas UCI (1-10)
for i in range(1, 11):
    cama, created = Cama.objects.get_or_create(
        numero=f"UCI-{i:02d}",
        defaults={
            'tipo': 'uci',
            'estado': 'disponible',
            'piso': 3,
            'sala': f"UCI"
        }
    )
    if created:
        camas_creadas += 1

# Camas de emergencia (1-10)
for i in range(1, 11):
    cama, created = Cama.objects.get_or_create(
        numero=f"ER-{i:02d}",
        defaults={
            'tipo': 'emergencia',
            'estado': 'disponible',
            'piso': 1,
            'sala': f"Emergencia"
        }
    )
    if created:
        camas_creadas += 1

# Camas inicializadas correctamente
