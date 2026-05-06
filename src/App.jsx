import React, { useState, useEffect, useMemo, useRef } from 'react';
import { characters } from './characters';
import OpenAI from 'openai';
import { User, Bot, Send, RefreshCw, CheckCircle2, XCircle, Info, Key } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import GameBoard3D from './components/GameBoard3D';
import characterImages from './assets/characters.png';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const CharacterPortrait = ({ row, col, size = 'md', eliminated = false, className }) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div 
      className={cn(
        sizeClasses[size],
        "rounded-xl overflow-hidden border-2 border-slate-700 bg-white",
        eliminated && "grayscale",
        className
      )}
      style={{
        backgroundImage: `url(${characterImages})`,
        backgroundSize: '900% 600%',
        backgroundPosition: `${col * 18.75 + 3.125}% ${row * 30 + 5}%`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated'
      }}
    />
  );
};

const App = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [playerSecretChar, setPlayerSecretChar] = useState(null);
  const [aiSecretChar, setAiSecretChar] = useState(null);
  const [playerBoard, setPlayerBoard] = useState(characters.map(c => ({ ...c, eliminated: false })));
  const [aiEliminatedIds, setAiEliminatedIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [turn, setTurn] = useState('player'); // 'player' or 'ai'
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showKeyInput, setShowKeyInput] = useState(!apiKey);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (turn === 'ai' && !winner && !isLoading) {
      const timer = setTimeout(() => {
        handleAiTurn();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, isLoading]);

  const openai = useMemo(() => {
    if (!apiKey) return null;
    return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }, [apiKey]);

  const saveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('openai_api_key', apiKey);
    setShowKeyInput(false);
  };

  const startGame = (char) => {
    setPlayerSecretChar(char);
    const randomAiChar = characters[Math.floor(Math.random() * characters.length)];
    setAiSecretChar(randomAiChar);
    setPlayerBoard(characters.map(c => ({ ...c, eliminated: false })));
    setAiEliminatedIds([]);
    setMessages([{
      role: 'system',
      content: "Welcome to Guess Who! I've picked my character. It's your turn to ask a question or make a guess."
    }]);
    setIsGameStarted(true);
    setTurn('player');
    setWinner(null);
  };

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const handlePlayerAction = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || winner) return;

    const playerQuestion = input.trim();
    setInput('');
    addMessage('player', playerQuestion);
    setIsLoading(true);

    try {
      // Check if it's a guess
      const isGuess = playerQuestion.toLowerCase().includes('are you') || 
                      playerQuestion.toLowerCase().includes('is it');
      
      const prompt = `
        We are playing Guess Who. 
        My secret character is: ${JSON.stringify(aiSecretChar)}.
        The player asked: "${playerQuestion}"
        
        Rules:
        1. If the player is guessing a name (e.g., "Are you Alex?"), and they are right, say "YES_WIN".
        2. If they are guessing a name and are wrong, say "NO_WRONG_GUESS".
        3. For trait questions:
           - Answer accurately based ONLY on my secret character's traits: ${JSON.stringify(aiSecretChar)}
        4. Provide a brief, natural response.
            - The answer should only be Yes/No or YES_WIN/NO_WRONG_GUESS.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful and accurate opponent in a game of Guess Who. You never lie about your traits." }, 
          { role: "user", content: prompt }
        ],
      });

      const aiResponse = response.choices[0].message.content;

      if (aiResponse.includes('YES_WIN')) {
        addMessage('ai', `Yes! I am ${aiSecretChar.name}. You win!`);
        setWinner('player');
      } else if (aiResponse.includes('NO_WRONG_GUESS')) {
        addMessage('ai', `No, I am not that person. My turn!`);
        setTurn('ai');
      } else {
        addMessage('ai', aiResponse);
        setTurn('ai');
      }
    } catch (error) {
      console.error(error);
      addMessage('system', "Error: Failed to get response from AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiTurn = async () => {
    if (winner) return;
    setTurn('ai');
    setIsLoading(true);

    try {
      const remainingChars = characters.filter(c => !aiEliminatedIds.includes(c.id));
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'player' ? 'Player' : 'AI'}: ${m.content}`)
        .join('\n');
      
      const prompt = `
        We are playing Guess Who. 
        I need to ask a question to find the player's secret character.
        
        Possible characters remaining (with their traits): 
        ${JSON.stringify(remainingChars)}
        
        Available Traits in Data:
        - gender: Male, Female
        - hair: Black, Bald, Blonde, Brown, White, Ginger, Red, Grey
        - eyes: Brown, Blue
        - glasses: true/false
        - hat: true/false
        - facialHair: None, Mustache, Beard
        
        Conversation history so far:
        ${conversationHistory}
        
        My goal is to eliminate as many characters as possible.
        
        Rules for choosing a question:
        1. ONLY ask about the traits listed above or a specific name guess.
        2. DO NOT ask a question that has already been asked.
        3. DO NOT ask about a trait if you already know the answer from previous turns.
        4. DO NOT ask a question that won't eliminate any characters. Check the "Possible characters remaining" list carefully. If everyone has a trait, don't ask about it.
        5. Choose a trait that about half of the remaining characters have (e.g., if 10 remain, find a trait that 5 have).
        6. If only 1 or 2 characters remain, make a name guess (e.g., "Are you Alex?").
        
        Output format: Just the question text.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: "You are a strategic Guess Who player. You analyze traits carefully to narrow down the possibilities." }, { role: "user", content: prompt }],
      });

      const aiQuestion = response.choices[0].message.content;
      addMessage('ai', aiQuestion);
      setTurn('player_answering');
    } catch (error) {
      console.error(error);
      addMessage('system', "Error: Failed to get AI question.");
      setTurn('player');
    } finally {
      setIsLoading(false);
    }
  };

  const answerAi = async (answer) => {
    if (turn !== 'player_answering') return;
    
    addMessage('player', answer);
    setIsLoading(true);

    try {
      const lastAiQuestion = [...messages].reverse().find(m => m.role === 'ai')?.content;
      const remainingChars = characters.filter(c => !aiEliminatedIds.includes(c.id));

      const prompt = `
        We are playing Guess Who.
        The AI asked: "${lastAiQuestion}"
        The player answered: "${answer}"
        
        Identify which characters from the list below should be ELIMINATED based on this answer.
        
        Trait Mapping Guide:
        - "glasses" -> glasses (true/false)
        - "hat" -> hat (true/false)
        - "facial hair", "mustache", "beard" -> facialHair
        - "hair color" -> hair
        - "eye color" -> eyes
        - "gender", "man", "woman" -> gender
        
        Elimination Rules:
        - If the answer is "Yes", eliminate all characters that DO NOT match the trait(s) in the question.
        - If the answer is "No", eliminate all characters that DO match the trait(s) in the question.
        - If the question was a name guess (e.g. "Are you Alex?") and the answer is "Yes", respond with ONLY "AI_WIN".
        - If the question was a name guess and the answer is "No", eliminate ONLY that specific character.
        
        Characters to filter: ${JSON.stringify(remainingChars)}
        
        Output format: Return a JSON array of IDs for the characters to be ELIMINATED. 
        If no characters should be eliminated (e.g. invalid question), return an empty array [].
        Example: [3, 15, 22] or AI_WIN
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: "You are a game logic processor." }, { role: "user", content: prompt }],
      });

      const result = response.choices[0].message.content;

      if (result.includes('AI_WIN')) {
        addMessage('ai', `I knew it! I win!`);
        setWinner('ai');
      } else {
        try {
          const match = result.match(/\[.*\]/);
          const eliminatedIds = match ? JSON.parse(match[0]) : [];
          
          if (eliminatedIds.length > 0) {
            setAiEliminatedIds(prev => [...new Set([...prev, ...eliminatedIds])]);
            addMessage('system', `AI eliminated ${eliminatedIds.length} characters.`);
          } else {
            addMessage('system', `AI eliminated 0 characters.`);
          }
          setTurn('player');
        } catch (e) {
          console.error("Failed to parse AI elimination", e);
          addMessage('system', "Error: AI failed to process elimination logic.");
          setTurn('player');
        }
      }
    } catch (error) {
      console.error(error);
      addMessage('system', "Error processing AI logic.");
      setTurn('player');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEliminate = (id) => {
    setPlayerBoard(prev => prev.map(c => c.id === id ? { ...c, eliminated: !c.eliminated } : c));
  };

  if (showKeyInput) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <form onSubmit={saveApiKey} className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <Key className="text-blue-400" size={32} />
            <h1 className="text-2xl font-bold">OpenAI API Key</h1>
          </div>
          <p className="text-slate-400 mb-6">To play against the LLM, please provide an OpenAI API key. It will be stored locally in your browser.</p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
            Save and Continue
          </button>
        </form>
      </div>
    );
  }

  if (!isGameStarted) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-black tracking-tight text-blue-400">GUESS WHO vs LLM</h1>
            <button onClick={() => setShowKeyInput(true)} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
              <Key size={18} /> Edit API Key
            </button>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <User className="text-green-400" /> Choose Your Secret Character
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {characters.map(char => (
                <button
                  key={char.id}
                  onClick={() => startGame(char)}
                  className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg border-2 border-transparent hover:border-blue-500 transition-all text-center group"
                >
                  <CharacterPortrait 
                    row={char.row} 
                    col={char.col} 
                    size="lg" 
                    className="mx-auto mb-2 group-hover:scale-110 transition-transform" 
                  />
                  <div className="font-bold">{char.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-800/90 backdrop-blur border-b border-slate-700 p-3 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-blue-400">GUESS WHO 3D</h1>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Your character:</span>
            <CharacterPortrait row={playerSecretChar.row} col={playerSecretChar.col} size="sm" className="inline-block" />
            <span className="font-bold text-green-400">{playerSecretChar.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {winner && (
            <div className={cn(
              "px-4 py-1 rounded-full font-bold animate-bounce text-sm",
              winner === 'player' ? "bg-green-600" : "bg-red-600"
            )}>
              {winner === 'player' ? '🎉 YOU WIN!' : '🤖 AI WINS!'}
            </div>
          )}
          <button
            onClick={() => setIsGameStarted(false)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg transition-colors text-sm"
          >
            <RefreshCw size={15} /> New Game
          </button>
        </div>
      </header>

      {/* Main: 3D canvas fills left, chat panel overlaid right */}
      <main className="flex-1 relative overflow-hidden">
        {/* 3D game board */}
        <div className="absolute inset-0">
          <GameBoard3D
            characters={characters}
            playerBoard={playerBoard}
            secretCharId={playerSecretChar.id}
            onToggleEliminate={toggleEliminate}
          />
        </div>

        {/* Chat & controls panel — overlaid on the right */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-slate-800/90 backdrop-blur-md border-l border-slate-700/80 flex flex-col z-10">
          {/* Turn indicator */}
          <div className={cn(
            "p-3 text-center text-xs font-bold uppercase tracking-widest shrink-0",
            turn === 'player' ? "bg-blue-600/20 text-blue-400" :
            turn === 'ai' ? "bg-purple-600/20 text-purple-400" : "bg-green-600/20 text-green-400"
          )}>
            {winner ? "Game Over" :
             turn === 'player' ? "Your Turn — Ask a Question" :
             turn === 'ai' ? "AI is Thinking..." : "Answer the AI's Question"}
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn(
                "flex flex-col",
                msg.role === 'player' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "max-w-[85%] p-3 rounded-2xl text-sm shadow-md",
                  msg.role === 'player' ? "bg-blue-600 rounded-tr-none" :
                  msg.role === 'ai' ? "bg-slate-700 rounded-tl-none" :
                  "bg-slate-900/50 italic text-slate-400 text-center w-full text-xs"
                )}>
                  {msg.content}
                </div>
                {msg.role !== 'system' && (
                  <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold flex items-center gap-1">
                    {msg.role === 'player' ? <><User size={10} /> You</> : <><Bot size={10} /> AI</>}
                  </span>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-500" />
                AI is processing...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Controls */}
          <div className="p-4 border-t border-slate-700 shrink-0">
            {turn === 'player' && !winner ? (
              <form onSubmit={handlePlayerAction} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Do you have glasses?"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </form>
            ) : turn === 'player_answering' && !winner ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => answerAi("Yes")}
                  className="bg-green-600 hover:bg-green-700 py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle2 size={16} /> Yes
                </button>
                <button
                  onClick={() => answerAi("No")}
                  className="bg-red-600 hover:bg-red-700 py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm"
                >
                  <XCircle size={16} /> No
                </button>
              </div>
            ) : winner ? (
              <button
                onClick={() => setIsGameStarted(false)}
                className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-bold transition-colors text-sm"
              >
                Play Again
              </button>
            ) : (
              <div className="text-center text-slate-500 text-sm animate-pulse">
                AI is taking its turn...
              </div>
            )}

            <div className="mt-3 flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
              <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 leading-snug">
                Click a card to flip it. Drag to orbit the board. Scroll to zoom.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
