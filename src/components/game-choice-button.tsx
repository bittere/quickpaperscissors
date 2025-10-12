import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HandMetal, Hand, Scissors } from 'lucide-react';

type Choice = 'rock' | 'paper' | 'scissors';

interface ChoiceMap {
  icon: any;
  label: string;
}

const choiceIcons: Record<Choice, ChoiceMap> = {
  rock: { icon: HandMetal, label: 'Rock' },
  paper: { icon: Hand, label: 'Paper' },
  scissors: { icon: Scissors, label: 'Scissors' },
};

interface GameChoiceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  choice: Choice;
  onSelect: (choice: Choice) => void;
  selected?: boolean;
}

export function GameChoiceButton({ choice, onSelect, selected = false, className, ...props }: GameChoiceButtonProps) {
  const { icon: Icon, label } = choiceIcons[choice];

  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      size="lg"
      onClick={() => onSelect(choice)}
      className={cn('h-32 w-32 flex flex-col items-center justify-center gap-2 text-xl font-bold transition-all duration-300 hover:scale-[1.05]', selected && 'ring-4 ring-primary-500/50 scale-[1.05]', className)}
      {...props}
    >
      <Icon className="h-8 w-8" />
      <span>{label}</span>
    </Button>
  );
}
