export const tools: any = [
  {
    type: 'function',
    function: {
      name: 'tavilySearch',
      description:
        "Get current information about anything, and about Pokemon. Call this whenever you need to know the current events about Pokemon, for example when a user asks 'Are there any Pokemon conventions in my city?' or 'What is the date today?'",
      parameters: {
        type: 'object',
        properties: {
          tavilyQuery: {
            type: 'string',
            description: "The user's question about a current event about Pokemon.",
          },
        },
        required: ['tavilyQuery'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPokemon',
      description:
        "Get a list of Pokemon. Call this whenever you need to know the list of Pokemon, for example when a user asks 'What are the names of all the Pokemon?' Always ask how many to return first before calling this tool.",
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'The number of Pokemon to return.',
          },
          offset: {
            type: 'number',
            description: 'The number of Pokemon to skip.',
          },
        },
        required: ['limit'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPokemonImage',
      description:
        "Get an image of a Pokemon. Call this whenever you need to know the image url of a Pokemon, for example when a user asks 'Show me a picture of Pikachu.'",
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the Pokemon.',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
];