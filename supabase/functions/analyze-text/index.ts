import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive cyberbullying patterns
const cyberbullyingPatterns = [
  // Direct threats
  /\b(kill|murder|hurt|harm|beat|punch|stab|shoot)\s*(you|yourself|u|ur)/gi,
  /\b(die|death)\b/gi,
  /\b(i('ll|m\s+gonna|will)\s+(kill|hurt|find|get))/gi,
  
  // Harassment and insults
  /\b(ugly|fat|stupid|dumb|idiot|loser|pathetic|worthless|useless)\b/gi,
  /\b(hate\s*(you|u)|nobody\s*likes\s*(you|u))/gi,
  /\b(go\s*away|leave|disappear|kill\s*yourself|kys)/gi,
  
  // Slurs and profanity (masked for safety)
  /\b(f+u+c+k+|sh+i+t+|b+i+t+c+h+|a+s+s+h+o+l+e+|d+a+m+n+)\b/gi,
  /\b(wh+o+r+e+|sl+u+t+|tr+a+sh+)\b/gi,
  
  // Intimidation
  /\b(watch\s*(out|your\s*back)|i('m|ll)\s*find\s*(you|u))/gi,
  /\b(know\s*where\s*(you|u)\s*live)/gi,
  /\b(better\s*(run|hide|watch))/gi,
  
  // Exclusion and isolation
  /\b(no\s*one\s*(likes|wants|cares))/gi,
  /\b(you('re|\s*are)\s*(nothing|worthless|alone))/gi,
  /\b(everyone\s*hates)/gi,
];

// High-severity phrases
const highSeverityPhrases = [
  'kill yourself', 'kys', 'go die', 'end yourself',
  'i will find you', 'know where you live', 'gonna hurt you',
  'you should die', 'hope you die', 'wish you were dead'
];

function analyzeText(text: string): {
  isCyberbullying: boolean;
  threatLevel: 'safe' | 'warning' | 'danger';
  score: number;
  indicators: string[];
} {
  const lowerText = text.toLowerCase();
  const indicators: string[] = [];
  let score = 0;

  // Check high-severity phrases first
  for (const phrase of highSeverityPhrases) {
    if (lowerText.includes(phrase)) {
      indicators.push(`Severe threat: "${phrase}"`);
      score += 40;
    }
  }

  // Check regex patterns
  for (const pattern of cyberbullyingPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (!indicators.some(i => i.includes(match.toLowerCase()))) {
          indicators.push(`Harmful language: "${match}"`);
          score += 15;
        }
      }
    }
  }

  // Caps lock aggression
  const capsWords = text.match(/\b[A-Z]{3,}\b/g) || [];
  if (capsWords.length > 2) {
    indicators.push('Aggressive caps usage');
    score += 10;
  }

  // Excessive punctuation (aggression indicator)
  if ((text.match(/[!?]{3,}/g) || []).length > 0) {
    indicators.push('Aggressive punctuation');
    score += 5;
  }

  // Determine threat level
  let threatLevel: 'safe' | 'warning' | 'danger' = 'safe';
  if (score >= 50) {
    threatLevel = 'danger';
  } else if (score >= 20) {
    threatLevel = 'warning';
  }

  return {
    isCyberbullying: score >= 20,
    threatLevel,
    score: Math.min(score, 100),
    indicators: indicators.slice(0, 10) // Limit to 10 indicators
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, senderNumber } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing message from ${senderNumber || 'unknown'}: ${message.substring(0, 50)}...`);

    const analysis = analyzeText(message);

    console.log(`Analysis result: threatLevel=${analysis.threatLevel}, score=${analysis.score}, indicators=${analysis.indicators.length}`);

    return new Response(
      JSON.stringify({
        senderNumber: senderNumber || 'Unknown',
        isCyberbullying: analysis.isCyberbullying,
        threatLevel: analysis.threatLevel,
        score: analysis.score,
        indicators: analysis.indicators,
        recommendation: analysis.threatLevel === 'danger' 
          ? 'Block this number immediately' 
          : analysis.threatLevel === 'warning'
            ? 'Monitor this sender'
            : 'Message appears safe'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});