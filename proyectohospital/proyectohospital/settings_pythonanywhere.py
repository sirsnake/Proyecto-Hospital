"""
Django settings for PythonAnywhere deployment.
Importa la configuración base y la modifica para producción.
"""

from .settings import *

# Producción
DEBUG = False

# Username de PythonAnywhere
PYTHONANYWHERE_USERNAME = 'SirSnake'

ALLOWED_HOSTS = [
    f'{PYTHONANYWHERE_USERNAME}.pythonanywhere.com',
    'localhost',
    '127.0.0.1',
]

# Base de datos MySQL de PythonAnywhere
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': f'{PYTHONANYWHERE_USERNAME}$hospital',
        'USER': PYTHONANYWHERE_USERNAME,
        'PASSWORD': 'Snaket69',
        'HOST': f'{PYTHONANYWHERE_USERNAME}.mysql.pythonanywhere-services.com',
        'PORT': '3306',
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# Seguridad para producción
CSRF_TRUSTED_ORIGINS = [
    f'https://{PYTHONANYWHERE_USERNAME}.pythonanywhere.com',
]

CORS_ALLOWED_ORIGINS = [
    f'https://{PYTHONANYWHERE_USERNAME}.pythonanywhere.com',
]

CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True

# Archivos estáticos
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
