export interface Policy {
    name: string;
    description?: string;
    rule: 'ALLOW' | 'DENY';
    constraints: {
        regions?: string[];
        maxCost?: number;
        minTier?: 'STANDARD' | 'PREMIUM';
        requiredTags?: string[];
    };
    priority: number; // Higher is more important
}

export interface RoutingStrategy {
    type: 'LOWEST_COST' | 'LOWEST_LATENCY' | 'PERFORMANCE_TIER';
    fallback?: boolean; // If true, use fallbacks if primary fails
}

import { CloudAdapter } from './adapter.interface';

export class PolicyEngine {
    private policies: Policy[] = [];
    private defaultStrategy: RoutingStrategy = { type: 'LOWEST_COST' };

    constructor(initialPolicies: Policy[] = []) {
        this.policies = initialPolicies;
    }

    addPolicy(policy: Policy) {
        this.policies.push(policy);
        this.policies.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Filters a list of adapters based on active policies.
     * Returns only adapters that satisfy ALL ALLOW policies and don't trigger DENY policies.
     */
    filterProviders(adapters: Map<string, CloudAdapter>): CloudAdapter[] {
        const result: CloudAdapter[] = [];

        for (const [name, adapter] of adapters.entries()) {
            const info = adapter.providerInfo;
            if (!info) {
                // If no info, safety default: depends on strictness. 
                // For now, allow but warn.
                result.push(adapter);
                continue;
            }

            let allowed = true;

            for (const policy of this.policies) {
                // Simple logic: If DENY rule matches, exclude.
                // If ALLOW rule exists, must match at least one? 
                // Let's implement Negative Constraints (Guardrails) primarily for now.

                if (policy.rule === 'DENY') {
                    if (policy.constraints.regions && policy.constraints.regions.includes(info.region)) {
                        allowed = false;
                        break;
                    }
                    if (policy.constraints.maxCost !== undefined && (info.costPerMs || 0) > policy.constraints.maxCost) {
                        allowed = false;
                        break;
                    }
                }

                if (policy.rule === 'ALLOW') {
                    // Start restrictive? 
                    // For typical "Guardrails", we usually just want to block bad things.
                    // But if "EU Only", that's an ALLOW rule.
                    if (policy.constraints.regions && !policy.constraints.regions.includes(info.region)) {
                        allowed = false;
                        break;
                    }
                }
            }

            if (allowed) {
                result.push(adapter);
            }
        }
        return result;
    }

    /**
     * Sorts valid adapters based on the chosen strategy.
     */
    sortProviders(adapters: CloudAdapter[], strategy: RoutingStrategy): CloudAdapter[] {
        return adapters.sort((a, b) => {
            const infoA = a.providerInfo;
            const infoB = b.providerInfo;

            if (!infoA) return 1; // Penalty for unknown info
            if (!infoB) return -1;

            switch (strategy.type) {
                case 'LOWEST_COST':
                    return (infoA.costPerMs || 0) - (infoB.costPerMs || 0);
                case 'PERFORMANCE_TIER':
                    const tiers = { 'SPOT': 0, 'STANDARD': 1, 'PREMIUM': 2 };
                    return tiers[infoB.tier] - tiers[infoA.tier];
                case 'LOWEST_LATENCY':
                    // Latency is dynamic, usually checked via health(). 
                    // This static sort might use historical data if we had it.
                    // For now, fallback to cost or equal.
                    return 0;
                default:
                    return 0;
            }
        });
    }

    /**
     * Select the best provider from available set given policies and strategy.
     */
    selectBestProvider(adapters: Map<string, CloudAdapter>, strategy: RoutingStrategy = this.defaultStrategy): CloudAdapter | null {
        const filtered = this.filterProviders(adapters);
        if (filtered.length === 0) return null;

        const sorted = this.sortProviders(filtered, strategy);
        return sorted[0];
    }
}
