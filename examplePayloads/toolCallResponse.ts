const response = {
  id: 'chatcmpl-AWq8csR4ZUuwraQa8dLez8xiihLXV',
  object: 'chat.completion',
  created: 1732390278,
  model: 'gpt-4o-2024-08-06',
  choices: [
    {
      index: 0,
      message: [Object], // newMessage
      logprobs: null,
      finish_reason: 'tool_calls',
    },
  ],
  usage: {
    prompt_tokens: 144,
    completion_tokens: 15,
    total_tokens: 159,
    prompt_tokens_details: { cached_tokens: 0, audio_tokens: 0 },
    completion_tokens_details: {
      reasoning_tokens: 0,
      audio_tokens: 0,
      accepted_prediction_tokens: 0,
      rejected_prediction_tokens: 0,
    },
  },
  system_fingerprint: 'fp_831e067d82',
};

const newMessage = {
  role: 'assistant',
  content: null,
  tool_calls: [
    {
      id: 'call_Iu1DZvyuI6JPkfo6cYVNceQj',
      type: 'function',
      function: [Object], // toolCallFunction
    },
  ],
  refusal: null,
};

const toolCallFunction = {
  id: 'call_VUItwaX1Fyzro3PPl08HLL1S',
  type: 'function',
  function: { name: 'trainerName', arguments: '{"test":"trainer"}' },
};

