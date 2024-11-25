import { Pool } from 'pg'

export default process.env.DATABASE_URL
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
