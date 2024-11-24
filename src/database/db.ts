import { Pool } from 'pg'

export default new Pool({
  user: 'your_username',
  host: 'localhost',
  database: 'pokemon_chatbot_db',
  password: 'your_password',
  port: 5433,
})
