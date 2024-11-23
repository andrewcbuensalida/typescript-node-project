import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pool from './database/db';
import OpenAI from 'openai';
import { tools } from './tools';
import { tavilySearch } from './api/tavily';

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

// get all chats for the user
app.get('/api/chats', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chats WHERE user_id = $1', [USERID]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chats from database:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/completions', auth, limiter, async (req, res) => {
  // TODO need to authenticate USERID from jwt token then need to make sure USERID is the same as the user_id in the chat record for authorization

  // Fetch previous messages from the database, if any
  const previousMessages: any = [];

  console.log(`*Example previousMessages: `, previousMessages);

  // Send messages to LLM so it can answer
  let newMessage: any;

  if (previousMessages.length === 0) {
    previousMessages.push({
      role: 'system',
      content: 'You are a helpful expert with Pokemon. Use the supplied tools to assist the user.',
    });
  }

  const messages: any = [
    ...previousMessages,
    {
      role: 'user',
      content: req.body.message,
    },
  ];

  try {
    console.log('Fetching response from OpenAI API...');
    const response: any = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      tools: tools,
    });

    console.log(`*Example response: `, response);
    messages.push(response.choices[0].message);
    // if not a tool call
    if (response.choices[0].finish_reason === 'stop') {
      newMessage = response.choices[0].message;
      console.log(`*Example newMessage: `, newMessage);
      // if it's a tool call
    } else if (response.choices[0].finish_reason === 'tool_calls') {
      const toolCall = response.choices[0].message.tool_calls[0];
      console.log(`*Example toolCall: `, toolCall);
      if (toolCall.function.name === 'tavilySearch') {
        const tavilyQuery = JSON.parse(toolCall.function.arguments).tavilyQuery;
        console.log(`*Example tavilyQuery: `, tavilyQuery);
        const tavilyResponse = await tavilySearch(tavilyQuery + '. The current date is ' + new Date().toDateString());
        console.log(`*Example tavilyResponse: `, tavilyResponse);

        const function_call_result_message = {
          role: 'tool',
          content: JSON.stringify({
            tavilyQuery: tavilyQuery + '. Please answer in bullet points.',
            tavilyResponse: tavilyResponse,
          }),
          tool_call_id: response.choices[0].message.tool_calls[0].id,
        };
        messages.push(function_call_result_message);

        // Call the OpenAI API's chat completions endpoint to send the tool call result back to the model
        const final_response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messages,
        });
        console.log(`*Example final_response: `, final_response);
        messages.push(final_response.choices[0].message);
        newMessage = final_response.choices[0].message;
      }
      // else if (toolCall.function.name === 'getPokemon') {
      //   newMessage = {
      //     role: 'assistant',
      //     content: 'This is the response from the trainerName tool.',
      //     refusal: null,
      //   };
      // } else if (toolCall.function.name === 'getPokemonImage') {
      //   newMessage = {
      //     role: 'assistant',
      //     content: 'This is the response from the getPokemonImage tool.',
      //     refusal: null,
      //   };
      // }
    }
  } catch (e: any) {
    console.error(e);
    res.status(500).send(e.message);
  }
  console.log(`*Example newMessage: `, newMessage);
  res.send(newMessage);
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
