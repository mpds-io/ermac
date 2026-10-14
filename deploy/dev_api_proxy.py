#!/usr/bin/env python3
"""
Ermac local development API proxy.

The Ermac GUI talks to the MPDS platform API at https://api.mpds.io/v0.
When the GUI is served from a "localhost" origin, it switches to development
mode and expects the API at http://localhost:7070 (see src_js/core/settings.js).

There is no local backend in this repository (the data stays at the MPDS server),
so for local development this script reverse-proxies localhost:7070 to the real
MPDS API, adding the CORS headers needed for the cross-origin XHR calls.
Pure Python standard library, no dependencies:

    python3 deploy/dev_api_proxy.py            # 127.0.0.1:7070 -> https://api.mpds.io/v0

Then serve the GUI from any port, e.g.:

    python3 -m http.server 5555

and open http://localhost:5555/example_dev.html

NB anonymous browsing (searches, wmdata, refinements) works without any key.
NB logging in through the proxy may not keep the session cookie, depending on
the MPDS cookie flags: for full account testing prefer a non-"localhost" origin
(e.g. http://127.0.0.1:5555), which makes the GUI talk to the MPDS API directly.
"""

import http.server
import urllib.request
import urllib.error

HOST = "127.0.0.1"
PORT = 7070
REMOTE = "https://api.mpds.io/v0"
TIMEOUT = 20

HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-encoding",
    "content-length",
}


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _cors(self):
        origin = self.headers.get("Origin")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "21600")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _forward(self, method):
        url = REMOTE + self.path
        body = None

        headers = {}
        for header in ("Content-Type", "Origin", "Key", "Accept-Language"):
            value = self.headers.get(header)
            if value:
                headers[header] = value

        if method == "POST":
            length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(length) if length else b""

        request = urllib.request.Request(url, data=body, method=method, headers=headers)

        payload, status, response_headers = b"", 502, {}

        # NB the CDN may occasionally cut a response short, so retry once
        last_error = None
        for attempt in (1, 2):
            try:
                with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
                    payload = response.read()
                    status = response.status
                    response_headers = response.headers
                break
            except urllib.error.HTTPError as error:
                payload = error.read()
                status = error.code
                response_headers = error.headers
                break
            except Exception as error:
                last_error = error
        else:
            payload = ('{"error": "dev proxy: %s"}' % last_error).encode()

        try:
            self.send_response(status)
            self._cors()
            for name, value in (response_headers or {}).items():
                # NB the proxy handles CORS itself (the origin it sees is localhost,
                # not the real browser origin), so drop the remote CORS headers
                if name.lower() not in HOP_BY_HOP and not name.lower().startswith(
                    "access-control-"
                ):
                    self.send_header(name, value)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass  # NB the browser aborted the request, e.g. on page reload

    def do_GET(self):
        self._forward("GET")

    def do_POST(self):
        self._forward("POST")

    def do_HEAD(self):
        self._forward("GET")

    def log_message(self, fmt, *args):
        print("proxy: %s - %s" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer((HOST, PORT), ProxyHandler)
    print("dev API proxy: http://%s:%d -> %s" % (HOST, PORT, REMOTE))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
