import { Pool } from 'pg';

export default new Pool({
  user: 'your_username',
  host: 'localhost',
  database: 'react-chatgpt-clone',
  password: 'your_password',
  port: 5433,
});
