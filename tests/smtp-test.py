"""Serveur SMTP de test (local uniquement) : accepte les messages et les écrit dans un fichier, sans rien envoyer.
Usage : python3 tests/smtp-test.py 2525 /chemin/messages.txt
"""
import socketserver, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 2525
OUT = sys.argv[2] if len(sys.argv) > 2 else 'messages.txt'


class Handler(socketserver.StreamRequestHandler):
    def send(self, line):
        self.wfile.write((line + '\r\n').encode())

    def handle(self):
        self.send('220 localhost test SMTP')
        data_mode, buf = False, []
        while True:
            raw = self.rfile.readline()
            if not raw:
                return
            line = raw.decode('utf-8', 'replace').rstrip('\r\n')
            if data_mode:
                if line == '.':
                    data_mode = False
                    with open(OUT, 'a', encoding='utf-8') as f:
                        f.write('\n'.join(buf) + '\n=====FIN=====\n')
                    buf = []
                    self.send('250 OK message recu')
                else:
                    buf.append(line[1:] if line.startswith('..') else line)
                continue
            cmd = line.upper()
            if cmd.startswith('EHLO') or cmd.startswith('HELO'):
                self.send('250-localhost')
                self.send('250 AUTH LOGIN')
            elif cmd.startswith('MAIL FROM') or cmd.startswith('RCPT TO') or cmd.startswith('RSET') or cmd.startswith('NOOP'):
                buf.append('X-Enveloppe: ' + line)
                self.send('250 OK')
            elif cmd == 'DATA':
                data_mode = True
                self.send('354 Go ahead')
            elif cmd == 'QUIT':
                self.send('221 Bye')
                return
            else:
                self.send('502 Command not implemented')


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with Server(('127.0.0.1', PORT), Handler) as s:
        s.serve_forever()
