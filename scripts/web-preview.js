/**
 * Anteprima web: proxy davanti al server di sviluppo Expo che aggiunge le intestazioni
 * di isolamento (COOP/COEP) a tutte le risposte, pagina HTML inclusa.
 * Servono a SharedArrayBuffer, richiesto da expo-sqlite sul web.
 *
 * Uso: npx expo start --web --port 8081  (in un terminale)
 *      node scripts/web-preview.js        (in un altro) → http://localhost:8082
 */
const http = require('node:http');
const net = require('node:net');

const TARGET_PORT = Number(process.env.EXPO_PORT ?? 8081);
const PORT = Number(process.env.PREVIEW_PORT ?? 8082);

const server = http.createServer((req, res) => {
  const upstream = http.request(
    {
      host: '127.0.0.1',
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, {
        ...up.headers,
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-embedder-policy': 'credentialless',
      });
      up.pipe(res);
    },
  );
  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`Server Expo non raggiungibile sulla porta ${TARGET_PORT}: ${err.message}`);
  });
  req.pipe(upstream);
});

// WebSocket (ricaricamento a caldo): inoltro grezzo della connessione.
server.on('upgrade', (req, socket, head) => {
  const up = net.connect(TARGET_PORT, '127.0.0.1', () => {
    const headers = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');
    up.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
    up.write(head);
    socket.pipe(up).pipe(socket);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(PORT, () =>
  console.log(`Anteprima web su http://localhost:${PORT} (proxy di :${TARGET_PORT})`),
);
