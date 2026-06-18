import { TripState, AgentTrace, OrchestratorResult } from '../types.js';
import { dbService } from '../database/db.js';
import { isSafeError } from '../utils/errors.js';
import * as geminiAgents from '../agents/gemini/travelAgents.js';
import * as groqAgents from '../agents/groq/travelAgents.js';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({});
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function orchestrateTripRequest(userQuery: string): Promise<OrchestratorResult> {
    const requestId = Math.random().toString(36).substring(2, 11);
    const state: TripState = { userQuery };
    const traces: AgentTrace[] = [];

    let routeDecision: { needsDestination: boolean; needsItinerary: boolean; needsBudget: boolean };
    let executionContext = "";

    // STEP 1: ROUTING & INTENT EVALUATION
    try {
        // Primary Attempt: Gemini
        const routerPrompt = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this travel input prompt: "${userQuery}". 
            Determine exactly which specialized agents are required to fulfill this query.
            Respond ONLY with a valid JSON object matching this schema: 
            {"needsDestination": boolean, "needsItinerary": boolean, "needsBudget": boolean}`,
            config: { responseMimeType: "application/json" }
        });
        routeDecision = JSON.parse(routerPrompt.text || '{"needsDestination":true,"needsItinerary":true,"needsBudget":true}');
    } catch (routerError) {
        console.warn(`[ORCHESTRATOR] Router Step: Gemini failed. Dropping back to Groq...`);
        try {
            const groqRouter = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant', 
                messages: [
                    {
                        role: 'system',
                        content: `Analyze this travel input prompt: "${userQuery}". 
                        Respond ONLY with a valid JSON object matching this schema: 
                        {"needsDestination": boolean, "needsItinerary": boolean, "needsBudget": boolean}`
                    },
                    { role: 'user', content: userQuery }
                ],
                response_format: { type: "json_object" }
            });
            routeDecision = JSON.parse(groqRouter.choices[0]?.message?.content || '{"needsDestination":true,"needsItinerary":true,"needsBudget":true}');
        } catch (groqRouterFatal) {
            return {
                requestId,
                synthesizedAnswer: "Critical Error: Router systems failed on all available LLM pipelines.",
                agentTraces: []
            };
        }
    }

    // SEQUENTIAL CHAINING WITH ATOMIC FALLBACK

    // Destination Agent Execution
    if (routeDecision.needsDestination) {
        try {
            const destTrace = await geminiAgents.runDestinationAgent(state);
            if (destTrace.error) throw new Error(destTrace.error);
            
            // STAMP SUCCESSFUL GEMINI EXECUTION
            destTrace.decisionJustification = `[PROVIDER: GEMINI] ${destTrace.decisionJustification || "Evaluated regional options against explicit constraints."}`;
            traces.push(destTrace);
            if (destTrace.output) executionContext += `\n[Destinations Chosen]: ${destTrace.output}`;
        } catch (error) {
            console.warn(`[ORCHESTRATOR] Destination Agent fallback activated.`);
            const fallbackDestTrace = await groqAgents.runDestinationAgent(state);
            
            // STAMP FALLBACK GROQ EXECUTION
            fallbackDestTrace.decisionJustification = `[PROVIDER: GROQ] [FAILOVER] ${fallbackDestTrace.decisionJustification || "Evaluated backup route rules."}`;
            traces.push(fallbackDestTrace);
            if (fallbackDestTrace.output) executionContext += `\n[Destinations Chosen]: ${fallbackDestTrace.output}`;
        }
    } else {
        traces.push({
            agentName: 'Destination Agent',
            executed: false,
            decisionJustification: "Bypassed by router logic: No location discovery requested."
        });
    }

    // Itinerary Agent Execution 
    if (routeDecision.needsItinerary) {
        try {
            const itinTrace = await geminiAgents.runItineraryAgent(state, executionContext);
            if (itinTrace.error) throw new Error(itinTrace.error);

            // STAMP SUCCESSFUL GEMINI EXECUTION
            itinTrace.decisionJustification = `[PROVIDER: GEMINI] ${itinTrace.decisionJustification || "Sequenced dynamic logical day-by-day timeline."}`;
            traces.push(itinTrace);
            if (itinTrace.output) executionContext += `\n[Itinerary Logic]: ${itinTrace.output}`;
        } catch (error) {
            console.warn(`[ORCHESTRATOR] Itinerary Agent: Gemini pipeline failed. Activating Groq failover.`);
            const fallbackItinTrace = await groqAgents.runItineraryAgent(state, executionContext);
            
            // STAMP FALLBACK GROQ EXECUTION
            fallbackItinTrace.decisionJustification = `[PROVIDER: GROQ] [FAILOVER] ${fallbackItinTrace.decisionJustification || "Generated backup daily schedule constraints."}`;
            traces.push(fallbackItinTrace);
            if (fallbackItinTrace.output) executionContext += `\n[Itinerary Logic]: ${fallbackItinTrace.output}`;
        }
    } else {
        traces.push({
            agentName: 'Itinerary Agent',
            executed: false,
            decisionJustification: "Bypassed by router logic: No schedule planning requested."
        });
    }

    // Budget Agent Execution 
    if (routeDecision.needsBudget) {
        try {
            const budgetTrace = await geminiAgents.runBudgetAgent(state, executionContext);
            if (budgetTrace.error) throw new Error(budgetTrace.error);

            // STAMP SUCCESSFUL GEMINI EXECUTION
            budgetTrace.decisionJustification = `[PROVIDER: GEMINI] ${budgetTrace.decisionJustification || "Calculated structural cost estimations against hard cap limits."}`;
            traces.push(budgetTrace);
            if (budgetTrace.output) executionContext += `\n[Budget Assessment]: ${budgetTrace.output}`;
        } catch (error) {
            console.warn(`[ORCHESTRATOR] Budget Agent: Gemini pipeline failed. Activating Groq failover.`);
            const fallbackBudgetTrace = await groqAgents.runBudgetAgent(state, executionContext);
            
            // STAMP FALLBACK GROQ EXECUTION
            fallbackBudgetTrace.decisionJustification = `[PROVIDER: GROQ] [FAILOVER] ${fallbackBudgetTrace.decisionJustification || "Audited financial boundaries via alternative ledger rules."}`;
            traces.push(fallbackBudgetTrace);
            if (fallbackBudgetTrace.output) executionContext += `\n[Budget Assessment]: ${fallbackBudgetTrace.output}`;
        }
    } else {
        traces.push({
            agentName: 'Budget Agent',
            executed: false,
            decisionJustification: "Bypassed by router logic: No budget auditing requested."
        });
    }

    // COHERENT FINAL SYNTHESIS
    let finalAnswer = "";
    try {
        const synthesisResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Synthesize a final single response answering the user's initial inquiry: "${userQuery}". Utilize the collective workspace outputs from our specialized agents below to create a comprehensive, organized overview. Ensure transparency by summarizing what conclusions were evaluated. Workspace:\n${executionContext}`
        });
        
        finalAnswer = synthesisResponse.text 
            ? `${synthesisResponse.text}\n\n*Optimized by Gemini Engine.*` 
            : "Unable to compile response details seamlessly.";
    } catch (synthesisError) {
        console.warn(`[ORCHESTRATOR] Synthesis Step: Gemini failed. Falling back to Groq Synthesis.`);
        try {
            const groqSynthesis = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `Synthesize a final single response answering the user's initial inquiry: "${userQuery}". Utilize the collective workspace outputs from our specialized agents to create an overview.`
                    },
                    { role: 'user', content: `Workspace Context Logs:\n${executionContext}` }
                ]
            });
            
            // SIGNATURE APPENDED TO FALLBACK SUCCESS
            finalAnswer = groqSynthesis.choices[0]?.message?.content 
                ? `${groqSynthesis.choices[0]?.message?.content}\n\n*Optimized by Groq Fallback Engine.*` 
                : "Unable to compile fallback synthesis seamlessly.";
        } catch (groqSynthesisFatal) {
            const exception = groqSynthesisFatal && typeof groqSynthesisFatal === 'object' ? groqSynthesisFatal : {};
            finalAnswer = `Critical Execution Breakdown. Engine reported: ${isSafeError(exception) ? exception.message : 'Unknown System Outage'}`;
        }
    }

    // PERSIST TO AUDIT TRAIL
    try {
        const triggeredNames = traces.filter(t => t.executed).map(t => t.agentName).join(', ');
        dbService.saveLog({
            id: requestId,
            user_prompt: userQuery,
            agents_triggered: triggeredNames || 'None',
            final_response: finalAnswer,
            trace_json: JSON.stringify(traces)
        });
    } catch (dbError) {
        console.error("Failed writing audit traces to persistence layer:", dbError);
    }

    return {
        requestId,
        synthesizedAnswer: finalAnswer,
        agentTraces: traces
    };
}