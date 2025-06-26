// Objeto con los rangos de las regiones
const regionRanges = {
    "Kanto (1-151)": { start: 1, end: 151 },
    "Johto (152-251)": { start: 152, end: 251 },
    "Hoenn (252-386)": { start: 252, end: 386 },
    "Sinnoh (387-493)": { start: 387, end: 493 },
    "Unova (494-649)": { start: 494, end: 649 },
    "Kalos (650-721)": { start: 650, end: 721 },
    "Alola (722-809)": { start: 722, end: 809 },
    "Galar (810-898)": { start: 810, end: 898 },
    "Paldea (899-1010)": { start: 899, end: 1010 }
};

// Variables globales
let currentPokemonId = 1; // Charizard por defecto
let currentPokemonData = null; // Almacena los datos del Pokémon actual
let currentRegion = "Kanto (1-151)";
let allPokemon = [];
let isShiny = false;

// DOM Elements
const pokemonName = document.querySelector('.pokemon-name');
const pokemonId = document.querySelector('.pokemon-id');
const speciesContainer = document.querySelector('.species-container');
const imageContainer = document.querySelector('.image-container');
const typeBadges = document.querySelector('.type-badges');
const infoValueHeight = document.querySelector('.info-card:nth-child(1) .info-value');
const infoValueWeight = document.querySelector('.info-card:nth-child(2) .info-value');
const description = document.querySelector('.description');
const abilitiesContainer = document.querySelector('.abilities-container');
const statsContainer = document.querySelector('.stats-container');
const pokemonGrid = document.querySelector('.pokemon-grid');
const regionSelector = document.querySelector('.region-selector');
const searchBox = document.querySelector('.search-box');
const searchButton = document.querySelector('.search-button');
const shinyToggle = document.querySelector('.shiny-toggle');
const shinyIndicator = document.querySelector('.shiny-indicator');

// Funciones de la API
async function fetchPokemonData(id) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!response.ok) throw new Error('Pokémon not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching Pokémon data:', error);
        return null;
    }
}

async function fetchPokemonSpeciesData(id) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
        if (!response.ok) throw new Error('Pokémon species not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching species data:', error);
        return null;
    }
}

async function fetchAbilityDescription(abilityUrl) {
    try {
        const response = await fetch(abilityUrl);
        if (!response.ok) throw new Error('Ability not found');
        const abilityData = await response.json();

        // Buscar descripción en effect_entries (inglés)
        const englishEffect = abilityData.effect_entries.find(
            entry => entry.language.name === 'en'
        );

        // Si no hay effect_entries, usar flavor_text_entries
        if (englishEffect) {
            return englishEffect.short_effect || englishEffect.effect;
        } else {
            // Buscar en flavor_text_entries
            const englishFlavor = abilityData.flavor_text_entries.find(
                entry => entry.language.name === 'en'
            );
            return englishFlavor ?
                englishFlavor.flavor_text.replace(/\f/g, ' ') :
                "Ability description not available";
        }
    } catch (error) {
        console.error('Error fetching ability description:', error);
        return "Failed to load ability description";
    }
}

async function fetchPokemonListForRegion(regionName) {
    const range = regionRanges[regionName];
    const pokemonList = [];

    // Mostrar indicador de carga
    pokemonGrid.innerHTML = '<div class="loading" style="grid-column: 1 / span 3;"><div class="spinner"></div></div>';

    // Obtener todo el rango de la región
    for (let id = range.start; id <= range.end; id++) {
        const pokemon = await fetchPokemonData(id);
        if (pokemon) pokemonList.push(pokemon);
    }

    return pokemonList;
}

