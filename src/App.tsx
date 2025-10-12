import { useState, useEffect, useRef, useCallback } from 'react';
import type { Peer } from 'peerjs';
import type { DataConnection } from 'peerjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeProvider } from './components/theme-provider';
import { ModeToggle } from './components/mode-toggle';
import { Copy, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { GameChoiceButton } from '@/components/game-choice-button';
import { motion } from 'framer-motion';
import { GameResultDisplay } from '@/components/game-result-display';
import { PeerStatusIndicator } from './components/peer-status-indicator';

type GameState = 'initial' | 'creating' | 'connecting' | 'connected' | 'countdown' | 'playing' | 'result';
type Choice = 'rock' | 'paper' | 'scissors';
type PeerStatus = 'online' | 'unstable' | 'offline';

type PeerData =
  | { type: 'choice'; choice: Choice }
  | { type: 'reset-ping' }
  | { type: 'reset-pong' }
  | { type: 'ping' }
  | { type: 'pong' };

const emojis = ['🏆', '🎉', '✨', '🥳', '🎊'];

const EmojiBackground = () => (
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

function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>('initial');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [remoteChoice, setRemoteChoice] = useState<Choice | null>(null);
  const [winner, setWinner] = useState<'You' | 'Opponent' | 'Tie' | null>(null);
  const [timer, setTimer] = useState(3);

  // PeerJS State
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [peerStatus, setPeerStatus] = useState<PeerStatus>('offline');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // UI State
  const [copied, setCopied] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState('');
  const [isResetValidating, setIsResetValidating] = useState(false);

  // Refs
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const reconnectAttemptRef = useRef(0);
  const unstableTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const offlineTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetGameState = useCallback(() => {
    setChoice(null);
    setRemoteChoice(null);
    setWinner(null);
    setTimer(3);
    setGameState('connected');
  }, []);

  const handleConnectionData = useCallback((conn: DataConnection, data: PeerData) => {
    switch (data.type) {
      case 'choice':
        setRemoteChoice(data.choice);
        break;
      case 'reset-ping':
        conn.send({ type: 'reset-pong' });
        resetGameState();
        break;
      case 'reset-pong':
        if (resetValidationTimeoutRef.current) clearTimeout(resetValidationTimeoutRef.current);
        setIsResetValidating(false);
        resetGameState();
        break;
      case 'ping':
        conn.send({ type: 'pong' });
        break;
      case 'pong':
        setPeerStatus('online');
        setIsReconnecting(false);
        reconnectAttemptRef.current = 0;
        if (unstableTimeoutRef.current) clearTimeout(unstableTimeoutRef.current);
        if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
        break;
    }
  }, [resetGameState]);

  const setupConnectionHandlers = useCallback((conn: DataConnection) => {
    conn.on('data', (data: unknown) => handleConnectionData(conn, data as PeerData));
    conn.on('open', () => {
      setIsConnected(true);
      setPeerStatus('online');
      setGameState('connected');
      setDisconnectMessage('');
      setIsConnecting(false);
      setIsReconnecting(false);
      reconnectAttemptRef.current = 0;
    });
    conn.on('close', () => {
      console.log('Peer disconnected.');
      setIsConnected(false);
      setPeerStatus('offline');
      if (gameState !== 'initial') {
        setDisconnectMessage('Opponent disconnected. Attempting to reconnect...');
        setIsReconnecting(true);
      }
    });
    conn.on('error', (err) => {
      console.error('Connection error:', err);
      setIsConnected(false);
      setPeerStatus('offline');
      setDisconnectMessage('Connection error. Please try again.');
      setGameState('initial');
    });
  }, [gameState, handleConnectionData]);

  const connectToPeer = useCallback((remoteId: string) => {
    if (peerRef.current && !connRef.current?.open) {
      setIsConnecting(true);
      setDisconnectMessage('');
      const conn = peerRef.current.connect(remoteId, { reliable: true });
      connRef.current = conn;
      setupConnectionHandlers(conn);
    }
  }, [setupConnectionHandlers]);

  useEffect(() => {
    const initPeer = async () => {
      if (peerRef.current) return;
      const { default: Peer } = await import('peerjs');
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', setPeerId);
      peer.on('connection', (conn) => {
        if (connRef.current?.open) {
          console.log('Blocking third peer connection.');
          conn.close();
          return;
        }
        connRef.current = conn;
        setupConnectionHandlers(conn);
      });
      peer.on('disconnected', () => {
        console.log('Peer disconnected from server. Attempting to reconnect...');
        peerRef.current?.reconnect();
      });
      peer.on('error', (err) => {
        console.error('Peer error:', err);
        setDisconnectMessage(err.type === 'peer-unavailable' ? 'Peer ID not found.' : 'An error occurred.');
        setIsConnecting(false);
      });
    };
    initPeer();
    return () => peerRef.current?.destroy();
  }, [setupConnectionHandlers]);

  useEffect(() => {
    if (isReconnecting && remotePeerId) {
      const maxRetries = 5;
      const attemptReconnect = () => {
        if (reconnectAttemptRef.current < maxRetries) {
          reconnectAttemptRef.current += 1;
          setDisconnectMessage(`Reconnecting... (Attempt ${reconnectAttemptRef.current})`);
          connectToPeer(remotePeerId);
          setTimeout(attemptReconnect, 2000 * reconnectAttemptRef.current);
        } else {
          setDisconnectMessage('Could not reconnect. Please start a new game.');
          setGameState('initial');
          setIsReconnecting(false);
        }
      };
      attemptReconnect();
    }
  }, [isReconnecting, remotePeerId, connectToPeer]);

  useEffect(() => {
    let pingInterval: NodeJS.Timeout | null = null;
    if (isConnected) {
      pingInterval = setInterval(() => {
        if (connRef.current) {
          connRef.current.send({ type: 'ping' });
          unstableTimeoutRef.current = setTimeout(() => setPeerStatus('unstable'), 2000);
          offlineTimeoutRef.current = setTimeout(() => {
            setPeerStatus('offline');
            setIsConnected(false);
            if (gameState !== 'initial') setIsReconnecting(true);
          }, 4000);
        }
      }, 5000);
    }
    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (unstableTimeoutRef.current) clearTimeout(unstableTimeoutRef.current);
      if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
    };
  }, [isConnected, gameState]);

  useEffect(() => {
    if (choice && remoteChoice) {
      const getWinner = () => {
        if (choice === remoteChoice) return 'Tie';
        if ((choice === 'rock' && remoteChoice === 'scissors') || (choice === 'scissors' && remoteChoice === 'paper') || (choice === 'paper' && remoteChoice === 'rock')) return 'You';
        return 'Opponent';
      };
      setWinner(getWinner());
      setGameState('result');
    }
  }, [choice, remoteChoice]);

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

  const createRoom = () => {
    setGameState('creating');
    setDisconnectMessage('');
  };

  const handleConnect = () => {
    if (remotePeerId) connectToPeer(remotePeerId);
  };

  const sendChoice = (myChoice: Choice) => {
    setChoice(myChoice);
    connRef.current?.send({ type: 'choice', choice: myChoice });
    setGameState('playing');
  };

  const resetGame = () => {
    if (!connRef.current) return;
    connRef.current.send({ type: 'reset-ping' });
    setIsResetValidating(true);
    resetValidationTimeoutRef.current = setTimeout(() => {
      setIsResetValidating(false);
      setPeerStatus('offline');
      setDisconnectMessage('Opponent failed to respond. Connection lost.');
      setIsReconnecting(true);
    }, 2000);
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
          <PeerStatusIndicator isConnected={isConnected} peerStatus={peerStatus} />
        </div>
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>
        <div className="w-full max-w-md p-4 sm:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold">QuickPaperScissors</h1>
            <p className="text-muted-foreground">A simple Rock-Paper-Scissors game.</p>
          </div>

          {disconnectMessage && <p className="text-red-500 text-center font-semibold">{disconnectMessage}</p>}
          {isReconnecting && <Loader2 className="mx-auto h-8 w-8 animate-spin" />}

          {gameState === 'initial' && !isReconnecting && (
            <div className="flex flex-col space-y-4">
              <Button onClick={createRoom}>Create Room</Button>
              <div className="flex items-center space-x-2">
                <Input type="text" value={remotePeerId} onChange={(e) => setRemotePeerId(e.target.value)} placeholder="Enter Peer ID" className="flex-grow" />
                <Button onClick={handleConnect} disabled={isConnecting || !remotePeerId.trim()}>{isConnecting ? 'Connecting...' : 'Connect'}</Button>
              </div>
            </div>
          )}

          {gameState === 'creating' && (
            <div className="text-center space-y-6">
              <p className="text-xl font-semibold">Share your ID:</p>
              <div className="flex items-center justify-center space-x-2 p-4 bg-card rounded-xl border-2 border-dashed border-primary/50">
                <motion.span key={peerId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-2xl font-mono flex-grow text-center truncate">{peerId}</motion.span>
                <Button variant="default" size="icon" onClick={handleCopy} className="shrink-0">{copied ? <Check className="h-4 w-4 animate-fade-in" /> : <Copy className="h-4 w-4" />}</Button>
              </div>
              <p className="text-lg text-muted-foreground animate-pulse">Waiting for an opponent to connect...</p>
              <Button onClick={() => setGameState('initial')} variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" />Cancel Room</Button>
            </div>
          )}

          {gameState === 'connected' && isConnected && (
            <div className="text-center">
              <p className="text-green-500 font-bold">Connected!</p>
              <Button onClick={() => setGameState('countdown')} className="mt-4" disabled={!isConnected || peerStatus !== 'online'}>Start Game</Button>
            </div>
          )}

          {gameState === 'countdown' && (
            <div className="text-center">
              <motion.p key={timer} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.5, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="text-8xl font-black">{timer}</motion.p>
            </div>
          )}

          {gameState === 'playing' && !choice && (
            <div className="flex justify-center space-x-4">
              <GameChoiceButton choice="rock" onChoiceSelect={sendChoice} />
              <GameChoiceButton choice="paper" onChoiceSelect={sendChoice} />
              <GameChoiceButton choice="scissors" onChoiceSelect={sendChoice} />
            </div>
          )}

          {gameState === 'playing' && choice && !remoteChoice && <p className="text-center animate-fade-in">Waiting for opponent...</p>}

          {gameState === 'result' && choice && remoteChoice && <GameResultDisplay myChoice={choice} remoteChoice={remoteChoice} winner={winner} onReset={resetGame} isResetValidating={isResetValidating} />}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
