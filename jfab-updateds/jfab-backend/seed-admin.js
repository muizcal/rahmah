// seed-admin.js — Run ONCE to create the admin user in MongoDB
// Usage: node seed-admin.js
// Then delete or ignore this file

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const email = process.env.ADMIN_EMAIL || 'admin@jfabperfumes.com';
  const password = process.env.ADMIN_PASSWORD || 'jfab2024';

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log('✅ Existing user promoted to admin:', email);
    } else {
      console.log('ℹ️  Admin already exists:', email);
    }
    await mongoose.disconnect();
    return;
  }

  await User.create({
    name: 'J-Fab Admin',
    email,
    password,
    role: 'admin',
    phone: '08147474278'
  });

  console.log('✅ Admin created!');
  console.log('   Email:', email);
  console.log('   Password:', password);
  console.log('\n⚠️  Change your password after first login!');
  await mongoose.disconnect();
}

seedAdmin().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
