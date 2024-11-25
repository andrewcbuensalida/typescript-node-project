"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
exports.default = process.env.DATABASE_URL
    ? new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    })
    : new pg_1.Pool({
        database: 'pokemon_chatbot_db',
        host: process.env.IS_IN_CONTAINER ? 'host.docker.internal' : 'localhost', // 'host.docker.internal' if nodejs is in container, and postgres is in a container. 'localhost' if nodejs is running on your local machine and postgres is in a container.
        password: 'yourpassword',
        port: 5433,
        user: 'yourusername',
    });
