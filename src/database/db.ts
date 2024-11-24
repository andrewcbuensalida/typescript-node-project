import { Pool } from 'pg'

export default new Pool({
  user: 'yourusername',
  host: 'localhost',
  database: 'pokemon_chatbot_db',
  password: 'yourpassword',
  port: 5433,
})
