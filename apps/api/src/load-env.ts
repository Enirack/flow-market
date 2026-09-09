import { config } from 'dotenv';
import { resolve } from 'node:path';

// NestJS ne charge le fichier .env (via ConfigModule) qu'au moment ou le
// decorateur @Module de AppModule s'evalue, ce qui arrive APRES que tous les
// imports statiques (donc @flowmarket/database, qui lit process.env.DATABASE_URL
// des son chargement) aient deja ete resolus. On charge donc le .env explicitement
// ici, en tout premier import de main.ts, pour garantir l'ordre correct.
config({ path: resolve(__dirname, '../../../.env') });
