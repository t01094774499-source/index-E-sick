import http.server
import socketserver
import webbrowser
import os
import sys
import json
import time

# Windows terminal UTF-8 setting
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Default OpenAI API Key
FALLBACK_KEY = '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'

# In-memory storage for real-time human chat
CHAT_MESSAGES = [
    {
        "id": 1,
        "user": "시스템",
        "text": "스마트 API 챗봇 & 3D 자동차 테크 플랫폼 실시간 소통방에 오신 것을 환영합니다! 다른 참여자들과 자유롭게 의견을 나눠보세요.",
        "time": "10:00",
        "isSystem": True
    }
]
MESSAGE_ID_COUNTER = 2

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
        
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        try:
            print(f"[Mobility Server] {self.address_string()} - {format % args}")
        except Exception:
            pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def do_GET(self):
        global CHAT_MESSAGES
        if self.path == '/api/human-chat':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(CHAT_MESSAGES, ensure_ascii=False).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        global CHAT_MESSAGES, MESSAGE_ID_COUNTER
        if self.path == '/api/human-chat':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                user = data.get('user', '익명').strip() or '익명'
                text = data.get('text', '').strip()
                if text:
                    now = time.strftime('%H:%M')
                    msg = {
                        "id": MESSAGE_ID_COUNTER,
                        "user": user,
                        "text": text,
                        "time": now,
                        "isSystem": False
                    }
                    MESSAGE_ID_COUNTER += 1
                    CHAT_MESSAGES.append(msg)
                    if len(CHAT_MESSAGES) > 100:
                        CHAT_MESSAGES = CHAT_MESSAGES[-100:]

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(CHAT_MESSAGES, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}'.encode('utf-8'))

        elif self.path == '/api/chat':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            auth_header = self.headers.get('Authorization', '')
            api_key = (
                auth_header.replace('Bearer ', '').strip() 
                or os.environ.get('OPENAI_API_KEY', '') 
                or FALLBACK_KEY
            )

            if not api_key:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"error":{"message":"API Key is missing."}}')
                return

            import urllib.request
            req = urllib.request.Request(
                'https://api.openai.com/v1/chat/completions',
                data=post_data,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {api_key}'
                },
                method='POST'
            )
            try:
                with urllib.request.urlopen(req) as response:
                    resp_body = response.read()
                    self.send_response(response.status)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(resp_body)
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f'{{"error":{{"message":"{str(e)}"}} }}'.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run():
    global PORT
    for _ in range(10):
        try:
            socketserver.ThreadingTCPServer.allow_reuse_address = True
            with socketserver.ThreadingTCPServer(("", PORT), QuietHandler) as httpd:
                url = f"http://localhost:{PORT}"
                print("=" * 60)
                print(f"[+] Mobility IT Platform Server Started!")
                print(f"[+] URL: {url}")
                print(f"[+] Directory: {DIRECTORY}")
                print(f"[+] Real-time Human Chat: Enabled (/api/human-chat)")
                print(f"[+] AI Assistant: Enabled (gpt-5-mini)")
                print("=" * 60)
                
                try:
                    webbrowser.open(url)
                except Exception:
                    pass
                    
                httpd.serve_forever()
                break
        except OSError as e:
            if e.errno in (10048, 98, 48):  # Port in use
                PORT += 1
            else:
                raise e

if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