// Actualizar la interfaz con los datos del Pokémon
async function updatePokemonDetails(id) {
    // Mostrar indicador de carga
    pokemonName.textContent = "Loading...";
    pokemonId.textContent = "#---";
    speciesContainer.textContent = "Loading species...";
    description.textContent = "Loading description...";

    // Obtener datos del Pokémon y su especie
    const pokemonData = await fetchPokemonData(id);
    const speciesData = await fetchPokemonSpeciesData(id);

    if (!pokemonData || !speciesData) {
        alert('Error loading Pokémon data');
        return;
    }

    // Guardar los datos actuales del Pokémon
    currentPokemonData = pokemonData;

    // Actualizar datos básicos
    pokemonName.textContent = pokemonData.name;
    pokemonId.textContent = `#${pokemonData.id.toString().padStart(3, '0')}`;

    // Actualizar especie
    const genusEntry = speciesData.genera.find(g => g.language.name === 'en') ||
        speciesData.genera[0];
    speciesContainer.textContent = genusEntry ? genusEntry.genus : "Unknown species";

    // Actualizar imagen
    updatePokemonImage();

    // Actualizar tipos
    typeBadges.innerHTML = '';
    pokemonData.types.forEach(type => {
        const badge = document.createElement('div');
        badge.className = `type-badge ${type.type.name}`;
        badge.textContent = type.type.name;
        typeBadges.appendChild(badge);
    });

    // Actualizar peso y altura
    infoValueHeight.textContent = `${(pokemonData.height / 10).toFixed(1)} m`;
    infoValueWeight.textContent = `${(pokemonData.weight / 10).toFixed(1)} kg`;

    // Actualizar descripción
    const flavorTextEntries = speciesData.flavor_text_entries;
    const englishEntry = flavorTextEntries.find(entry => entry.language.name === 'en');
    description.textContent = englishEntry ?
        englishEntry.flavor_text.replace(/\f/g, ' ') :
        "Description not available";

    // Actualizar habilidades
    abilitiesContainer.innerHTML = '';

    // Crear promesas para obtener las descripciones de habilidades
    const abilityPromises = pokemonData.abilities.map(ability =>
        fetchAbilityDescription(ability.ability.url)
    );

    // Esperar a que todas las descripciones se carguen
    const abilityDescriptions = await Promise.all(abilityPromises);

    // Crear elementos de habilidad
    pokemonData.abilities.forEach((ability, index) => {
        const abilityDiv = document.createElement('div');
        abilityDiv.className = 'ability';

        const abilityHeader = document.createElement('div');
        abilityHeader.className = 'ability-header';

        const abilityName = document.createElement('div');
        abilityName.className = 'ability-name';
        abilityName.textContent = ability.ability.name.replace('-', ' ');

        abilityHeader.appendChild(abilityName);

        if (ability.is_hidden) {
            const hiddenTag = document.createElement('div');
            hiddenTag.className = 'hidden-tag';
            hiddenTag.textContent = 'HIDDEN';
            abilityHeader.appendChild(hiddenTag);
        }

        const abilityDesc = document.createElement('div');
        abilityDesc.className = 'ability-desc';
        abilityDesc.textContent = abilityDescriptions[index];

        abilityDiv.appendChild(abilityHeader);
        abilityDiv.appendChild(abilityDesc);
        abilitiesContainer.appendChild(abilityDiv);

        // Evento para expandir la descripción
        abilityDiv.addEventListener('click', function () {
            this.classList.toggle('active');
        });
    });

    // Actualizar estadísticas
    updateStats(pokemonData.stats);
}

function updatePokemonImage() {
    if (!currentPokemonData) return;

    const img = document.querySelector('.pokemon-image');
    if (!img) {
        // Si la imagen no existe, crearla
        const newImg = document.createElement('img');
        newImg.className = 'pokemon-image';
        newImg.alt = currentPokemonData.name;

        // Agregar evento para alternar shiny al hacer clic en la imagen
        newImg.addEventListener('click', () => {
            isShiny = !isShiny;
            updatePokemonImage();
        });

        imageContainer.appendChild(newImg);
    }

    const currentImg = document.querySelector('.pokemon-image');

    if (isShiny) {
        currentImg.src = currentPokemonData.sprites.other['official-artwork'].front_shiny ||
            currentPokemonData.sprites.front_shiny;
        // Actualizar indicadores visuales
        imageContainer.classList.add('shiny-active');
        shinyToggle.classList.add('active');
        shinyIndicator.style.display = 'block';
    } else {
        currentImg.src = currentPokemonData.sprites.other['official-artwork'].front_default ||
            currentPokemonData.sprites.front_default;
        // Quitar indicadores visuales
        imageContainer.classList.remove('shiny-active');
        shinyToggle.classList.remove('active');
        shinyIndicator.style.display = 'none';
    }
}

function updateStats(stats) {
    statsContainer.innerHTML = '';

    // Crear columnas
    const leftColumn = document.createElement('div');
    leftColumn.className = 'stat-column';
    statsContainer.appendChild(leftColumn);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'stat-column';
    statsContainer.appendChild(rightColumn);

    // Función para crear fila de estadística
    function createStatRow(statName, baseStat, barClass) {
        const statRow = document.createElement('div');
        statRow.className = 'stat-row';

        const statNameDiv = document.createElement('div');
        statNameDiv.className = 'stat-name';
        statNameDiv.textContent = statName;

        const barContainer = document.createElement('div');
        barContainer.className = 'stat-bar-container';

        const bar = document.createElement('div');
        bar.className = `stat-bar ${barClass}`;
        // Calcular el ancho (máximo 255 es el valor más alto en Pokémon)
        const widthPercent = Math.min(100, (baseStat / 255) * 100);
        bar.style.width = `${widthPercent}%`;

        barContainer.appendChild(bar);

        const statValue = document.createElement('div');
        statValue.className = 'stat-value';
        statValue.textContent = baseStat;

        statRow.appendChild(statNameDiv);
        statRow.appendChild(barContainer);
        statRow.appendChild(statValue);

        return statRow;
    }

    // Añadir estadísticas a las columnas
    leftColumn.appendChild(createStatRow('HP', stats[0].base_stat, 'hp-bar'));
    leftColumn.appendChild(createStatRow('Attack', stats[1].base_stat, 'attack-bar'));
    leftColumn.appendChild(createStatRow('Defense', stats[2].base_stat, 'defense-bar'));

    rightColumn.appendChild(createStatRow('Sp. Atk', stats[3].base_stat, 'special-attack-bar'));
    rightColumn.appendChild(createStatRow('Sp. Def', stats[4].base_stat, 'special-defense-bar'));
    rightColumn.appendChild(createStatRow('Speed', stats[5].base_stat, 'speed-bar'));
}

