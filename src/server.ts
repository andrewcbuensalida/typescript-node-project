import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pool from './database/db';
import OpenAI from 'openai';
import { tools } from './tools';
import { tavilySearch } from './api/tavily';
import { getPokemonImage } from './api/pokeApi';
import { Message } from './types';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const USERID = 1; // TODO user needs to send this in the jwt token

const app: Application = express();
// Express Middlewares
app.use(helmet());
app.use(cors());
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 10000, // 10 minute
  max: 100, // limit each IP to 100 requests per minute defined in windowMs
  message: 'Too many requests from this IP, please try again later.',
});

const auth = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.authorization?.split(' ')[1] !== 'andrewcbuensalida') {
    return res.status(401).send('Unauthorized');
  }
  next();
};

app.get('/healthCheck', auth, (req, res) => {
  res.send('Server is running');
});

// get all messages for the user
app.get('/api/messages', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages WHERE user_id = $1', [USERID]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages from database:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/completions', auth, limiter, async (req, res) => {
  // TODO need to authenticate USERID from jwt token then need to make sure USERID is the same as the user_id in the chat record for authorization

  // If it's the first message, set the title to the message
  if (!req.body.title) {
    req.body.title = req.body.message; // TODO chat id needs to come from the frontend
  }

  // Fetch previous messages from the database, if any
  const previousMessages: Message[] = [];
  try {
    const result = await pool.query('SELECT * FROM messages WHERE user_id = $1 AND title = $2', [
      USERID,
      req.body.title,
    ]);
    // convert tool_calls from string in db to JSON
    result.rows.forEach((row: any) => {
      if (row.tool_calls) {
        row.tool_calls = JSON.parse(row.tool_calls);
      }
    });
    previousMessages.push(...result.rows);
  } catch (error) {
    console.error('Error fetching previous messages from database:', error);
    return res.status(500).send('Internal Server Error');
  }

  if (previousMessages.length === 0) {
    const systemMessage: Message = {
      userId: USERID,
      role: 'system',
      content: 'You are a helpful expert with Pokemon. Use the supplied tools to assist the user.',
      title: req.body.title, // the title gets the user's first message
      createdAt: new Date(),
    };
    // insert system message into database
    try {
      const result = await pool.query(
        'INSERT INTO messages (user_id, role, content, title, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [systemMessage.userId, systemMessage.role, systemMessage.content, systemMessage.title, systemMessage.createdAt]
      );
      const { id } = result.rows[0];
      systemMessage.id = id;
    } catch (error) {
      console.error('Error inserting system message into database:', error);
      return res.status(500).send('Internal Server Error');
    }
    previousMessages.push(systemMessage);
  }

  const newUserMessage: Message = {
    role: 'user',
    content: req.body.message,
    title: req.body.title,
    userId: USERID,
    createdAt: new Date(),
  };
  // insert user message into database
  try {
    const userMessageResult = await pool.query(
      'INSERT INTO messages (user_id, role, content, title, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [
        newUserMessage.userId,
        newUserMessage.role,
        newUserMessage.content,
        newUserMessage.title,
        newUserMessage.createdAt,
      ]
    );
    const { id } = userMessageResult.rows[0];
    newUserMessage.id = id;
  } catch (error) {
    console.error('Error inserting user message into database:', error);
    return res.status(500).send('Internal Server Error');
  }

  const messages: any = [...previousMessages, newUserMessage];

  let newAssistantMessage: Message;

  try {
    const response: any = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      tools: tools,
    });
    newAssistantMessage = {
      role: 'assistant',
      content: response.choices[0].message.content || '',
      title: req.body.title,
      userId: USERID,
      createdAt: new Date(),
      tool_calls: response.choices[0].message.tool_calls?.slice(0, 1), // could be undefined. TODO It breaks if LLM decides more than one tool call is needed and you don't call all of them. Questions like '54th pokemon?' produce two tool calls. For now just get the first tool call.
    };

    // insert assistant message into database
    try {
      const assistantMessageResult = await pool.query(
        'INSERT INTO messages (user_id, role, content, title, created_at, tool_calls) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [
          newAssistantMessage.userId,
          newAssistantMessage.role,
          newAssistantMessage.content,
          newAssistantMessage.title,
          newAssistantMessage.createdAt,
          JSON.stringify(newAssistantMessage.tool_calls),
        ]
      );
      const { id } = assistantMessageResult.rows[0];
      newAssistantMessage.id = id;
    } catch (error) {
      console.error('Error inserting assistant message into database:', error);
      return res.status(500).send('Internal Server Error');
    }
    messages.push(newAssistantMessage);

    // if not a tool call
    if (response.choices[0].finish_reason === 'stop') {
      return res.json(newAssistantMessage);
      // if it's a tool call
    } else if (response.choices[0].finish_reason === 'tool_calls') {
      const toolCall = response.choices[0].message.tool_calls[0];

      if (toolCall.function.name === 'tavilySearch') {
        const tavilyQuery = JSON.parse(toolCall.function.arguments).tavilyQuery;
        const tavilyResponse = await tavilySearch(tavilyQuery + '. The current date is ' + new Date().toDateString());

        const functionCallResultMessage: Message = {
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
          const functionCallResultMessageResult = await pool.query(
            'INSERT INTO messages (user_id, role, content, tool_call_id, title, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [
              functionCallResultMessage.userId,
              functionCallResultMessage.role,
              functionCallResultMessage.content,
              functionCallResultMessage.tool_call_id,
              functionCallResultMessage.title,
              functionCallResultMessage.createdAt,
            ]
          );
          const { id } = functionCallResultMessageResult.rows[0];
          functionCallResultMessage.id = id;
        } catch (error) {
          console.error('Error inserting function call result message into database:', error);
          return res.status(500).send('Internal Server Error');
        }
        messages.push(functionCallResultMessage);

        // Call the OpenAI API's chat completions endpoint to send the tool call result back to the model
        const assistantResponseToToolCall = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messages,
        });

        const assistantResponseToToolCallMessage: Message = {
          role: 'assistant',
          content: assistantResponseToToolCall.choices[0].message.content || '',
          title: req.body.title,
          userId: USERID,
          createdAt: new Date(),
        };

        try {
          const assistantResponseToToolCallMessageResult = await pool.query(
            'INSERT INTO messages (user_id, role, content, title, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [
              assistantResponseToToolCallMessage.userId,
              assistantResponseToToolCallMessage.role,
              assistantResponseToToolCallMessage.content,
              assistantResponseToToolCallMessage.title,
              assistantResponseToToolCallMessage.createdAt,
            ]
          );
          const { id } = assistantResponseToToolCallMessageResult.rows[0];
          assistantResponseToToolCallMessage.id = id;
        } catch (error) {
          console.error('Error inserting assistant response to tool call message into database:', error);
          return res.status(500).send('Internal Server Error');
        }

        return res.json(assistantResponseToToolCallMessage);
      } else if (toolCall.function.name === 'getPokemonImage') {
        const pokemonName = JSON.parse(toolCall.function.arguments).name;

        let pokemonImage;
        let errorMessage;
        try {
          pokemonImage = await getPokemonImage(pokemonName);
        } catch (error) {
          console.error('Error fetching Pokemon image:', error);
          errorMessage = 'Error fetching Pokemon image';
        }

        const functionCallResultMessage: Message = {
          role: 'tool',
          content: errorMessage || JSON.stringify({
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
          const functionCallResultMessageResult = await pool.query(
            'INSERT INTO messages (user_id, role, content, tool_call_id, title, created_at,tool_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [
              functionCallResultMessage.userId,
              functionCallResultMessage.role,
              functionCallResultMessage.content,
              functionCallResultMessage.tool_call_id,
              functionCallResultMessage.title,
              functionCallResultMessage.createdAt,
              functionCallResultMessage.toolName,
            ]
          );
          const { id } = functionCallResultMessageResult.rows[0];
          functionCallResultMessage.id = id;
        } catch (error) {
          console.error('Error inserting function call result message into database:', error);
          return res.status(500).send('Internal Server Error');
        }

        return res.json(functionCallResultMessage);
      }
    }
  } catch (e: any) {
    console.error(e);
    res.status(500).send(e.message);
  }
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
