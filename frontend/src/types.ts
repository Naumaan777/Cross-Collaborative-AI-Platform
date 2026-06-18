export interface AgentTrace {
    agentName: 'Destination Agent' | 'Itinerary Agent' | 'Budget Agent';
    executed: boolean;
    decisionJustification?: string;
    output?: string;
    error?: string;
}

export interface OrchestratorResult {
    requestId: string;
    synthesizedAnswer: string;
    agentTraces: AgentTrace[];
}

export interface AuditLog {
    id: string;
    userPrompt: string;
    agentsTriggered: string;
    finalResponse: string;
    traces: AgentTrace[];
}