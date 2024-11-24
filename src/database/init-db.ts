import { readFileSync } from 'fs'
import { Client } from 'pg'
import path from 'path'

const DATABASE_NAME = 'pokemon_chatbot_db'
// Configuration for connecting to the default database (postgres)
const defaultConfig = {
  user: 'your_username',
  host: 'localhost',
  password: 'your_password',
  port: 5433,
}

// Configuration for connecting to the new database
const newDbConfig = {
  ...defaultConfig,
  database: DATABASE_NAME,
}

// Have to do this in two steps because you can't connect to a database that doesn't exist
// Step 1: Create the database
async function createDatabase() {
  const client = new Client(defaultConfig)
  try {
    await client.connect()
    console.log('Connected to the default database.')

    // you can't drop a database that you are currently connected to in docker desktop,
    const checkDbExistsQuery = `
      SELECT 1 FROM pg_database WHERE datname = '${DATABASE_NAME}'
    `
    const dbExistsResult = await client.query(checkDbExistsQuery)

    if (dbExistsResult.rowCount === 0) {
      const createDbQuery = `CREATE DATABASE ${DATABASE_NAME}`
      await client.query(createDbQuery)
    }
    console.log(`Database "${DATABASE_NAME}" created successfully.`)
  } catch (err) {
    console.error('Error creating the database:', err)
  } finally {
    await client.end()
    console.log('Disconnected from the default database.')
  }
}

// Step 2: Connect to the new database
async function connectToNewDatabase() {
  const client = new Client(newDbConfig)
  try {
    await client.connect()
    console.log('Connected to the new database.')

    const sql = readFileSync(path.join(__dirname, 'schema.sql')).toString()

    await client
      .query(sql)
      .then(() => {
        console.log('Tables created successfully')
      })
      .catch((err) => {
        console.error('Error creating tables:', err)
      })
  } catch (err) {
    console.error('Error connecting to the new database:', err)
  } finally {
    await client.end()
    console.log('Disconnected from the new database.')
  }
}

// Execute the steps
;(async function main() {
  await createDatabase()
  await connectToNewDatabase()
})()
