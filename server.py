"""
Local Testing & Hosting Server for NFC Prank Contact Suite
Serves web interface, vCards, and Flipper .nfc files with proper MIME types.
Displays local IP and terminal ASCII QR code for easy smartphone scanning.
"""

import os
import sys
import socket
import http.server
import socketserver
import mimetypes
import io
import qrcode

# Configure UTF-8 on Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Ensure proper MIME types for vCard
mimetypes.add_type("text/vcard", ".vcf")
mimetypes.add_type("text/plain", ".nfc")


def get_local_ip():
    """Detects primary local network IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't need to actually be reachable
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip


class PrankRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        # Default route redirects to storefront
        if self.path == "/" or self.path == "":
            self.send_response(302)
            self.send_header("Location", "/index.html")
            self.end_headers()
            return
        elif self.path in ["/studio", "/studio.html"]:
            self.send_response(302)
            self.send_header("Location", "/phantomsync_studio.html")
            self.end_headers()
            return
        elif self.path in ["/dashboard", "/dashboard.html"]:
            self.send_response(302)
            self.send_header("Location", "/dashboard.html")
            self.end_headers()
            return
        elif self.path in ["/prank", "/prank.html"]:
            self.send_response(302)
            self.send_header("Location", "/prank.html")
            self.end_headers()
            return
        elif self.path in ["/card", "/card.html", "/jessi", "/contact"]:
            self.send_response(302)
            self.send_header("Location", "/card.html")
            self.end_headers()
            return
        return super().do_GET()

    def end_headers(self):
        # Add CORS and no-cache for testing ease
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()


def print_ascii_qr(url):
    qr = qrcode.QRCode()
    qr.add_data(url)
    qr.make()
    f = io.StringIO()
    qr.print_ascii(out=f, invert=True)
    return f.getvalue()


def start_server():
    ip = get_local_ip()
    local_url = f"http://localhost:{PORT}/web/index.html"
    network_url = f"http://{ip}:{PORT}/web/index.html"
    trojan_url = f"http://{ip}:{PORT}/web/card.html"
    prank_url = f"http://{ip}:{PORT}/web/prank.html?preset=fbi"

    print("=" * 64)
    print("🏷️  NFC PRANK CONTACT SUITE & TROJAN HORSE SERVER")
    print("=" * 64)
    print(f"🪪  Jessi Mitchell Trojan Card: {trojan_url}")
    print(f"🖥️  Studio Web App (PC):         {local_url}")
    print(f"📱 Phone LAN URL (Same Wi-Fi):   {network_url}")
    print(f"🚨 Raw Prank Landing Page:       {prank_url}")
    print("-" * 64)
    print("📲 SCAN WITH PHONE CAMERA TO TEST JESSI'S TROJAN CONTACT CARD:")
    try:
        print(print_ascii_qr(trojan_url))
    except Exception as e:
        print(f"(QR render skipped: {e})")
        print(f"(QR render skipped: {e})")
    print("-" * 64)
    print(f"Serving files from: {BASE_DIR}")
    print("Press Ctrl+C to stop.")
    print("=" * 64)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), PrankRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    start_server()
