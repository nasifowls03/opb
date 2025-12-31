import http from "http";

const PORT = process.env.PORT || 10000;

http.createServer((req, res) => {
  // Catch-all health handler: always return 200 OK for any path.
  // This prevents external monitors (UptimeRobot, etc.) from receiving 404s
  // when the service sleeps or when unknown paths are probed.
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
}).listen(PORT, () => console.log(`Health server listening on port ${PORT}`));
