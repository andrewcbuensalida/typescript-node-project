import { tavily } from '@tavily/core'
import dotenv from 'dotenv'
import { withRetries } from '../withRetries'

dotenv.config()

// Step 1. Instantiating your Tavily client
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY })

export const tavilySearch = async (query: string) => {
  console.log(`Searching Tavily for ${query}...`)
  return withRetries(async () => {
    const response = await tvly.searchContext(query, {})
    return response
  })
}

// Test the function
// tavilySearch('other name for mimikyu').then(console.log).catch(console.error)
