import { GameChoiceButton } from '@/components/game-choice-button';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Choice = 'rock' | 'paper' | 'scissors';
type Winner = 'You' | 'Opponent' | 'Tie' | null;

interface GameResultDisplayProps {
  myChoice: Choice;
  remoteChoice: Choice;
  winner: Winner;
  onReset: () => void;
  isResetValidating: boolean;
}

const ChoiceDisplay = ({ choice, isWinner }: { choice: Choice; isWinner: boolean }) => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: isWinner ? 1.1 : 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    className={cn(
      'flex flex-col items-center space-y-2 p-4 rounded-xl transition-all duration-300',
      isWinner
        ? 'bg-primary/10 ring-4 ring-primary-500/50'
        : 'bg-muted/50'
    )}
  >
    <GameChoiceButton choice={choice} onChoiceSelect={() => {}} disabled />
  </motion.div>
);

const WinnerMessage = ({ winner }: { winner: Winner }) => {
  let message = '';
  let className = '';
  let emoji = '';

  switch (winner) {
    case 'You':
      message = 'You Won!';
      className = 'text-green-500';
      emoji = '🎉';
      break;
    case 'Opponent':
      message = 'You Lost!';
      className = 'text-red-500';
      emoji = '😔';
      break;
    case 'Tie':
      message = "It's a Tie!";
      className = 'text-yellow-500';
      emoji = '🤝';
      break;
    default:
      return null;
  }

  return (
    <motion.h2
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
      className={cn('text-5xl font-extrabold mb-8', className)}
    >
      {emoji} {message} {emoji}
    </motion.h2>
  );
};

export function GameResultDisplay({ myChoice, remoteChoice, winner, onReset, isResetValidating }: GameResultDisplayProps) {
  const isMyChoiceWinning = winner === 'You';
  const isRemoteChoiceWinning = winner === 'Opponent';

  return (
    <div className="flex flex-col items-center space-y-8 animate-fade-in">
      <WinnerMessage winner={winner} />

      <div className="flex justify-center space-x-6 w-full max-w-sm">
        <div className="flex flex-col items-center">
          <p className="font-semibold text-lg mb-2">Your Choice</p>
          <ChoiceDisplay choice={myChoice} isWinner={isMyChoiceWinning} />
        </div>

        <div className="flex flex-col items-center">
          <p className="font-semibold text-lg mb-2">Opponent's Choice</p>
          <ChoiceDisplay choice={remoteChoice} isWinner={isRemoteChoiceWinning} />
        </div>
      </div>

      <Button onClick={onReset} className="mt-4" disabled={isResetValidating}>
        {isResetValidating ? 'Validating Connection...' : 'Play Again'}
      </Button>
    </div>
  );
}
