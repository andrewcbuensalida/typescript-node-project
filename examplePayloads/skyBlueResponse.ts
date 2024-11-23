const response1 = {
  id: 'chatcmpl-AWqCH40BzaefhV1cNr4MUjtxY2kvW',
  object: 'chat.completion',
  created: 1732390505,
  model: 'gpt-4o-2024-08-06',
  choices: [
    {
      index: 0,
      message: [Object], // newMessage
      logprobs: null,
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 146,
    completion_tokens: 211,
    total_tokens: 357,
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

const newMessage1 = {
  role: 'assistant',
  content:
    "The sky appears blue primarily due to a phenomenon known as Rayleigh scattering. Here's how it works:\n" +
    '\n' +
    '1. **Sunlight Composition**: Sunlight, or white light, is made up of many different colors. Each color has a specific wavelength.\n' +
    '\n' +
    "2. **Atmospheric Interaction**: As sunlight enters Earth's atmosphere, it collides with molecules and small particles in the air. These particles are smaller than the wavelengths of visible light.\n" +
    '\n' +
    "3. **Scattering of Light**: Light at the blue end of the spectrum is scattered in all directions by the tiny molecules of air. This scattering causes the direct sunlight to lose some of its blue wavelengths, which causes the sky to appear blue in the direction you're looking.\n" +
    '\n' +
    '4. **Human Perception**: Our eyes are more sensitive to blue light, enhancing the appearance of the blue sky.\n' +
    '\n' +
    'When the sun is lower in the sky, such as during sunrise or sunset, the light has to pass through more atmosphere, scattering longer wavelengths (like red and yellow), which is why we see those colors.',
  refusal: null,
};
