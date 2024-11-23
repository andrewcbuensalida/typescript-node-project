import { readFileSync } from "fs";
import { Pool } from 'pg';
import path from "path";

const pool = new Pool({
	user: "your_username",
	host: "localhost",
	database: "react-chatgpt-clone",
	password: "your_password",
	port: 5433,
});

const sql = readFileSync(path.join(__dirname, "schema.sql")).toString();

pool.query(sql)
	.then(() => {
		console.log("Tables created successfully");
		pool.end();
	})
	.catch((err) => {
		console.error("Error creating tables:", err);
		pool.end();
	});
