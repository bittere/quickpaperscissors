import { useState, useEffect, useRef } from 'react';
import type { Peer } from 'peerjs';
import type { DataConnection } from 'peerjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeProvider } from './components/theme-provider';
import { ModeToggle } from './components/mode-toggle';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import { GameChoiceButton } from '@/components/game-choice-button';
import { motion } from 'framer-motion';
import { GameResultDisplay } from '@/components/game-result-display';

type GameState = 'initial' | 'creating' | 'connecting' | 'connected' | 'countdown' | 'playing' | 'result';
type Choice = 'rock' | 'paper' | 'scissors';
type PeerStatus = 'online' | 'unstable' | 'offline';

const emojis = ['🏆', '🎉', '✨', '🥳', '🎊'];

const EmojiBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 15 }).map((_, index) => (
        <span
          key={index}
          className="absolute animate-float-up text-4xl"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${Math.random() * 3 + 4}s`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          {emojis[Math.floor(Math.random() * emojis.length)]}
        </span>
      ))}
    </div>
  );
};

function App() {
  const [gameState, setGameState] = useState<GameState>('initial');
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [remoteChoice, setRemoteChoice] = useState<Choice | null>(null);
  const [winner, setWinner] = useState<'You' | 'Opponent' | 'Tie' | null>(null);
  const [timer, setTimer] = useState(3);
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState('');
  const [peerStatus, setPeerStatus] = useState<PeerStatus>('offline');
  const [isResetValidating, setIsResetValidating] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const unstableTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const offlineTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performLocalReset = () => {
    setChoice(null);
    setRemoteChoice(null);
    setWinner(null);
    setTimer(3);
    setGameState('connected');
  };

  useEffect(() => {
    const initPeer = async () => {
      if (peerRef.current) return;
      const { default: Peer } = await import('peerjs');
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id) => {
        setPeerId(id);
      });

      peer.on('connection', (conn) => {
        if (connRef.current && connRef.current.open) {
          console.log('Blocking third peer connection.');
          conn.close();
          return;
        }
        connRef.current = conn;
        setIsConnected(true);
        setPeerStatus('online');
        setGameState('connected');
        setDisconnectMessage('');

        conn.on('data', (data: any) => {
          if (data.type === 'choice') {
            setRemoteChoice(data.choice);
          } else if (data.type === 'reset-ping') {
            // Opponent clicked 'Play Again'. Respond and reset locally.
            conn.send({ type: 'reset-pong' });
            performLocalReset();
          } else if (data.type === 'reset-pong') {
            // Received response to our 'Play Again' ping. Reset locally.
            if (resetValidationTimeoutRef.current) clearTimeout(resetValidationTimeoutRef.current);
            setIsResetValidating(false);
            performLocalReset();
          } else if (data.type === 'ping') {
            conn.send({ type: 'pong' });
          } else if (data.type === 'pong') {
            setPeerStatus('online');
            if (unstableTimeoutRef.current) clearTimeout(unstableTimeoutRef.current);
            if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
          }
        });

        conn.on('close', () => {
          console.log('Peer disconnected.');
          setIsConnected(false);
          setPeerStatus('offline');
          setDisconnectMessage('Opponent disconnected. Please create or join a new room.');
          setGameState('initial');
        });

        conn.on('error', (err) => {
          console.error('Connection error:', err);
          setIsConnected(false);
          setPeerStatus('offline');
          setDisconnectMessage('Connection error. Please create or join a new room.');
          setGameState('initial');
        });
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'peer-unavailable') {
          setDisconnectMessage('Peer ID not found or unavailable.');
        } else {
          setDisconnectMessage('Peer error. Please try again.');
        }
        setIsConnected(false);
        setPeerStatus('offline');
        setGameState('initial');
      });
    };

    initPeer();

    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    let pingInterval: NodeJS.Timeout | null = null;

    if (isConnected) {
      pingInterval = setInterval(() => {
        if (connRef.current) {
          connRef.current.send({ type: 'ping' });

          if (unstableTimeoutRef.current) clearTimeout(unstableTimeoutRef.current);
          unstableTimeoutRef.current = setTimeout(() => {
            setPeerStatus('unstable');
          }, 2000);

          if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
          offlineTimeoutRef.current = setTimeout(() => {
            setPeerStatus('offline');
            setIsConnected(false);
            setDisconnectMessage('Peer timed out. Please create or join a new room.');
            setGameState('initial');
            connRef.current?.close();
          }, 10000);
        }
      }, 5000);
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (unstableTimeoutRef.current) clearTimeout(unstableTimeoutRef.current);
      if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
    };
  }, [isConnected]);

  useEffect(() => {
    if (gameState === 'countdown') {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev === 1) {
            clearInterval(interval);
            setGameState('playing');
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  useEffect(() => {
    if (choice && remoteChoice) {
      const getWinner = () => {
        if (choice === remoteChoice) return 'Tie';
        if (
          (choice === 'rock' && remoteChoice === 'scissors') ||
          (choice === 'scissors' && remoteChoice === 'paper') ||
          (choice === 'paper' && remoteChoice === 'rock')
        ) {
          return 'You';
        }
        return 'Opponent';
      };
      const newWinner = getWinner();
      setWinner(newWinner);
      setGameState('result');
    }
  }, [choice, remoteChoice]);

  const createRoom = () => {
    setGameState('creating');
    setDisconnectMessage('');
  };

  const connectToPeer = () => {
    if (peerRef.current && remotePeerId) {
      const conn = peerRef.current.connect(remotePeerId);
      connRef.current = conn;
      setGameState('connecting');
      setDisconnectMessage('');

      conn.on('open', () => {
        setIsConnected(true);
        setPeerStatus('online');
        setGameState('connected');
        setDisconnectMessage('');
      });
      conn.on('data', (data: any) => {
        if (data.type === 'choice') {
          setRemoteChoice(data.choice);
        } else if (data.type === 'reset-ping') {
          // Opponent clicked 'Play Again'. Respond and reset locally.
          conn.send({ type: 'reset-pong' });
          performLocalReset();
        } else if (data.type === 'reset-pong') {
          // Received response to our 'Play Again' ping. Reset locally.
          if (resetValidationTimeoutRef.current) clearTimeout(resetValidationTimeoutRef.current);
          setIsResetValidating(false);
          performLocalReset();
        } else if (data.type === 'ping') {
          conn.send({ type: 'pong' });
        } else if (data.type === 'pong') {
          setPeerStatus('online');
          if (unstableTimeoutRef.current) clearTimeout(unstableTimeoutRef.current);
          if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
        }
      });
      conn.on('close', () => {
        console.log('Peer disconnected.');
        setIsConnected(false);
        setPeerStatus('offline');
        if (gameState === 'connecting') {
          setDisconnectMessage('Room is full or connection failed. Please try another ID.');
        } else {
          setDisconnectMessage('Opponent disconnected. Please create or join a new room.');
        }
        setGameState('initial');
      });
      conn.on('error', (err) => {
        console.error('Connection error:', err);
        setIsConnected(false);
        setPeerStatus('offline');
        setDisconnectMessage('Connection error. Please create or join a new room.');
        setGameState('initial');
      });
    }
  };

  const sendChoice = (myChoice: Choice) => {
    setChoice(myChoice);
    if (connRef.current) {
      connRef.current.send({ type: 'choice', choice: myChoice });
    }
    setGameState('playing');
  };

  const resetGame = () => {
    if (!connRef.current) return;

    // Send a reset-ping to check if the opponent is still connected
    connRef.current.send({ type: 'reset-ping' });
    setIsResetValidating(true);

    // Set a timeout. If no pong is received, the peer is considered disconnected.
    if (resetValidationTimeoutRef.current) clearTimeout(resetValidationTimeoutRef.current);
    resetValidationTimeoutRef.current = setTimeout(() => {
      setIsResetValidating(false);
      setPeerStatus('offline');
      setDisconnectMessage('Opponent failed to respond to "Play Again" ping. Connection lost.');
      setGameState('initial');
      connRef.current?.close();
    }, 2000);
  };

  const startCountdown = () => {
    setGameState('countdown');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {winner === 'You' && <EmojiBackground />}
      <div className="bg-background text-foreground min-h-screen flex flex-col items-center justify-center font-sans relative">
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <div className="flex items-center divide-x divide-border rounded-full border bg-muted/50 text-sm text-muted-foreground backdrop-blur-sm">
            <div className="flex items-center gap-2 px-3 py-1">
              <span>You</span>
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1">
              <span>Peer</span>
              {isConnected ? (
                peerStatus === 'online' ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
                ) : peerStatus === 'unstable' ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse"></div>
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                )
              ) : (
                <div className="h-2.5 w-2.5 rounded-full bg-neutral-500"></div>
              )}
            </div>
          </div>
        </div>
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>
        <div className="w-full max-w-md p-4 sm:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold">QuickPaperScissors</h1>
            <p className="text-muted-foreground">A simple Rock-Paper-Scissors game.</p>
          </div>

          {disconnectMessage && (
            <p className="text-red-500 text-center">{disconnectMessage}</p>
          )}

          {gameState === 'initial' && (
            <div className="flex flex-col space-y-4">
              <Button onClick={createRoom}>Create Room</Button>
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  value={remotePeerId}
                  onChange={(e) => setRemotePeerId(e.target.value)}
                  placeholder="Enter Peer ID"
                  className="flex-grow"
                />
                <Button onClick={connectToPeer}>Connect</Button>
              </div>
            </div>
          )}

          {gameState === 'creating' && (
            <div className="text-center space-y-6">
              <p className="text-xl font-semibold">Share your ID:</p>
              <div className="flex items-center justify-center space-x-2 p-4 bg-card rounded-xl border-2 border-dashed border-primary/50">
                <motion.span
                  key={peerId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl font-mono flex-grow text-center truncate"
                >
                  {peerId}
                </motion.span>
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 animate-fade-in" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-lg text-muted-foreground animate-pulse">
                Waiting for an opponent to connect...
              </p>
              <Button onClick={() => setGameState('initial')} variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel Room
              </Button>
            </div>
          )}

          {gameState === 'connecting' && <p className="text-center">Connecting...</p>}

          {gameState === 'connected' && isConnected && (
            <div className="text-center">
              <p className="text-green-500">Connected!</p>
              <Button onClick={startCountdown} className="mt-4" disabled={!isConnected || peerStatus !== 'online'}>Start Game</Button>
            </div>
          )}

          {gameState === 'countdown' && (
            <div className="text-center">
              <motion.p
                key={timer}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="text-8xl font-black"
              >
                {timer}
              </motion.p>
            </div>
          )}

          {gameState === 'playing' && !choice && (
            <div className="flex justify-center space-x-4">
              <GameChoiceButton choice="rock" onChoiceSelect={sendChoice} />
              <GameChoiceButton choice="paper" onChoiceSelect={sendChoice} />
              <GameChoiceButton choice="scissors" onChoiceSelect={sendChoice} />
            </div>
          )}

          {gameState === 'playing' && choice && !remoteChoice && (
            <p className="text-center animate-fade-in">Waiting for opponent...</p>
          )}

          {gameState === 'result' && choice && remoteChoice && (
            <GameResultDisplay myChoice={choice} remoteChoice={remoteChoice} winner={winner} onReset={resetGame} isResetValidating={isResetValidating} />
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
