import axios from 'axios'

export async function getPokemonImageByName(pokemonName: string = 'pikachu') {
  console.log(`Fetching Pokémon image for ${pokemonName}...`)
  const url = `https://pokeapi.co/api/v2/pokemon/${pokemonName}`
  try {
    const response = await axios.get(url)
    return (
      response.data.sprites.other['official-artwork'].front_default ||
      response.data.sprites.other.home.front_default
    )
    // TODO mimikyu, the 778th Pokémon, errors because in pokeapi the name is mimikyu-disguised. Best way would to search tavily for the number of mimikyu, then use that in the poke api call, not the other way around which is search tavily for the name, then use that in the poke api call.
  } catch (error) {
    console.error(`Error fetching data for Pokémon ${pokemonName}:`)
    throw error
  }
}
