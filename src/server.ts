import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pool from './database/db';
import OpenAI from 'openai';
import { tools } from './tools';
import { tavilySearch } from './api/tavily';
import { getPokemon } from './api/pokeApi';
import { title } from 'process';
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
  max: 10, // limit each IP to 100 requests per minute defined in windowMs
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

  // if this is the first message in the conversation, req.body.title gets the user's first message
  if(!req.body.title) {
    req.body.title = req.body.message;
  }
  // Fetch previous messages from the database, if any
  const previousMessages: Message[] = [];
  try {
    const result = await pool.query('SELECT * FROM messages WHERE user_id = $1', [USERID]);
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

  console.log(`*Example previousMessages: `, previousMessages);

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
    console.log('Fetching response from OpenAI API...');
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
      tool_calls: response.choices[0].message.tool_calls,
    };

    console.log(`*Example response: `, response);
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
      res.json(newAssistantMessage);
      // if it's a tool call
    } else if (response.choices[0].finish_reason === 'tool_calls') {
      const toolCall = response.choices[0].message.tool_calls[0];
      console.log(`*Example toolCall: `, toolCall);
      console.log(`*Example response.choices[0].message: `, response.choices[0].message)
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
        console.log(`*Example messages: `, messages)

        console.log('about to call OpenAI API again');
        
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

        res.json(assistantResponseToToolCallMessage);
      }
      else if (toolCall.function.name === 'getPokemon') {
        const limit = JSON.parse(toolCall.function.arguments).limit;
        console.log(`*Example limit: `, limit);
        const getPokemonResponse = await getPokemon(limit);
        console.log(`*Example getPokemonResponse: `, getPokemonResponse);
        

      //   // } else if (toolCall.function.name === 'getPokemonImage') {
      //   //   newMessage = {
      //   //     role: 'assistant',
      //   //     content: 'This is the response from the getPokemonImage tool.',
      //   //     refusal: null,
      //   //   };
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
