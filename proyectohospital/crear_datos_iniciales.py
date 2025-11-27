#!/usr/bin/env python
"""Script para crear datos iniciales en Railway"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyectohospital.settings')
django.setup()

from urgencias.models import Usuario, ConfiguracionHospital, Cama

def crear_datos_iniciales():
    # Crear usuario administrador si no existe
    if not Usuario.objects.filter(username='admin').exists():
        admin = Usuario.objects.create_superuser(
            username='admin',
            email='admin@hospital.cl',
            password='admin123',
            rut='11.111.111-1',
            first_name='Administrador',
            last_name='Sistema',
            rol='administrador'
        )
        print(f"✅ Usuario admin creado: {admin.username}")
    else:
        print("ℹ️ Usuario admin ya existe")
    
    # Crear usuarios de prueba
    usuarios_prueba = [
        {'username': 'medico1', 'password': 'medico123', 'rut': '12.345.678-9', 'first_name': 'Juan', 'last_name': 'Pérez', 'rol': 'medico', 'especialidad': 'Medicina General'},
        {'username': 'tens1', 'password': 'tens123', 'rut': '13.456.789-0', 'first_name': 'María', 'last_name': 'González', 'rol': 'tens'},
        {'username': 'paramedico1', 'password': 'para123', 'rut': '14.567.890-1', 'first_name': 'Carlos', 'last_name': 'López', 'rol': 'paramedico'},
    ]
    
    for u in usuarios_prueba:
        if not Usuario.objects.filter(username=u['username']).exists():
            usuario = Usuario.objects.create_user(
                username=u['username'],
                password=u['password'],
                rut=u['rut'],
                first_name=u['first_name'],
                last_name=u['last_name'],
                rol=u['rol'],
                especialidad=u.get('especialidad', '')
            )
            print(f"✅ Usuario creado: {usuario.username} ({usuario.rol})")
    
    # Crear configuración del hospital si no existe
    if not ConfiguracionHospital.objects.exists():
        config = ConfiguracionHospital.objects.create(
            nombre_hospital="Hospital Demo",
            direccion="Av. Principal 123",
            telefono="+56 2 1234 5678"
        )
        print(f"✅ Configuración creada: {config.nombre_hospital}")
    
    # Crear camas si no existen
    if Cama.objects.count() == 0:
        tipos_camas = [
            ('box', 10),
            ('uci', 4),
            ('uti', 4),
            ('cama_general', 10),
        ]
        for tipo, cantidad in tipos_camas:
            for i in range(1, cantidad + 1):
                cama = Cama.objects.create(
                    numero=f"{tipo.upper()}-{i:02d}",
                    tipo=tipo,
                    estado='disponible'
                )
            print(f"✅ Creadas {cantidad} camas tipo {tipo}")
    
    print("\n🎉 Datos iniciales creados correctamente!")
    print("\n📋 Usuarios disponibles:")
    print("  - admin / admin123 (Administrador)")
    print("  - medico1 / medico123 (Médico)")
    print("  - tens1 / tens123 (TENS)")
    print("  - paramedico1 / para123 (Paramédico)")

if __name__ == '__main__':
    crear_datos_iniciales()
