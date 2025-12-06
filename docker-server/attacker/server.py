from http.server import HTTPServer, BaseHTTPRequestHandler


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8", "ignore")

        print("\n=== [ATTACKER] Received exfiltrated data ===")
        print(body)
        print("=== [ATTACKER] End of data ===\n")

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

    # GET으로 들어오면 단순 확인용 페이지 보여주기
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"attack-server: send me POST requests\n")

    # access log 조용히
    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8000), Handler)
    print("[ATTACKER] Listening on 0.0.0.0:8000")
    server.serve_forever()
