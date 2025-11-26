"""
Routing de WebSockets para Django Channels
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<ficha_id>\d+)/$', consumers.ChatConsumer.as_asgi()),
]
