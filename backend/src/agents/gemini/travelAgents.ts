import { GoogleGenAI } from '@google/genai';
import { TripState, AgentTrace } from '../../types.js';
import dotenv from 'dotenv';
import { isSafeError } from '../../utils/errors.js';

dotenv.config();

const ai = new GoogleGenAI({});
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * 1. Destination Agent
 * Must justify suggestions against preferences and never break hard constraints.
 */
export async function runDestinationAgent(state: TripState): Promise<AgentTrace> {
    const trace: AgentTrace = { agentName: 'Destination Agent', executed: true };

    const systemInstruction = `
        You are a strict Destination Expert Agent for a multi-agent travel platform.
        Your job is to suggest exactly 2-3 specific destinations matching the user's climate, interests, and budget criteria.
        
        CRITICAL BEHAVIORAL CONSTRAINTS:
        1. You MUST justify each recommendation directly against the user's explicit preferences.
        2. You MUST NEVER recommend a destination that breaks a hard constraint given by the user (e.g., if they ask for 'under £1500', do not suggest ultra-luxury private island resorts).
        3. REALISM & CONFLICT RESOLUTION: If the user provides conflicting constraints—such as demanding "ultra-luxury/7-star resorts" in an expensive region (e.g., Switzerland) but with an unrealistically low budget—you MUST NOT hallucinate fake, low prices for high-end luxury brands. Instead, explicitly call out the conflict in your response, stand firm on the financial limit, and recommend high-quality premium or boutique alternatives that *actually* fit their budget.
        
        Format your response cleanly with clear justifications.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Analyze this user request and suggest matching destinations: "${state.userQuery}"`,
            config: { systemInstruction }
        });

        trace.output = response.text || 'No destinations generated.';
        trace.decisionJustification = "Evaluated climate, regional preferences, and explicit user-defined constraints.";
    } catch (error) {  
        const exception = error && typeof error === 'object' ? error : {};
        trace.error = isSafeError(exception) ? exception.message : 'Agent execution failure.';
        trace.output = 'Failed to execute destination routing safely.';
    }
    return trace;
}

/**
 * 2. Itinerary Agent
 * Builds a realistic day-by-day sequencing. Must admit uncertainty if it occurs.
 */
export async function runItineraryAgent(state: TripState, destinationOutput: string): Promise<AgentTrace> {
    const trace: AgentTrace = { agentName: 'Itinerary Agent', executed: true };

    const systemInstruction = `
    You are an Itinerary Sequencing Agent. Your job is to build a highly realistic day-by-day timeline based on the selected destinations.
    
    CRITICAL BEHAVIORAL CONSTRAINTS:
    1. Each daily plan must be physically realistic regarding travel time, geographic spacing, and logistically sound pacing.
    2. You MUST explicitly state where you are uncertain or making an assumption (e.g., local transit schedules, seasonal opening times).
  `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `User Context: "${state.userQuery}". Based on these suggested options:\n${destinationOutput}\nCreate a structured, logical day-by-day draft itinerary.`,
            config: { systemInstruction }
        });

        trace.output = response.text || 'No itinerary created.';
    } catch (error) {
        const exception = error && typeof error === 'object' ? error : {};
        trace.error = isSafeError(exception) ? exception.message : 'Itinerary compilation failed.';
    }
    return trace;
}

/**
 * 3. Budget Agent
 * Audits total costs against user limitations. Proposes cheaper alternatives if broken.
 */
export async function runBudgetAgent(state: TripState, itineraryOutput: string): Promise<AgentTrace> {
    const trace: AgentTrace = { agentName: 'Budget Agent', executed: true };

    const systemInstruction = `
    You are a financial Cost Auditing Agent. Your job is to calculate an estimated price breakdown (lodging, travel, daily food/activities) for the proposed itinerary.
    
    CRITICAL BEHAVIORAL CONSTRAINTS:
    1. You MUST NEVER silently pass or ignore a plan that breaks the user's budget.
    2. If the estimated total exceeds the stated budget capacity, explicitly flag the overage amount and propose specific cost-cutting alternative adjustments (e.g., budget hostels, off-season options).
  `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `User Query Context: "${state.userQuery}". Evaluate the total estimated costs for this proposed timeline and verify it strictly satisfies financial boundaries:\n${itineraryOutput}`,
            config: { systemInstruction }
        });

        trace.output = response.text || 'No budget breakdown provided.';
    } catch (error) {
        const exception = error && typeof error === 'object' ? error : {};
        trace.error = isSafeError(exception) ? exception.message : 'Cost projection calculations failed.';
    }
    return trace;
}