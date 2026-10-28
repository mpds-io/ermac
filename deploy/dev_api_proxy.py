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

import argparse
import hashlib
import http.server
import os
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request

HOST = "127.0.0.1"
PORT = 7070
REMOTE = "https://api.mpds.io/v0"
TIMEOUT = 20

# NB parity testing mode: with --cache DIR, responses are stored on disk and
# replayed on subsequent identical requests, making comparative test runs
# deterministic regardless of the live data changes at the MPDS server
CACHE_DIR = None
_log_lock = threading.Lock()


def cache_lookup(method, path):
    """(status, content_type, payload, location) or None. NB a redirect
    record carries its Location on a third header line."""
    if not CACHE_DIR:
        return None
    key = hashlib.sha1(("%s %s" % (method, path)).encode()).hexdigest()
    cache_path = os.path.join(CACHE_DIR, key)
    if not os.path.exists(cache_path):
        return None
    with open(cache_path, "rb") as f:
        status = int(f.readline().strip())
        content_type = f.readline().strip().decode()
        location = f.readline().strip().decode() if is_redirect(status) else ""
        payload = f.read()
    return status, content_type, payload, location


def cacheable(status):
    """Transient failures (rate limits, server errors, this proxy's own 502)
    must not be replayed forever."""
    return status < 500 and status != 429


def cache_key_path(method, path, body):
    """POSTs to the same URL with different bodies are different requests.
    NB shared with parity/run_parity.py, so both drivers read one cache."""
    if method == "POST":
        return path + "\n" + hashlib.sha1(body or b"").hexdigest()
    return path


def cache_store(method, path, status, content_type, payload, location=""):
    if not CACHE_DIR:
        return
    os.makedirs(CACHE_DIR, exist_ok=True)
    key = hashlib.sha1(("%s %s" % (method, path)).encode()).hexdigest()
    with open(os.path.join(CACHE_DIR, key), "wb") as f:
        f.write(("%d\n%s\n" % (status, content_type)).encode())
        if is_redirect(status):
            f.write(("%s\n" % location).encode())
        f.write(payload)


def is_redirect(status):
    return 300 <= status < 400


class _KeepRedirects(urllib.request.HTTPRedirectHandler):
    """Hand 3xx responses back instead of following them: the browser must
    see the redirect itself. E.g. an anonymous /download/p?...&fmt=pdf is a
    302 to https://mpds.io/#junction (sign-in); followed here, the proxy
    served the mpds.io page (its fragment lost) as if it were the API
    response, with its relative assets resolving to the proxy: broken HTML."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_OPENER = urllib.request.build_opener(_KeepRedirects)


def fetch_remote(method, path, body=None, headers=None):
    """(status, response_headers, payload) of REMOTE + path, redirects NOT
    followed; transport errors give a 502 with a JSON error payload.
    NB shared with parity/run_parity.py."""
    request = urllib.request.Request(REMOTE + path, data=body, method=method, headers=headers or {})
    last_error = None
    # NB the CDN may occasionally cut a response short, so retry once
    for attempt in (1, 2):
        try:
            with _OPENER.open(request, timeout=TIMEOUT) as response:
                return response.status, response.headers, response.read()
        except urllib.error.HTTPError as error:  # NB includes the 3xx
            return error.code, error.headers, error.read()
        except Exception as error:
            last_error = error
    return 502, {}, ('{"error": "dev proxy: %s"}' % last_error).encode()


def local_location(location, path, local_origin):
    """A redirect back into the API stays on this proxy; others (mpds.io)
    are passed as absolute URLs, fragment included."""
    if not location:
        return location
    absolute = urllib.parse.urljoin(REMOTE + path, location)
    if absolute.startswith(REMOTE + "/") or absolute == REMOTE:
        return local_origin + absolute[len(REMOTE):]
    return absolute

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

    def _forward(self, method, send_body=True):
        body = None

        if method == "POST":
            try:
                length = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                self.send_error(400, "malformed Content-Length")
                return
            body = self.rfile.read(length) if length > 0 else b""

        key = cache_key_path(method, self.path, body)
        cached = cache_lookup(method, key)
        local_origin = "http://%s" % (self.headers.get("Host") or "%s:%d" % (HOST, PORT))
        if cached is not None:
            status, content_type, payload, location = cached
            try:
                self.send_response(status)
                self._cors()
                if content_type:
                    self.send_header("Content-Type", content_type)
                if location:
                    self.send_header("Location", local_location(location, self.path, local_origin))
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                if send_body:
                    self.wfile.write(payload)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        headers = {}
        for header in ("Content-Type", "Origin", "Key", "Accept-Language"):
            value = self.headers.get(header)
            if value:
                headers[header] = value

        status, response_headers, payload = fetch_remote(method, self.path, body, headers)
        location = (response_headers or {}).get("Location", "")

        if cacheable(status):
            cache_store(method, key, status,
                        (response_headers or {}).get("Content-Type", ""),
                        payload, location)

        try:
            self.send_response(status)
            self._cors()
            for name, value in (response_headers or {}).items():
                # NB the proxy handles CORS itself (the origin it sees is localhost,
                # not the real browser origin), so drop the remote CORS headers
                if name.lower() == "location":
                    value = local_location(value, self.path, local_origin)
                if name.lower() not in HOP_BY_HOP and not name.lower().startswith(
                    "access-control-"
                ):
                    self.send_header(name, value)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if send_body:
                self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass  # NB the browser aborted the request, e.g. on page reload

    def do_GET(self):
        self._forward("GET")

    def do_POST(self):
        self._forward("POST")

    def do_HEAD(self):
        # NB answered from the GET response (and its cache entry), headers only
        self._forward("GET", send_body=False)

    def log_message(self, fmt, *args):
        # NB a single write() must carry the whole line: concurrent request
        # threads otherwise interleave and corrupt the log (which the parity
        # suite relies on), especially with unbuffered stdout
        with _log_lock:
            sys.stdout.write("proxy: %s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument(
        "--cache",
        default=None,
        help="cache API responses on disk and replay them, see parity/run_parity.py",
    )
    args = parser.parse_args()
    if args.cache:
        CACHE_DIR = args.cache
    server = http.server.ThreadingHTTPServer((HOST, args.port), ProxyHandler)
    print(
        "dev API proxy: http://%s:%d -> %s%s"
        % (HOST, args.port, REMOTE, " (cached: %s)" % CACHE_DIR if CACHE_DIR else "")
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
