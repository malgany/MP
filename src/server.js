require('dotenv').config();

const http = require('http');
const app = require('./app');

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Servidor (marketplace) em http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('Erro ao iniciar o servidor:', error);
  process.exit(1);
});
