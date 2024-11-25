"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const pg_1 = require("pg");
const path_1 = __importDefault(require("path"));
const DATABASE_NAME = 'pokemon_chatbot_db';
// Configuration for connecting to the default database (postgres)
const defaultConfig = {
    user: 'yourusername',
    host: 'localhost',
    password: 'yourpassword',
    port: 5433,
};
// Configuration for connecting to the new database
const newDbConfig = Object.assign(Object.assign({}, defaultConfig), { database: DATABASE_NAME });
// Have to do this in two steps because you can't connect to a database that doesn't exist
// Step 1: Create the database
function createDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new pg_1.Client(defaultConfig);
        try {
            yield client.connect();
            console.log('Connected to the default database.');
            // you can't drop a database that you are currently connected to in docker desktop,
            const checkDbExistsQuery = `
      SELECT 1 FROM pg_database WHERE datname = '${DATABASE_NAME}'
    `;
            const dbExistsResult = yield client.query(checkDbExistsQuery);
            if (dbExistsResult.rowCount === 0) {
                const createDbQuery = `CREATE DATABASE ${DATABASE_NAME}`;
                yield client.query(createDbQuery);
            }
            console.log(`Database "${DATABASE_NAME}" created successfully.`);
        }
        catch (err) {
            console.error('Error creating the database:', err);
        }
        finally {
            yield client.end();
            console.log('Disconnected from the default database.');
        }
    });
}
// Step 2: Connect to the new database
function connectToNewDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new pg_1.Client(newDbConfig);
        try {
            yield client.connect();
            console.log('Connected to the new database.');
            const sql = (0, fs_1.readFileSync)(path_1.default.join(__dirname, 'schema.sql')).toString();
            yield client
                .query(sql)
                .then(() => {
                console.log('Tables created successfully');
            })
                .catch((err) => {
                console.error('Error creating tables:', err);
            });
        }
        catch (err) {
            console.error('Error connecting to the new database:', err);
        }
        finally {
            yield client.end();
            console.log('Disconnected from the new database.');
        }
    });
}
// Execute the steps
;
(function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield createDatabase();
        yield connectToNewDatabase();
    });
})();
