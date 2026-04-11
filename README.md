# Hex Empires

A Civilization VII-inspired turn-based strategy game built with TypeScript, React, and Canvas.

## Features

### Core Gameplay
- **Hex-based map** with procedural generation and diverse terrain types
- **City founding and management** - Found cities, manage production, grow population
- **Tile development** - Build improvements (farms, mines, pastures, plantations, quarries, camps, roads) with builder units
- **Technology tree** - Research technologies across three ages (Antiquity → Exploration → Modern)
- **Civic policy tree** - Enact policies to unlock new abilities and bonuses
- **Turn-based combat** - Tactical warfare with melee and ranged units
- **Diplomacy** - Trade, form alliances, declare war with other civilizations
- **Age transitions** - Choose new civilizations when transitioning ages, carry forward legacy bonuses

### Civ VII Mechanics
- **Leader-civilization separation** - Leaders persist across ages, civilizations change
- **Legacy bonuses** - Keep benefits from previous ages throughout the game
- **Town specializations** - Specialize settlements (farming, mining, trade, growing, fort)
- **Crisis events** - Random events with meaningful choices and consequences
- **Victory conditions** - Multiple paths to victory (domination, science, culture, score)
- **Tile improvements** - Develop territory with builders for strategic bonuses

### Smart AI
The AI provides a challenging opponent with:
- **Strategic tile development** - Builds improvements based on terrain features and resources
- **Town specialization** - Chooses optimal specializations for each settlement
- **Smart research** - Prioritizes technologies based on military needs and economic opportunities
- **Military production** - Expands forces when needed, defends cities
- **Exploration** - Scouts map the territory and find strategic locations

### User Experience
- **Intuitive controls** - Click to move/attack, Space to cycle units, WASD/arrows to pan
- **Visual feedback** - Unit movement animations, combat effects, city growth celebrations
- **Comprehensive UI** - Turn summary, tech tree, civic tree, diplomacy panel, city management
- **Help system** - Quick start guide and tooltips for new players
- **Non-blocking notifications** - Stay informed without interrupting gameplay

## Development

### Tech Stack
- **Engine**: Pure TypeScript with zero dependencies
- **Web**: React 19, Vite, Tailwind CSS v4
- **Rendering**: HTML5 Canvas with 60fps game loop
- **Testing**: Vitest with 527 tests passing

### Architecture
- **Data-driven content** - All civilizations, units, buildings, techs defined as data
- **Pure functional systems** - Game logic is composable pure functions
- **Engine/renderer separation** - Easy to swap Canvas for other rendering engines
- **Type-safe** - Strict TypeScript with comprehensive type definitions

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
# Start all packages
npm run dev:all

# Start web only (port 5174)
npm run dev:web

# Run tests
npm test

# Build
npm run build
```

### Quick Start Guide
See [QUICK_START.md](packages/web/public/QUICK_START.md) for a comprehensive guide on how to play.

## Progress

The game is fully playable with:
- ✅ Complete tile improvement system
- ✅ Smart AI with builders, town specialization, and strategic research
- ✅ Three age progression with age transitions
- ✅ Technology and civic trees
- ✅ Diplomacy and trade systems
- ✅ Crisis events and victory conditions
- ✅ Comprehensive UI panels
- ✅ 527 tests passing

## License

MIT
