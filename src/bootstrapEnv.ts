import path from 'path';
import { config } from 'dotenv';

// Load before any module that reads process.env (e.g. database pool). Resolves
// src/.env when running compiled output from dist/ (node dist/...).
config({ path: path.resolve(__dirname, '..', 'src', '.env') });
