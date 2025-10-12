import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type PeerStatus = 'online' | 'unstable' | 'offline';

interface PeerStatusIndicatorProps {
  isConnected: boolean;
  peerStatus: PeerStatus;
}

const statusMap: Record<PeerStatus | 'disconnected', { label: string; colorClass: string }> = {
  online: { label: 'Online', colorClass: 'bg-green-500' },
  unstable: { label: 'Unstable', colorClass: 'bg-yellow-500' },
  offline: { label: 'Offline', colorClass: 'bg-red-500' },
  disconnected: { label: 'Disconnected', colorClass: 'bg-neutral-500' },
};

export function PeerStatusIndicator({ isConnected, peerStatus }: PeerStatusIndicatorProps) {
  const status = isConnected ? peerStatus : 'disconnected';
  const { label, colorClass } = statusMap[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/50 text-sm text-muted-foreground backdrop-blur-sm"
    >
      <div className={cn('h-2.5 w-2.5 rounded-full', colorClass, {
        'animate-pulse': status === 'online' || status === 'unstable',
      })}></div>
      <span className="font-medium">{label}</span>
    </motion.div>
  );
}
