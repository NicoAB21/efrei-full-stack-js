import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

// Base MongoDB isolée en mémoire pour chaque fichier de test.
process.env.JWT_SECRET = 'test-secret'

let mongo: MongoMemoryServer

// Démarrer un mongod par fichier de test peut être lent quand plusieurs suites tournent en parallèle
// sur une machine chargée : on relève À LA FOIS le délai de Jest (hook) et celui de MongoMemoryServer
// (10 s par défaut, cause réelle des échecs intermittents « Instance failed to start within 10000ms »).
const MONGO_TIMEOUT = 60_000

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: MONGO_TIMEOUT } })
  await mongoose.connect(mongo.getUri())
}, MONGO_TIMEOUT)

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections()
  await Promise.all(collections.map((c) => c.deleteMany({})))
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongo.stop()
}, MONGO_TIMEOUT)
