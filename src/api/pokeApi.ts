import axios from 'axios';

export async function getPokemonImage(name: string = 'pikachu') {
  console.log(`Fetching Pokémon image for ${name}...`);
  const url = `https://pokeapi.co/api/v2/pokemon/${name}`;
  try {
    const response = await axios.get(url);
    return response.data.sprites.other['official-artwork'].front_default || response.data.sprites.other.home.front_default;
  } catch (error) {
    console.error(`Error fetching data for Pokémon ${name}:`);
    throw error;
  }
}
