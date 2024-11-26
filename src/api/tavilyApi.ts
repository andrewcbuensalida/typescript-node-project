import { tavily } from '@tavily/core'
import dotenv from 'dotenv'

dotenv.config()

// Step 1. Instantiating your Tavily client
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY })

export async function tavilySearch(tavilyQuery: string) {
  console.log('Searching using Tavily.... Query:', tavilyQuery)
  let response
  try {
    response = await tvly.searchContext(tavilyQuery, {})
  } catch (error) {
    console.error('Error executing Tavily search:', error)
    response = 'Error executing Tavily search'
  } finally {
    return response
  }
}

// Test the function
// tavilySearch('What is the capital of France?');
