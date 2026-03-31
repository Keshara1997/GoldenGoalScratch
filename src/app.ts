import express from 'express';
import { startRound, revealAll } from './controllers/GameController';

const app = express();
app.use(express.json());

app.post('/api/game/start', startRound);
app.post('/api/game/reveal-all', revealAll);

export default app;