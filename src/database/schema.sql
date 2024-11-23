DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  "role" VARCHAR(50) NOT NULL,
  user_id INT REFERENCES users(user_id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tool_call_id VARCHAR(100),
  tool_calls VARCHAR(500)
);

INSERT INTO users (username, email, password) 
VALUES ('dummy_user', 'dummy@example.com', 'password123');