// Servidor local / VPS (em EdgeOne Pages isto NÃO é usado — a plataforma importa [[default]].js).
import app from './node-functions/api/[[default]].js';
const port = Number(process.env.PORT || 8788);
app.listen(port, () => console.log(`despachante-api em http://localhost:${port}`));
