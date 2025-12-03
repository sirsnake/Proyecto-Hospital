#!/usr/bin/env python
"""
Script para actualizar tipos de camas en la base de datos.
Ejecutar con: python manage.py shell < update_camas.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyectohospital.settings')
django.setup()

from urgencias.models import Cama

print("=" * 50)
print("ACTUALIZANDO TIPOS DE CAMAS")
print("=" * 50)

# Mostrar estado actual
print("\nEstado actual de camas:")
for cama in Cama.objects.all():
    print(f"  - {cama.numero}: tipo={cama.tipo}, estado={cama.estado}")

# Actualizar cama_general -> hospitalizacion
updated = Cama.objects.filter(tipo='cama_general').update(tipo='hospitalizacion')
print(f"\n✅ {updated} camas actualizadas de 'cama_general' a 'hospitalizacion'")

# Eliminar UTI (cambiar a UCI si hay alguna)
updated_uti = Cama.objects.filter(tipo='uti').update(tipo='uci')
print(f"✅ {updated_uti} camas actualizadas de 'uti' a 'uci'")

# Mostrar estado final
print("\nEstado final de camas:")
for cama in Cama.objects.all():
    print(f"  - {cama.numero}: tipo={cama.tipo}, estado={cama.estado}")

print("\n" + "=" * 50)
print("ACTUALIZACIÓN COMPLETADA")
print("=" * 50)
