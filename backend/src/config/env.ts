import path from 'path';
import dotenv from 'dotenv';

// Load backend/.env resolved relative to this file, so it works no matter which
// directory the server is started from (not dependent on process.cwd()).
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
