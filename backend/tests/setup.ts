import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

// Base MongoDB isolée en mémoire pour chaque fichier de test.
process.env.JWT_SECRET = 'test-secret'

let mongo: MongoMemoryServer

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri())
})

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections()
  await Promise.all(collections.map((c) => c.deleteMany({})))
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongo.stop()
})
