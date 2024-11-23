import axios from 'axios';

export async function getPokemon(limit: number = 10, offset: number = 0) {
  console.log('Fetching Pokémon data...');
  const url = `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`;
  try {
    const response = await axios.get(url);
    return response.data.results;
  } catch (error) {
    console.error('Error fetching Pokémon data:', error);
    throw error;
  }
}

export async function getPokemonImage(name: string = 'pikachu') {
  const url = `https://pokeapi.co/api/v2/pokemon/${name}`;
  try {
    const response = await axios.get(url);
    return response.data.sprites.front_default;
  } catch (error) {
    console.error(`Error fetching data for Pokémon ${name}:`, error);
    throw error;
  }
}
