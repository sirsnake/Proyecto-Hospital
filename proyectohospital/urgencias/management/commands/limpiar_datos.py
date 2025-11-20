from django.core.management.base import BaseCommand
from urgencias.models import (
    Paciente, FichaEmergencia, SignosVitales, 
    SolicitudMedicamento, Anamnesis, Diagnostico
)

class Command(BaseCommand):
    help = 'Limpia todos los datos de pacientes, fichas y registros relacionados'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('🗑️  Eliminando todos los datos...'))
        
        # Eliminar en orden correcto (respetando foreign keys)
        diagnosticos_count = Diagnostico.objects.all().delete()[0]
        self.stdout.write(f'   ✓ {diagnosticos_count} diagnósticos eliminados')
        
        anamnesis_count = Anamnesis.objects.all().delete()[0]
        self.stdout.write(f'   ✓ {anamnesis_count} anamnesis eliminadas')
        
        solicitudes_count = SolicitudMedicamento.objects.all().delete()[0]
        self.stdout.write(f'   ✓ {solicitudes_count} solicitudes de medicamentos eliminadas')
        
        signos_count = SignosVitales.objects.all().delete()[0]
        self.stdout.write(f'   ✓ {signos_count} registros de signos vitales eliminados')
        
        fichas_count = FichaEmergencia.objects.all().delete()[0]
        self.stdout.write(f'   ✓ {fichas_count} fichas de emergencia eliminadas')
        
        pacientes_count = Paciente.objects.all().delete()[0]
        self.stdout.write(f'   ✓ {pacientes_count} pacientes eliminados')
        
        self.stdout.write(self.style.SUCCESS('\n✅ Base de datos limpiada exitosamente'))
        self.stdout.write(self.style.SUCCESS('   Puedes empezar a ingresar nuevos pacientes\n'))
