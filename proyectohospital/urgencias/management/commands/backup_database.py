"""
Comando Django para realizar backup automático de la base de datos MySQL.
Uso: python manage.py backup_database
"""
import os
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
import gzip
import shutil
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Realiza un backup de la base de datos MySQL y gestiona la rotación de backups antiguos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-days',
            type=int,
            default=7,
            help='Número de días de backups a mantener (default: 7)'
        )
        parser.add_argument(
            '--compress',
            action='store_true',
            help='Comprimir el backup con gzip'
        )
        parser.add_argument(
            '--backup-dir',
            type=str,
            default=None,
            help='Directorio donde guardar los backups (default: BASE_DIR/backups)'
        )

    def handle(self, *args, **options):
        keep_days = options['keep_days']
        compress = options['compress']
        backup_dir = options['backup_dir']
        
        # Configurar directorio de backups
        if backup_dir:
            backup_path = Path(backup_dir)
        else:
            backup_path = Path(settings.BASE_DIR) / 'backups'
        
        backup_path.mkdir(parents=True, exist_ok=True)
        
        # Obtener configuración de la base de datos
        db_config = settings.DATABASES['default']
        db_name = db_config['NAME']
        db_user = db_config['USER']
        db_password = db_config['PASSWORD']
        db_host = db_config['HOST']
        db_port = db_config['PORT']
        
        # Crear nombre del archivo con timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'backup_{db_name}_{timestamp}.sql'
        backup_file = backup_path / backup_filename
        
        self.stdout.write(self.style.SUCCESS(f'🔄 Iniciando backup de la base de datos "{db_name}"...'))
        
        try:
            # Ejecutar mysqldump
            dump_command = [
                'mysqldump',
                f'--user={db_user}',
                f'--password={db_password}',
                f'--host={db_host}',
                f'--port={db_port}',
                '--single-transaction',
                '--routines',
                '--triggers',
                '--events',
                db_name
            ]
            
            with open(backup_file, 'w') as f:
                result = subprocess.run(
                    dump_command,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    text=True
                )
            
            if result.returncode != 0:
                raise Exception(f'Error en mysqldump: {result.stderr}')
            
            # Verificar que el archivo se creó correctamente
            if not backup_file.exists() or backup_file.stat().st_size == 0:
                raise Exception('El archivo de backup está vacío o no se creó')
            
            file_size = backup_file.stat().st_size / (1024 * 1024)  # MB
            self.stdout.write(self.style.SUCCESS(f'✅ Backup creado: {backup_filename} ({file_size:.2f} MB)'))
            
            # Comprimir si se solicitó
            if compress:
                self.stdout.write('🗜️  Comprimiendo backup...')
                compressed_file = Path(str(backup_file) + '.gz')
                
                with open(backup_file, 'rb') as f_in:
                    with gzip.open(compressed_file, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                
                # Eliminar archivo sin comprimir
                backup_file.unlink()
                
                compressed_size = compressed_file.stat().st_size / (1024 * 1024)  # MB
                compression_ratio = (1 - compressed_size / file_size) * 100
                self.stdout.write(self.style.SUCCESS(
                    f'✅ Backup comprimido: {compressed_file.name} ({compressed_size:.2f} MB, '
                    f'{compression_ratio:.1f}% de compresión)'
                ))
            
            # Limpiar backups antiguos
            self.stdout.write(f'🧹 Limpiando backups anteriores a {keep_days} días...')
            deleted_count = self._cleanup_old_backups(backup_path, keep_days)
            
            if deleted_count > 0:
                self.stdout.write(self.style.SUCCESS(f'✅ Eliminados {deleted_count} backups antiguos'))
            else:
                self.stdout.write('ℹ️  No hay backups antiguos para eliminar')
            
            self.stdout.write(self.style.SUCCESS('\n🎉 Backup completado exitosamente!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error al crear backup: {str(e)}'))
            # Limpiar archivo incompleto si existe
            if backup_file.exists():
                backup_file.unlink()
            raise

    def _cleanup_old_backups(self, backup_dir, keep_days):
        """Elimina backups más antiguos que keep_days días"""
        cutoff_date = datetime.now() - timedelta(days=keep_days)
        deleted_count = 0
        
        # Buscar archivos de backup (.sql y .sql.gz)
        for backup_file in backup_dir.glob('backup_*.sql*'):
            file_mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)
            
            if file_mtime < cutoff_date:
                self.stdout.write(f'  🗑️  Eliminando: {backup_file.name}')
                backup_file.unlink()
                deleted_count += 1
        
        return deleted_count
