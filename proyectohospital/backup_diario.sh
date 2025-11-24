#!/bin/bash
# Script para ejecutar backup diario de la base de datos
# Se debe configurar en cron para ejecutarse automáticamente

# Cambiar al directorio del proyecto
cd /Users/diego/Desktop/Hospital/proyectohospital

# Activar el entorno virtual y ejecutar el backup
/Users/diego/Desktop/Hospital/venv/bin/python manage.py backup_database --compress

# Opcional: Enviar notificación o log
echo "$(date): Backup ejecutado" >> /Users/diego/Desktop/Hospital/backups/backup.log
