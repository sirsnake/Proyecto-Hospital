from django.core.management.base import BaseCommand
from urgencias.models import Usuario


class Command(BaseCommand):
    help = 'Crea usuarios de prueba para el sistema de urgencias'

    def handle(self, *args, **kwargs):
        usuarios_prueba = [
            {
                'username': 'paramedico',
                'email': 'paramedico@salud.cl',
                'password': 'para123',
                'first_name': 'Carlos',
                'last_name': 'Muñoz',
                'rut': '12.345.678-9',
                'rol': 'paramedico',
                'telefono': '+56912345678'
            },
            {
                'username': 'tens',
                'email': 'tens@salud.cl',
                'password': 'tens123',
                'first_name': 'María',
                'last_name': 'González',
                'rut': '23.456.789-0',
                'rol': 'tens',
                'telefono': '+56923456789'
            },
            {
                'username': 'medico',
                'email': 'medico@salud.cl',
                'password': 'medico123',
                'first_name': 'Juan',
                'last_name': 'Pérez',
                'rut': '34.567.890-1',
                'rol': 'medico',
                'telefono': '+56934567890'
            },
            {
                'username': 'admin',
                'email': 'admin@salud.cl',
                'password': 'admin123',
                'first_name': 'Ana',
                'last_name': 'Silva',
                'rut': '45.678.901-2',
                'rol': 'administrador',
                'telefono': '+56945678901',
                'is_staff': True,
                'is_superuser': True
            },
        ]

        for user_data in usuarios_prueba:
            username = user_data['username']
            
            if Usuario.objects.filter(username=username).exists():
                self.stdout.write(self.style.WARNING(f'Usuario {username} ya existe, omitiendo...'))
                continue
            
            password = user_data.pop('password')
            is_staff = user_data.pop('is_staff', False)
            is_superuser = user_data.pop('is_superuser', False)
            
            usuario = Usuario.objects.create_user(**user_data)
            usuario.set_password(password)
            usuario.is_staff = is_staff
            usuario.is_superuser = is_superuser
            usuario.save()
            
            self.stdout.write(self.style.SUCCESS(f'Usuario {username} creado exitosamente'))
        
        self.stdout.write(self.style.SUCCESS('\n¡Usuarios de prueba creados!'))
        self.stdout.write(self.style.SUCCESS('\nCredenciales de acceso:'))
        self.stdout.write('- Paramédico: paramedico@salud.cl / para123')
        self.stdout.write('- TENS: tens@salud.cl / tens123')
        self.stdout.write('- Médico: medico@salud.cl / medico123')
        self.stdout.write('- Admin: admin@salud.cl / admin123')
