import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FRAUD_ANALYSIS_PROMPT = `You are an expert fraud detection analyst. Analyze the following call transcript for potential scam or fraud indicators.

Evaluate these aspects and provide scores from 0-100:
1. Authority Impersonation: Claims to be from government, bank, tech support, etc.
2. Urgency Pressure: Creates artificial time pressure or threats
3. Financial Requests: Asks for money, gift cards, wire transfers, crypto
4. Personal Information: Requests SSN, bank details, passwords, PINs
5. Emotional Manipulation: Uses fear, greed, love, or sympathy
6. Suspicious Patterns: Unusual requests, inconsistencies, scripted responses

Return a JSON response with:
{
  "overallRiskScore": number (0-100),
  "riskLevel": "safe" | "warning" | "blocked",
  "categories": {
    "authorityImpersonation": { "score": number, "evidence": string[] },
    "urgencyPressure": { "score": number, "evidence": string[] },
    "financialRequests": { "score": number, "evidence": string[] },
    "personalInfoRequests": { "score": number, "evidence": string[] },
    "emotionalManipulation": { "score": number, "evidence": string[] },
    "suspiciousPatterns": { "score": number, "evidence": string[] }
  },
  "fraudIndicators": string[],
  "summary": string,
  "recommendation": string
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, audioAnalysis } = await req.json();
    
    if (!transcript || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          overallRiskScore: 0,
          riskLevel: 'safe',
          categories: {},
          fraudIndicators: [],
          summary: 'No transcript available for analysis',
          recommendation: 'Unable to analyze without transcript'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('[AnalyzeCall] Analyzing transcript...');

    // Build context with audio analysis if available
    let analysisContext = `TRANSCRIPT:\n${transcript}`;
    
    if (audioAnalysis) {
      analysisContext += `\n\nAUDIO ANALYSIS DATA:
- Voice Stress Level: ${(audioAnalysis.voiceStress * 100).toFixed(1)}%
- Speech Rate: ${audioAnalysis.speechRate ? 'Fast' : 'Normal'}
- Emotional Trend: ${audioAnalysis.emotionalTrend || 'stable'}
- Number of Speakers: ${audioAnalysis.speakerCount || 'unknown'}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: FRAUD_ANALYSIS_PROMPT },
          { role: 'user', content: analysisContext }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AnalyzeCall] OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);
    
    console.log('[AnalyzeCall] Analysis complete. Risk:', analysis.riskLevel);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AnalyzeCall] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
