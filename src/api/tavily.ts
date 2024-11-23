import { tavily } from '@tavily/core';
import dotenv from 'dotenv';

dotenv.config();

// Step 1. Instantiating your Tavily client
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

export async function tavilySearch(tavilyQuery: string) {
  console.log('Searching using Tavily.... Query:', tavilyQuery);
  try {
    const response = await tvly.searchContext(tavilyQuery, {});
    return response;
  } catch (error) {
    console.error('Error executing search context:', error);
    throw error;
  }
}

// Test the function
// tavilySearch('What is the capital of France?');