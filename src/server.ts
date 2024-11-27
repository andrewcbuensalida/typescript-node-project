import './logger' // should be on top
import dotenv from 'dotenv'
dotenv.config()
//
import express, { Application, Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { insertMessageIntoDb, selectMessages } from './database/db'
import { tavilySearch } from './api/tavilyApi'
import { getPokemonImageByName } from './api/pokeApi'
import { Message } from './types'
import { openaiChatCompletionsCreate } from './api/openaiApi'

const USERID = 1 // TODO user needs to send this in the jwt token

const app: Application = express()
// Express Middlewares
app.use(helmet())
app.use(cors({ origin: '*' })) // Allow CORS from any origin
app.use(express.urlencoded({ limit: '25mb', extended: true }))
app.use(express.json())

const limiter = rateLimit({
  windowMs: 60 * 10000, // 10 minute
  max: 100, // limit each IP to 100 requests per minute defined in windowMs
  message: 'Too many requests from this IP, please try again later.',
})

const auth = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.authorization?.split(' ')[1] !== 'andrewcbuensalida') {
    return res.status(401).send('Unauthorized')
  }
  next()
}

app.get('/healthCheck', (req, res) => {
  res.status(200).send('OK')
})

// get all messages for the user
app.get('/api/messages', auth, async (req, res) => {
  console.log('Fetching previous messages...')
  try {
    const result = await selectMessages({ userId: USERID })
    const messages: Message[] = result.rows.map((row: any) => ({
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
    }))
    const filteredMessages = messages.filter(
      (message) =>
        (message.role === 'assistant' || message.role === 'user') &&
        !message.tool_calls
    )
    res.json(filteredMessages)
  } catch (error) {
    console.error('Error fetching messages from database:', error)
    res.status(500).send('Internal Server Error')
  }
})

