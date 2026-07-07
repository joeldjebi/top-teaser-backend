import bcrypt from 'bcryptjs'
import { db } from '../database/mysql.js'

const admin = {
  name: 'Super Admin',
  email: 'jo.djebi@gmail.com',
  password: '12345678',
  role: 'admin',
} as const

async function createSuperAdmin() {
  const passwordHash = await bcrypt.hash(admin.password, 12)

  await db.execute(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       role = VALUES(role)`,
    [admin.name, admin.email, passwordHash, admin.role],
  )

  console.log(`Super admin ready: ${admin.email}`)
}

createSuperAdmin()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.end()
  })