// Actualizar la cuadrícula de Pokémon
async function updatePokemonGrid(regionName) {
    // Obtener lista de Pokémon para la región
    allPokemon = await fetchPokemonListForRegion(regionName);

    // Limpiar cuadrícula
    pokemonGrid.innerHTML = '';

    // Añadir Pokémon a la cuadrícula
    allPokemon.forEach(pokemon => {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        if (pokemon.id === currentPokemonId) {
            card.classList.add('selected');
        }

        const cardId = document.createElement('div');
        cardId.className = 'card-id';
        cardId.textContent = `#${pokemon.id.toString().padStart(3, '0')}`;

        const cardImage = document.createElement('div');
        cardImage.className = 'card-image';

        const img = document.createElement('img');
        img.src = pokemon.sprites.other['official-artwork'].front_default ||
            pokemon.sprites.front_default;
        img.alt = pokemon.name;

        cardImage.appendChild(img);

        const cardName = document.createElement('div');
        cardName.className = 'card-name';
        cardName.textContent = pokemon.name;

        card.appendChild(cardId);
        card.appendChild(cardImage);
        card.appendChild(cardName);

        // Evento para seleccionar Pokémon
        card.addEventListener('click', () => {
            currentPokemonId = pokemon.id;
            isShiny = false; // Reset shiny al cambiar Pokémon
            updatePokemonDetails(currentPokemonId);

            // Actualizar selección en la cuadrícula
            document.querySelectorAll('.pokemon-card').forEach(c => {
                c.classList.remove('selected');
            });
            card.classList.add('selected');
        });

        pokemonGrid.appendChild(card);
    });
}

// Inicializar la aplicación
async function initApp() {
    // Cargar Pokémon inicial
    await updatePokemonDetails(currentPokemonId);

    // Cargar cuadrícula inicial
    await updatePokemonGrid(currentRegion);

    // Evento para cambio de región
    regionSelector.addEventListener('change', function () {
        currentRegion = this.value;
        updatePokemonGrid(currentRegion);
    });

    // Evento para búsqueda
    searchBox.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        const cards = document.querySelectorAll('.pokemon-card');

        cards.forEach(card => {
            const name = card.querySelector('.card-name').textContent.toLowerCase();
            const id = card.querySelector('.card-id').textContent.toLowerCase();

            if (name.includes(searchTerm) || id.includes(searchTerm)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // Evento para botón de búsqueda
    searchButton.addEventListener('click', async function () {
        const searchTerm = searchBox.value.trim().toLowerCase();

        if (!searchTerm) return;

        // Buscar por ID o nombre
        let pokemonId = parseInt(searchTerm);
        if (isNaN(pokemonId)) {
            // Búsqueda por nombre
            try {
                const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${searchTerm}`);
                if (!response.ok) throw new Error('Pokémon not found');
                const data = await response.json();
                pokemonId = data.id;
            } catch (error) {
                alert('Pokémon not found');
                return;
            }
        }

        // Verificar si el ID está en el rango válido (1-1010)
        if (pokemonId < 1 || pokemonId > 1010) {
            alert('Invalid Pokémon ID. Must be between 1 and 1010');
            return;
        }

        // Actualizar detalles del Pokémon
        currentPokemonId = pokemonId;
        isShiny = false;
        await updatePokemonDetails(currentPokemonId);

        // Deseleccionar todos los Pokémon en la cuadrícula
        document.querySelectorAll('.pokemon-card').forEach(c => {
            c.classList.remove('selected');
        });
    });

    // Evento para el botón shiny
    shinyToggle.addEventListener('click', function () {
        isShiny = !isShiny;
        updatePokemonImage();
    });

    // Simular carga inicial
    window.addEventListener('load', () => {
        setTimeout(() => {
            document.querySelectorAll('.fade-in').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        }, 300);
    });
}

async function playPokemonSound() {
    try {
        // Obtener datos del Pokémon
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${currentPokemonId}`);
        if (!response.ok) {
            throw new Error(`Pokémon no encontrado: ${pokemonId}`);
        }
        const data = await response.json();

        // Usar siempre el sonido 'latest'
        const soundUrl = data.cries?.latest;
        if (!soundUrl) {
            throw new Error("Sonido 'latest' no disponible para este Pokémon");
        }

        // Reproducir el sonido
        const audio = new Audio(soundUrl);
        audio.volume = 0.1;
        audio.play();

        return {
            success: true,
            message: `Reproduciendo sonido de ${data.name}`
        };
    } catch (error) {
        console.error("Error:", error.message);
        return {
            success: false,
            message: error.message
        };
    }
}

// Iniciar la aplicación
initApp();

