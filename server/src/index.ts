import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { config } from './config.js';
import placesRouter from './routes/places.js';
import leadsRouter from './routes/leads.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: config.allowedExtensionOrigin ? [config.allowedExtensionOrigin] : true }));
app.use(express.json({ limit: '128kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/health', (_req,res)=>res.json({ok:true,service:'google-musteri-toplama',time:new Date().toISOString()}));
app.use('/api/places', placesRouter);
app.use('/api/leads', leadsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  if (error instanceof ZodError) return res.status(400).json({ error: 'Gönderilen bilgiler geçersiz.', details: error.issues.map(i=>i.message) });
  const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
  const safe = message.includes('yapılandırılmamış') ? message : 'İşlem tamamlanamadı. Lütfen tekrar dene.';
  res.status(message.includes('yapılandırılmamış') ? 503 : 500).json({ error: safe });
});

app.listen(config.port, ()=>console.log(`API http://localhost:${config.port} adresinde çalışıyor.`));
