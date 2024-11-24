export const tools: any = [
  {
    type: 'function',
    function: {
      name: 'tavilySearch',
      description:
        "Get information about a Pokemon. Call this whenever you need to know more about a Pokemon, for example when a user asks 'What is the type of Pikachu?'. You can also use this tool to get information about other topics and current events.",
      parameters: {
        type: 'object',
        properties: {
          tavilyQuery: {
            type: 'string',
            description: "The user's question about Pokemon, other topics, or a current event about Pokemon.",
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
      name: 'getPokemonImage',
      description:
        "Get an image of a Pokemon. Call this when you need to get an image of a Pokemon, for example when a user asks 'Show me a picture of Pikachu.'",
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the Pokemon.',
          },
        },
        required: ['name'],
        additionalProperties: false,
      },
    },
  },
];
