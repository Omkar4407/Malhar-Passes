import 'dotenv/config';
import { signToken } from './services/jwt.service.js';

const userToken = signToken({ role: 'user', email: 'test@gmail.com', userId: 'test-123' });
const adminToken = signToken({ role: 'super_admin', email: 'admin@malhar.com' });

console.log('USER TOKEN:');
console.log(userToken);
console.log('');
console.log('ADMIN TOKEN:');
console.log(adminToken);