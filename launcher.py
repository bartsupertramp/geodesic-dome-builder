import sys
import os
import time
import socket
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

class QuietHTTPRequestHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass # Wycisz niepotrzebne logi w konsoli

def find_free_port(start_port=8080):
    for port in range(start_port, start_port + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return 8080

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def run_server(port, base_dir):
    os.chdir(base_dir)
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, QuietHTTPRequestHandler)
    httpd.serve_forever()

def main():
    base_dir = get_base_dir()
    port = find_free_port(8080)

    server_thread = threading.Thread(target=run_server, args=(port, base_dir), daemon=True)
    server_thread.start()

    url = f"http://127.0.0.1:{port}/index.html"
    time.sleep(0.5)
    
    webbrowser.open(url)

    print("===============================================================")
    print("   4V GEODESIC DOME BUILDER & NODE VISUALIZER")
    print("===============================================================")
    print(f" Aplikacja zostala uruchomiona pod adresem: {url}")
    print(" Przegladarka zostala otwarta automatycznie.")
    print(" Aby zakonczyc dzialanie programu, zamknij to okno.")
    print("===============================================================\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)

if __name__ == '__main__':
    main()
