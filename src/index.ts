import express from 'express';
import http from 'http';

const app = express();
const server = http.createServer(app);

const WS_PORT = 8080;

app.get('/', (req, res) => {
  res.send('Hello World!\n');
});


server.listen(WS_PORT, () => {
  console.log(`Server started on http://localhost:${WS_PORT}`);
});
 
