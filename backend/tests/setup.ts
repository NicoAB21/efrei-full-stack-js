import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

// Base MongoDB isolée en mémoire pour chaque fichier de test.
process.env.JWT_SECRET = 'test-secret'

let mongo: MongoMemoryServer

// Démarrer un mongod par fichier de test peut dépasser les 5 s par défaut de Jest
// quand plusieurs suites tournent en parallèle sur une machine chargée.
const MONGO_TIMEOUT = 60_000

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
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
