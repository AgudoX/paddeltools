# 🏓 Paddle Tournament App

A modern, responsive Angular application for organizing American-style paddle tournaments with intelligent match generation and player management.

## ✨ Features

### 🎯 Core Functionality
- **Automatic Match Generation**: Smart algorithm to create balanced matches
- **Two Pairing Modes**:
  - **Free Mode**: Full rotation - players avoid repeating partners when possible
  - **Fixed Pairs**: Keep specific pairs together throughout the tournament
- **Player Management**: Configure player names, positions (Right/Left/Any), and pair assignments
- **Flexible Configuration**: Support for any number of players (multiple of 4, minimum 8)

### 📊 Advanced Features
- **Score Tracking**: Record match scores for each game
- **Live Rankings**: Automatic calculation of player statistics including:
  - Matches played and won
  - Points for and against
  - Goal difference
  - Ranking with medals for top 3 players
- **Data Persistence**: Automatic save to localStorage
- **Share & Export**:
  - Copy tournament summary to clipboard
  - Share directly via WhatsApp
  - Export as text file

### 💎 Design
- **Fully Responsive**: Optimized for mobile, tablet, and desktop
- **Modern UI**: Clean, gradient-based design with smooth animations
- **Custom Colors**: Purple/violet theme (#6320EE) for standout elements
- **Intuitive UX**: Clear navigation and visual feedback

## 🚀 Getting Started

### Prerequisites
- Node.js v18.13 or higher
- Angular CLI 17.0.3 or higher

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd paddletools
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:4200/`

## 📖 How to Use

### 1. Configure Your Tournament

**Basic Configuration:**
- Set the number of players (must be a multiple of 4, minimum 8)
- Set the number of matches to play
- Choose pairing mode (Free or Fixed Pairs)

**Player Setup:**
- Enter player names
- Select position preference (Right/Left/Any)
- If using Fixed Pairs mode, assign pair numbers to players

### 2. Generate Tournament

Click "⚡ Generate Tournament" to create the match schedule. The algorithm will:
- Ensure all players play approximately the same number of matches
- Minimize partner repetition in Free Mode
- Keep fixed pairs together and vary their opponents

### 3. Manage Matches

**View Matches:**
- See all generated matches with player pairings
- Players are displayed with their position preferences

**Record Scores:**
- Click "✏️ Score" on any match
- Enter scores for both pairs
- Save to update rankings automatically

### 4. Track Rankings

Click "📊 Show Rankings" to see:
- Current standings
- Win/loss records
- Goal differences
- Top 3 players with medals 🥇🥈🥉

### 5. Share Results

- **📋 Copy Summary**: Copy formatted tournament details to clipboard
- **💬 Share on WhatsApp**: Open WhatsApp with pre-filled tournament summary
- **📥 Export as Text**: Download tournament details as a .txt file

## 🏗️ Architecture

### Project Structure

```
src/app/
├── components/
│   ├── formulario/          # Main form component
│   │   ├── formulario.component.ts
│   │   ├── formulario.component.html
│   │   └── formulario.component.scss
│   └── resumen/             # Summary/results component
│       ├── resumen.component.ts
│       ├── resumen.component.html
│       └── resumen.component.scss
├── models/
│   └── jugador.model.ts     # TypeScript interfaces
├── services/
│   └── americano.service.ts # Tournament logic service
├── app.component.*          # Root component
├── app.config.ts            # App configuration
└── app.routes.ts            # Routing configuration
```

### Key Components

**FormularioComponent**
- Handles tournament configuration
- Manages player input
- Validates data before generation
- Persists configuration to localStorage

**ResumenComponent**
- Displays match schedule
- Manages score input
- Calculates and displays rankings
- Handles sharing and export

**AmericanoService**
- Core tournament generation algorithm
- Match pairing logic (free and fixed modes)
- Statistics calculation
- localStorage management

### Match Generation Algorithm

**Free Mode:**
1. Tracks previous partnerships for each player
2. Selects 4 players with fewest matches played
3. Tries multiple pairing combinations
4. Chooses combination with least partner repetition
5. Ensures balanced match distribution

**Fixed Pairs Mode:**
1. Groups players by assigned pair IDs
2. Creates stable pairs from assignments
3. Tracks pair matchups
4. Rotates pairs to minimize repeat opponents
5. Ensures all pairs play similar number of matches

## 🎨 Customization

### Colors

The app uses a custom color scheme defined in `src/styles.scss`:

```scss
--primary-color: #6320ee;      // Main purple
--secondary-color: #764ba2;    // Secondary purple
--success-color: #28a745;      // Green for success
--danger-color: #dc3545;       // Red for errors
```

### Responsive Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## 🔧 Development

### Build for Production

```bash
npm run build
```

Build artifacts will be stored in the `dist/` directory.

### Run Tests

```bash
npm test
```

### Code Scaffolding

Generate new components:
```bash
ng generate component component-name
```

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [Angular](https://angular.io/)
- Icons from emoji set
- Gradient inspiration from modern UI trends

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Made with ❤️ for the paddle community**
