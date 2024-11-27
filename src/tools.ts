export const tools: any = [
  {
    type: 'function',
    function: {
      name: 'tavilySearch',
      description:
        "Get information about a Pokemon. Call this whenever you need to know more about a Pokemon, for example when a user asks 'What is the type of Pikachu?'. You can also use this tool to get information about current events, like when the user asks 'what is the date today?' or 'what is the weather in New York?'. You should always use this tool first if the user asks for an image of a Pokemon but gives a number, not a name. Use this tool to get the name of the Pokemon.",
      parameters: {
        type: 'object',
        properties: {
          tavilyQuery: {
            type: 'string',
            description:
              "The user's question about Pokemon, other topics, or a current event about Pokemon.",
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
      name: 'getPokemonImageByName',
      description:
        "Get an image of a Pokemon to show to the user. Call this when you need to get an image of a Pokemon, for example when a user asks 'Show me Pikachu.' or 'show 35th pokemon'. Always make sure that the name is correct, lower case, and replace spaces with dashes. Important! If the user gives a number for the Pokemon, call the tavilySearch tool first to get the name of the Pokemon.",
      parameters: {
        type: 'object',
        properties: {
          pokemonName: {
            type: 'string',
            description: 'The name of the Pokemon. Not the number',
          },
        },
        required: ['pokemonName'],
        additionalProperties: false,
      },
    },
  },
]
