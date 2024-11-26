import { Pool } from 'pg'
import { Message } from '../types'

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      database: 'pokemon_chatbot_db',
      host: process.env.IS_IN_CONTAINER ? 'host.docker.internal' : 'localhost', // 'host.docker.internal' if nodejs is in container, and postgres is in a container. 'localhost' if nodejs is running on your local machine and postgres is in a container.
      password: 'yourpassword',
      port: 5433,
      user: 'yourusername',
    })

async function selectMessagesByUserId(userId: number) {
  const query = `
        SELECT * FROM messages
        WHERE user_id = $1
      `
  const values = [userId]

  try {
    const res = await pool
      .query(query, values)
    return res
  } catch (err) {
    console.error('Error selecting messages from database', err)
    throw err
  }
}

async function insertMessageIntoDb(message: Message) {
  const query = `
        INSERT INTO messages (content, created_at, error_message, role, title, tool_call_id, tool_calls, tool_name, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `
  const values = [
    message.content,
    message.createdAt,
    message.errorMessage,
    message.role,
    message.title,
    message.tool_call_id,
    JSON.stringify(message.tool_calls),
    message.toolName,
    message.userId,
  ]

  try {
    const res = await pool
      .query(query, values)
    return res
  } catch (err) {
    console.error('Error inserting message into database', err)
    throw err
  }
}

export { selectMessagesByUserId,insertMessageIntoDb }
