import axios from 'axios'

export async function getPokemonImage(name: string = 'pikachu') {
  console.log(`Fetching Pokémon image for ${name}...`)
  const url = `https://pokeapi.co/api/v2/pokemon/${name}`
  try {
    const response = await axios.get(url)
    return (
      response.data.sprites.other['official-artwork'].front_default ||
      response.data.sprites.other.home.front_default
    )
    // mimikyu, the 778th Pokémon, errors because in pokeapi the name is mimikyu-disguised.
    // pic of 1024 LLM says it's Gholdengo, but PokeAPI says it's terapagos (ground truth)
  } catch (error) {
    console.error(`Error fetching data for Pokémon ${name}:`)
    throw error
  }
}
