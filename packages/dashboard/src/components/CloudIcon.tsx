import { Cloud } from 'lucide-react';

interface CloudIconProps {
    provider: string;
    className?: string;
}

export default function CloudIcon({ provider, className }: CloudIconProps) {
    const p = provider.toLowerCase();

    // In a real app, we might use SVGs for AWS/GCP/Azure logos.
    // For now, we use colorful generic clouds or text indicators.

    if (p.includes('aws')) {
        return <span className={`font-bold text-[#FF9900] ${className}`}>AWS</span>;
    }
    if (p.includes('gcp') || p.includes('google')) {
        return <span className={`font-bold text-[#4285F4] ${className}`}>GCP</span>;
    }
    if (p.includes('azure')) {
        return <span className={`font-bold text-[#0078D4] ${className}`}>AZR</span>;
    }

    return <Cloud className={`text-gray-400 ${className}`} size={16} />;
}