app.post('/api/completions', auth, limiter, async (req, res) => {
  // TODO need to authenticate USERID from jwt token then need to make sure USERID is the same as the user_id in the chat record for authorization

  // If it's the first message, set the title to the message
  if (!req.body.title) {
    req.body.title = req.body.message // TODO chat id needs to come from the frontend
  }

  // Fetch previous messages from the database, if any
  const previousMessages: Message[] = []
  try {
    const result = await selectMessages({
      userId: USERID,
      title: req.body.title,
    })
    // convert tool_calls from string in db to JSON
    result.rows.forEach((row: any) => {
      if (row.tool_calls) {
        row.tool_calls = JSON.parse(row.tool_calls)
      }
    })
    previousMessages.push(...result.rows)
  } catch (error) {
    console.error('Error fetching previous messages from database:', error)
    return res.status(500).send('Internal Server Error')
  }

  if (previousMessages.length === 0) {
    const systemMessage: Message = {
      userId: USERID,
      role: 'system',
      content: `You are a helpful expert with Pokemon. Use the supplied tools to assist the user. If a user asks general information about Pokemon, or current events, use the tavilySearch tool. If a user asks for an image of a Pokemon and gives a number, first use the tavilySearch tool to get the name, then pass that name to the getPokemonImageByName tool to get the image. If you can't find the answer after 5 tool calls, say you don't know. Important, the current date at is ${new Date().toLocaleDateString()}.`,
      title: req.body.title, // the title gets the user's first message
      createdAt: new Date(),
    }
    // insert system message into database
    try {
      const result = await insertMessageIntoDb(systemMessage)
      const { id } = result.rows[0]
      systemMessage.id = id
    } catch (error) {
      console.error('Error inserting system message into database:', error)
      return res.status(500).send('Internal Server Error')
    }
    previousMessages.push(systemMessage)
  }

  const newUserMessage: Message = {
    role: 'user',
    content: req.body.message,
    title: req.body.title,
    userId: USERID,
    createdAt: new Date(),
  }
  // insert user message into database
  try {
    const userMessageResult = await insertMessageIntoDb(newUserMessage)
    const { id } = userMessageResult.rows[0]
    newUserMessage.id = id
  } catch (error) {
    console.error('Error inserting user message into database:', error)
    return res.status(500).send('Internal Server Error')
  }

  const messages: any = [...previousMessages, newUserMessage]

  let newAssistantMessage: Message

  // loop and call as many tools until the LLM decides to stop
  while (true) {
    let response
    try {
      console.log(
        `Sending user message to OPENAI "${messages[
          messages.length - 1
        ].content.substring(0, 50)}..."`
      )
      response = await openaiChatCompletionsCreate({
        messages: messages,
      })
    } catch (e: any) {
      console.error(e)
      return res.status(500).send(e.message)
    }
    newAssistantMessage = {
      role: 'assistant',
      content: response.choices[0].message.content || '', // this is '' if it's a tool call
      title: req.body.title,
      userId: USERID,
      createdAt: new Date(),
      tool_calls: response.choices[0].message.tool_calls, // could be undefined. If parallel_tool_calls is true, this will at most be an array of 1 tool call. If parallel_tool_calls is false, it breaks if LLM decides more than one tool call is needed and there isn't a tool call message afterwards for each. Questions like '54th pokemon?' produce two tool calls.
    }
    console.log(
      `Assistant response: ${newAssistantMessage.content.substring(0, 50)}...`
    )

    // insert assistant message into database
    try {
      const assistantMessageResult =
        await insertMessageIntoDb(newAssistantMessage)
      const { id } = assistantMessageResult.rows[0]
      newAssistantMessage.id = id
    } catch (error) {
      console.error('Error inserting assistant message into database:', error)
      return res.status(500).send('Internal Server Error')
    }
    messages.push(newAssistantMessage)

    // if not a tool call, could be stop, or other reason
    if (response.choices[0].finish_reason !== 'tool_calls') {
      return res.json({ newMessages: [newUserMessage, newAssistantMessage] })
      // if it's a tool call
    } else if (response.choices[0].finish_reason === 'tool_calls') {
      const toolCall = response.choices[0].message.tool_calls[0]

      if (toolCall.function.name === 'tavilySearch') {
        const tavilyQuery = JSON.parse(toolCall.function.arguments).tavilyQuery

        let tavilyResponse
        try {
          tavilyResponse = await tavilySearch(tavilyQuery)
        } catch (e) {
          console.error(e)
          tavilyResponse = 'Error responding to message'
        }

        const functionCallResultMessage: Message = {
          role: 'tool',
          content: JSON.stringify({
            tavilyQuery: tavilyQuery,
            tavilyResponse: tavilyResponse,
          }),
          tool_call_id: response.choices[0].message.tool_calls[0].id,
          createdAt: new Date(),
          title: req.body.title,
          userId: USERID,
        }
        console.log(
          `Tool response: ${functionCallResultMessage.content.substring(
            0,
            50
          )}...`
        )
        // insert function call result message into database
        try {
          const functionCallResultMessageResult = await insertMessageIntoDb(
            functionCallResultMessage
          )
          const { id } = functionCallResultMessageResult.rows[0]
          functionCallResultMessage.id = id
        } catch (error) {
          console.error(
            'Error inserting function call result message into database:',
            error
          )
          // TODO need to delete the LLM tool calls message from the database so it doesn't error
          return res.status(500).send('Internal Server Error')
        }
        messages.push(functionCallResultMessage)
      } else if (toolCall.function.name === 'getPokemonImageByName') {
        const pokemonName = JSON.parse(toolCall.function.arguments).pokemonName

        let pokemonImage
        let errorMessage
        try {
          pokemonImage = await getPokemonImageByName(pokemonName)
        } catch (error: any) {
          console.error('Error fetching Pokemon image:', error.message)
          errorMessage = 'Error fetching Pokemon image'
        }

        const functionCallResultMessage: Message = {
          role: 'tool',
          content:
            errorMessage ||
            JSON.stringify({
              pokemonName: pokemonName,
              pokemonImage: pokemonImage,
            }),
          tool_call_id: response.choices[0].message.tool_calls[0].id,
          createdAt: new Date(),
          title: req.body.title,
          userId: USERID,
          toolName: 'getPokemonImageByName',
          errorMessage: errorMessage,
        }
        console.log(
          `Tool response: ${functionCallResultMessage.content.substring(
            0,
            50
          )}...`
        )
        // insert function call result message into database
        try {
          const functionCallResultMessageResult = await insertMessageIntoDb(
            functionCallResultMessage
          )
          const { id } = functionCallResultMessageResult.rows[0]
          functionCallResultMessage.id = id
        } catch (error) {
          console.error(
            'Error inserting function call result message into database:',
            error
          )
          // TODO need to delete the LLM tool calls message from the database so it doesn't error
          return res.status(500).send('Internal Server Error')
        }
        messages.push(functionCallResultMessage)

        // Don't need to loop back to the top because we don't need to get the LLMs response to the tool call, we just use a placeholder message
        const assistantResponseToToolCallMessage: Message = {
          role: 'assistant',
          content:
            errorMessage ||
            JSON.stringify({
              pokemonName: pokemonName,
              pokemonImage: pokemonImage,
            }),
          createdAt: new Date(),
          title: req.body.title,
          userId: USERID,
          toolName: 'getPokemonImageByName',
          errorMessage: errorMessage,
        }

        console.log(
          `Assistant response: ${assistantResponseToToolCallMessage.content.substring(
            0,
            50
          )}...`
        )
        // insert function call result message into database
        try {
          const assistantResponseToToolCallMessageResult =
            await insertMessageIntoDb(assistantResponseToToolCallMessage)
          const { id } = assistantResponseToToolCallMessageResult.rows[0]
          assistantResponseToToolCallMessage.id = id
        } catch (error) {
          console.error(
            'Error inserting assistant response to tool call message into database:',
            error
          )
          return res.status(500).send('Internal Server Error')
        }

        return res.json({
          newMessages: [newUserMessage, assistantResponseToToolCallMessage],
        })
      }
    }
  }
})

// Start the server
const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})
