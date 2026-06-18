export interface TripState {
    userQuery: string;
    error?: string;
}

export interface AgentTrace {
    agentName: 'Destination Agent' | 'Itinerary Agent' | 'Budget Agent';
    executed: boolean;
    provider?: 'Gemini' | 'Groq';
    output?: string;
    decisionJustification?: string;
    error?: string;
}

export interface OrchestratorResult {
    requestId: string;
    synthesizedAnswer: string;
    agentTraces: AgentTrace[];
}

export interface AuditLog {
    id: string;
    user_prompt: string;
    agents_triggered: string;
    final_response: string;
    trace_json: string;
}