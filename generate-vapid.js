// Run this ONCE to generate your VAPID keys:
// node generate-vapid.js
// Then copy the output into your .env / Supabase env vars

const webpush = require('web-push');
const keys    = webpush.generateVAPIDKeys();

console.log('\n=== VAPID Keys — copy these into your .env ===\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('\nKeep the PRIVATE key secret. The PUBLIC key also goes in public/sw.js');
