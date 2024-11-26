import OpenAI from 'openai'
import { tools } from '../tools'
import { openaiChatCompletionsCreateArgs } from '../types'
import { withRetries } from '../withRetries'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function openaiChatCompletionsCreate(args: openaiChatCompletionsCreateArgs) {
  return withRetries(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      tools,
      parallel_tool_calls: false, // so LLM doesn't respond with multiple tool calls
      ...args,
    } as any)
    return response
  })
}

export { openaiChatCompletionsCreate }