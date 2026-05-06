# Guess Who vs LLM

A web-based version of the classic "Guess Who" game where you play against an OpenAI-powered LLM.

## Features

- **LLM Opponent**: Play against a strategic AI that picks a character and tries to guess yours.
- **Dynamic Board**: Interactive character grid where you can eliminate characters as you narrow them down.
- **Real-time Chat**: Ask the AI questions in natural language.
- **Strategic Thinking**: The AI uses GPT-4o-mini to analyze your answers and pick the best questions.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run the App**:
   ```bash
   npm run dev
   ```

3. **Configure API Key**:
   When you first open the app, you'll be prompted to enter your OpenAI API key. This key is stored locally in your browser and is only used to communicate with OpenAI's API.

## How to Play

1. Choose your secret character from the grid.
2. The AI will also pick a secret character.
3. On your turn, ask a "Yes/No" question (e.g., "Does your character have red hair?") or make a guess ("Are you David?").
4. Click on characters on your board to flip them down (eliminate them).
5. On the AI's turn, it will ask you a question. Answer "Yes" or "No".
6. The first to correctly guess the other's character wins!

## Tech Stack

- React (Vite)
- Tailwind CSS
- OpenAI SDK
- Lucide React (Icons)
