import { generateKeyPairSync, randomBytes } from 'node:crypto';
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
console.log('TOKEN_PRIVATE_KEY=' + privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'));
console.log('NEXT_PUBLIC_TOKEN_PUBKEY=' + publicKey.export({ type: 'spki', format: 'der' }).toString('base64') + '   # <- vai para o FRONTEND');
console.log('REFERENCE_SECRET=' + randomBytes(32).toString('hex'));
console.log('ADMIN_TOKEN=' + randomBytes(24).toString('hex'));
