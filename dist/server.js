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
    return (mod && mod.__esModule) ? mod : { 'default': mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./database/db"));
const openai_1 = __importDefault(require("openai"));
const tools_1 = require("./tools");
const tavily_1 = require("./api/tavily");
const pokeApi_1 = require("./api/pokeApi");
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const USERID = 1; // TODO user needs to send this in the jwt token
const app = (0, express_1.default)();
// Express Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: '*' })); // Allow CORS from any origin
app.use(express_1.default.urlencoded({ limit: '25mb', extended: true }));
app.use(express_1.default.json());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 10000, // 10 minute
    max: 100, // limit each IP to 100 requests per minute defined in windowMs
    message: 'Too many requests from this IP, please try again later.',
});
const auth = (req, res, next) => {
    var _a;
    if (((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]) !== 'andrewcbuensalida') {
        return res.status(401).send('Unauthorized');
    }
    next();
};
app.get('/healthCheck', (req, res) => {
    res.status(200).send('OK');
});
// get all messages for the user
app.get('/api/messages', auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Fetching previous messages...');
    try {
        const result = yield db_1.default.query('SELECT * FROM messages WHERE user_id = $1', [USERID]);
        const messages = result.rows.map((row) => ({
            content: row.content,
            createdAt: row.created_at,
            errorMessage: row.error_message,
            id: row.id,
            role: row.role,
            title: row.title,
            tool_call_id: row.tool_call_id,
            tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
            toolName: row.tool_name,
            userId: row.user_id,
        }));
        const filteredMessages = messages.filter((message) => (message.role === 'assistant' || message.role === 'user') &&
            !message.tool_calls);
        res.json(filteredMessages);
    }
    catch (error) {
        console.error('Error fetching messages from database:', error);
        res.status(500).send('Internal Server Error');
    }
}));
app.post('/api/completions', auth, limiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO need to authenticate USERID from jwt token then need to make sure USERID is the same as the user_id in the chat record for authorization
    var _a;
    // If it's the first message, set the title to the message
    if (!req.body.title) {
        req.body.title = req.body.message; // TODO chat id needs to come from the frontend
    }
    // Fetch previous messages from the database, if any
    const previousMessages = [];
    try {
        const result = yield db_1.default.query('SELECT * FROM messages WHERE user_id = $1 AND title = $2', [USERID, req.body.title]);
        // convert tool_calls from string in db to JSON
        result.rows.forEach((row) => {
            if (row.tool_calls) {
                row.tool_calls = JSON.parse(row.tool_calls);
            }
        });
        previousMessages.push(...result.rows);
    }
    catch (error) {
        console.error('Error fetching previous messages from database:', error);
        return res.status(500).send('Internal Server Error');
    }
    if (previousMessages.length === 0) {
        const systemMessage = {
            userId: USERID,
            role: 'system',
            content: 'You are a helpful expert with Pokemon. Use the supplied tools to assist the user.',
            title: req.body.title, // the title gets the user's first message
            createdAt: new Date(),
        };
        // insert system message into database
        try {
            const result = yield db_1.default.query('INSERT INTO messages (user_id, role, content, title, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id', [
                systemMessage.userId,
                systemMessage.role,
                systemMessage.content,
                systemMessage.title,
                systemMessage.createdAt,
            ]);
            const { id } = result.rows[0];
            systemMessage.id = id;
        }
        catch (error) {
            console.error('Error inserting system message into database:', error);
            return res.status(500).send('Internal Server Error');
        }
        previousMessages.push(systemMessage);
    }
    const newUserMessage = {
        role: 'user',
        content: req.body.message,
        title: req.body.title,
        userId: USERID,
        createdAt: new Date(),
    };
    // insert user message into database
    try {
        const userMessageResult = yield db_1.default.query('INSERT INTO messages (user_id, role, content, title, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id', [
            newUserMessage.userId,
            newUserMessage.role,
            newUserMessage.content,
            newUserMessage.title,
            newUserMessage.createdAt,
        ]);
        const { id } = userMessageResult.rows[0];
        newUserMessage.id = id;
    }
    catch (error) {
        console.error('Error inserting user message into database:', error);
        return res.status(500).send('Internal Server Error');
    }
    const messages = [...previousMessages, newUserMessage];
    let newAssistantMessage;
    try {
        console.log('Sending user message to OPENAI...');
        const response = yield openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            tools: tools_1.tools,
        });
        newAssistantMessage = {
            role: 'assistant',
            content: response.choices[0].message.content || '', // this is '' if it's a tool call
            title: req.body.title,
            userId: USERID,
            createdAt: new Date(),
            tool_calls: (_a = response.choices[0].message.tool_calls) === null || _a === void 0 ? void 0 : _a.slice(0, 1), // could be undefined. TODO It breaks if LLM decides more than one tool call is needed and you don't call all of them. Questions like '54th pokemon?' produce two tool calls. For now just get the first tool call.
        };
        // insert assistant message into database
        try {
            const assistantMessageResult = yield db_1.default.query('INSERT INTO messages (user_id, role, content, title, created_at, tool_calls) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [
                newAssistantMessage.userId,
                newAssistantMessage.role,
                newAssistantMessage.content,
                newAssistantMessage.title,
                newAssistantMessage.createdAt,
                JSON.stringify(newAssistantMessage.tool_calls),
            ]);
            const { id } = assistantMessageResult.rows[0];
            newAssistantMessage.id = id;
        }
        catch (error) {
            console.error('Error inserting assistant message into database:', error);
            return res.status(500).send('Internal Server Error');
        }
        messages.push(newAssistantMessage);
        // if not a tool call
        if (response.choices[0].finish_reason === 'stop') {
            return res.json({ newMessages: [newUserMessage, newAssistantMessage] });
            // if it's a tool call
        }
        else if (response.choices[0].finish_reason === 'tool_calls') {
            const toolCall = response.choices[0].message.tool_calls[0];
            if (toolCall.function.name === 'tavilySearch') {
                const tavilyQuery = JSON.parse(toolCall.function.arguments).tavilyQuery;
                const tavilyResponse = yield (0, tavily_1.tavilySearch)(tavilyQuery + '. The current date is ' + new Date().toDateString());
                const functionCallResultMessage = {
                    role: 'tool',
                    content: JSON.stringify({
                        tavilyQuery: tavilyQuery + '. Please answer in bullet points.',
                        tavilyResponse: tavilyResponse,
                    }),
                    tool_call_id: response.choices[0].message.tool_calls[0].id,
                    createdAt: new Date(),
                    title: req.body.title,
                    userId: USERID,
                };
                // insert function call result message into database
                try {
                    const functionCallResultMessageResult = yield db_1.default.query('INSERT INTO messages (user_id, role, content, tool_call_id, title, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [
                        functionCallResultMessage.userId,
                        functionCallResultMessage.role,
                        functionCallResultMessage.content,
                        functionCallResultMessage.tool_call_id,
                        functionCallResultMessage.title,
                        functionCallResultMessage.createdAt,
                    ]);
                    const { id } = functionCallResultMessageResult.rows[0];
                    functionCallResultMessage.id = id;
                }
                catch (error) {
                    console.error('Error inserting function call result message into database:', error);
                    return res.status(500).send('Internal Server Error');
                }
                messages.push(functionCallResultMessage);
                // Call the OpenAI API's chat completions endpoint to send the tool call result back to the model
                const assistantResponseToToolCall = yield openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: messages,
                });
                const assistantResponseToToolCallMessage = {
                    role: 'assistant',
                    content: assistantResponseToToolCall.choices[0].message.content || '',
                    title: req.body.title,
                    userId: USERID,
                    createdAt: new Date(),
                };
                try {
                    const assistantResponseToToolCallMessageResult = yield db_1.default.query('INSERT INTO messages (user_id, role, content, title, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id', [
                        assistantResponseToToolCallMessage.userId,
                        assistantResponseToToolCallMessage.role,
                        assistantResponseToToolCallMessage.content,
                        assistantResponseToToolCallMessage.title,
                        assistantResponseToToolCallMessage.createdAt,
                    ]);
                    const { id } = assistantResponseToToolCallMessageResult.rows[0];
                    assistantResponseToToolCallMessage.id = id;
                }
                catch (error) {
                    console.error('Error inserting assistant response to tool call message into database:', error);
                    return res.status(500).send('Internal Server Error');
                }
                return res.json({
                    newMessages: [newUserMessage, assistantResponseToToolCallMessage],
                });
            }
            else if (toolCall.function.name === 'getPokemonImage') {
                const pokemonName = JSON.parse(toolCall.function.arguments).name;
                let pokemonImage;
                let errorMessage;
                try {
                    pokemonImage = yield (0, pokeApi_1.getPokemonImage)(pokemonName);
                }
                catch (error) {
                    console.error('Error fetching Pokemon image:', error);
                    errorMessage = 'Error fetching Pokemon image';
                }
                const functionCallResultMessage = {
                    role: 'tool',
                    content: errorMessage ||
                        JSON.stringify({
                            pokemonName: pokemonName,
                            pokemonImage: pokemonImage,
                        }),
                    tool_call_id: response.choices[0].message.tool_calls[0].id,
                    createdAt: new Date(),
                    title: req.body.title,
                    userId: USERID,
                    toolName: 'getPokemonImage',
                    errorMessage: errorMessage,
                };
                // insert function call result message into database
                try {
                    const functionCallResultMessageResult = yield db_1.default.query('INSERT INTO messages (user_id, role, content, tool_call_id, title, created_at,tool_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', [
                        functionCallResultMessage.userId,
                        functionCallResultMessage.role,
                        functionCallResultMessage.content,
                        functionCallResultMessage.tool_call_id,
                        functionCallResultMessage.title,
                        functionCallResultMessage.createdAt,
                        functionCallResultMessage.toolName,
                    ]);
                    const { id } = functionCallResultMessageResult.rows[0];
                    functionCallResultMessage.id = id;
                }
                catch (error) {
                    console.error('Error inserting function call result message into database:', error);
                    return res.status(500).send('Internal Server Error');
                }
                const assistantResponseToToolCallMessage = {
                    role: 'assistant',
                    content: errorMessage ||
                        JSON.stringify({
                            pokemonName: pokemonName,
                            pokemonImage: pokemonImage,
                        }),
                    tool_call_id: response.choices[0].message.tool_calls[0].id,
                    createdAt: new Date(),
                    title: req.body.title,
                    userId: USERID,
                    toolName: 'getPokemonImage',
                    errorMessage: errorMessage,
                };
                // insert function call result message into database
                try {
                    const assistantResponseToToolCallMessageResult = yield db_1.default.query('INSERT INTO messages (user_id, role, content, tool_call_id, title, created_at,tool_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', [
                        assistantResponseToToolCallMessage.userId,
                        assistantResponseToToolCallMessage.role,
                        assistantResponseToToolCallMessage.content,
                        assistantResponseToToolCallMessage.tool_call_id,
                        assistantResponseToToolCallMessage.title,
                        assistantResponseToToolCallMessage.createdAt,
                        assistantResponseToToolCallMessage.toolName,
                    ]);
                    const { id } = assistantResponseToToolCallMessageResult.rows[0];
                    assistantResponseToToolCallMessage.id = id;
                }
                catch (error) {
                    console.error('Error inserting assistant response to tool call message into database:', error);
                    return res.status(500).send('Internal Server Error');
                }
                return res.json({
                    newMessages: [newUserMessage, assistantResponseToToolCallMessage],
                });
            }
        }
    }
    catch (e) {
        console.error(e);
        res.status(500).send(e.message);
    }
}));
// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
