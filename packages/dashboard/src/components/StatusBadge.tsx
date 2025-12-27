import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Clock, PlayCircle } from 'lucide-react';

interface StatusBadgeProps {
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = {
        PENDING: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
        RUNNING: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: PlayCircle },
        COMPLETED: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
        FAILED: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle },
    };

    const style = config[status] || config.PENDING;
    const Icon = style.icon;

    return (
        <span className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border uppercase tracking-wider',
            style.color,
            className
        )}>
            <Icon size={14} className="stroke-[2.5]" />
            {status}
        </span>
    );
}
