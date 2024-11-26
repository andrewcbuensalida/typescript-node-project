import axios from 'axios'

export async function getPokemonImage(nameOrNumber: string = 'pikachu') {
  console.log(`Fetching Pokémon image for ${nameOrNumber}...`)
  const url = `https://pokeapi.co/api/v2/pokemon/${nameOrNumber}`
  try {
    const response = await axios.get(url)
    return (
      response.data.sprites.other['official-artwork'].front_default ||
      response.data.sprites.other.home.front_default
    )
    // mimikyu, the 778th Pokémon, errors because in pokeapi the name is mimikyu-disguised.
    // pic of 1024 LLM says it's Gholdengo (hallucination), but PokeAPI says it's terapagos (ground truth). This would be good for multi tool calling, where tavily is called first to get the pokemon name, then that name is passed to getPokemonImage.
  } catch (error) {
    console.error(`Error fetching data for Pokémon ${nameOrNumber}:`)
    throw error
  }
}
