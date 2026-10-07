#!/usr/bin/env python3
"""Мини-сервер для Riff Hero: отдаёт файлы и запрещает кеширование (удобно при разработке).

Запуск:  python3 serve.py [порт]
Затем откройте http://localhost:8000
(getUserMedia для микрофона требует localhost или https.)
"""
import http.server
import socketserver
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


class ReusableServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


with ReusableServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"Riff Hero: http://localhost:{PORT}")
    httpd.serve_forever()
