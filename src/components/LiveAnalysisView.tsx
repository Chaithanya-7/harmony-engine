import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AudioAnalysisPanel } from './AudioAnalysisPanel';
import { useLiveAnalysis } from '@/hooks/useLiveAnalysis';
import { toast } from '@/hooks/use-toast';
import { 
  Mic, 
  MicOff, 
  Activity, 
  AlertTriangle, 
  Shield, 
  Clock,
  Waves,
  Radio
} from 'lucide-react';
import type { AnalysisResult } from '@/utils/audio/FraudAnalysisPipeline';

interface LiveAnalysisViewProps {
  onCallEnd?: (result: { 
    duration: number; 
    riskLevel: 'safe' | 'warning' | 'blocked'; 
    riskScore: number; 
    fraudIndicators: string[] 
  }) => void;
}

export function LiveAnalysisView({ onCallEnd }: LiveAnalysisViewProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [peakRisk, setPeakRisk] = useState(0);
  const [allIndicators, setAllIndicators] = useState<string[]>([]);

  const liveAnalysis = useLiveAnalysis({
    fraudThreshold: 0.7,
    enableDiarization: true,
    onAlert: (result) => {
      toast({
        title: "⚠️ Fraud Alert!",
        description: `High risk detected: ${(result.fraudProbability * 100).toFixed(0)}%`,
        variant: "destructive",
      });
    },
    onChunkProcessed: (result) => {
      // Track peak risk
      if (result.fraudProbability > peakRisk) {
        setPeakRisk(result.fraudProbability);
      }
      // Collect all indicators
      if (result.fraudIndicators.length > 0) {
        setAllIndicators(prev => [...new Set([...prev, ...result.fraudIndicators])]);
      }
    },
  });

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (liveAnalysis.isRecording) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [liveAnalysis.isRecording]);

  const handleStart = async () => {
    if (!liveAnalysis.isPermissionGranted) {
      const granted = await liveAnalysis.requestPermission();
      if (!granted) {
        toast({
          title: "Microphone Access Required",
          description: "Please allow microphone access to use live analysis.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setCallDuration(0);
    setPeakRisk(0);
    setAllIndicators([]);
    await liveAnalysis.start();
    
    toast({
      title: "Live Analysis Started",
      description: "Monitoring audio for fraud signals...",
    });
  };

  const handleStop = () => {
    liveAnalysis.stop();
    
    // Calculate final risk level
    const riskLevel = peakRisk >= 0.8 ? 'blocked' : peakRisk >= 0.5 ? 'warning' : 'safe';
    
    if (onCallEnd) {
      onCallEnd({
        duration: callDuration,
        riskLevel,
        riskScore: Math.round(peakRisk * 100),
        fraudIndicators: allIndicators,
      });
    }
    
    toast({
      title: "Analysis Complete",
      description: `Call ended. Risk level: ${riskLevel}`,
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 0.8) return 'text-destructive';
    if (risk >= 0.5) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getRiskBg = (risk: number) => {
    if (risk >= 0.8) return 'bg-destructive/20 border-destructive/50';
    if (risk >= 0.5) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-green-500/20 border-green-500/50';
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              Live Fraud Analysis
            </div>
            {liveAnalysis.isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-current animate-pulse" />
                LIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Controls */}
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              variant={liveAnalysis.isRecording ? "destructive" : "default"}
              onClick={liveAnalysis.isRecording ? handleStop : handleStart}
              className="gap-2"
            >
              {liveAnalysis.isRecording ? (
                <>
                  <MicOff className="h-5 w-5" />
                  Stop Analysis
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  Start Live Analysis
                </>
              )}
            </Button>

            {liveAnalysis.isRecording && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatDuration(callDuration)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  {liveAnalysis.chunksProcessed} chunks
                </div>
                <div className="flex items-center gap-1.5">
                  <span>{liveAnalysis.averageLatency.toFixed(0)}ms latency</span>
                </div>
              </div>
            )}
          </div>

          {/* Audio Level Visualization */}
          {liveAnalysis.isRecording && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Waves className="h-4 w-4" />
                  Audio Level
                </span>
                <span>{(liveAnalysis.audioLevel * 100).toFixed(0)}%</span>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-primary transition-all duration-75"
                  style={{ width: `${liveAnalysis.audioLevel * 100}%` }}
                />
                {/* Audio level bars visualization */}
                <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        i < liveAnalysis.audioLevel * 20 
                          ? 'bg-primary' 
                          : 'bg-muted-foreground/20'
                      }`}
                      style={{ 
                        height: `${Math.min(100, (Math.random() * 50 + 50) * (i < liveAnalysis.audioLevel * 20 ? 1 : 0.3))}%` 
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {liveAnalysis.microphoneError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              {liveAnalysis.microphoneError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Risk Display */}
      {(liveAnalysis.isRecording || liveAnalysis.currentResult) && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Current Risk */}
          <Card className={`border ${getRiskBg(liveAnalysis.currentResult?.fraudProbability || 0)}`}>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <Shield className={`h-12 w-12 ${getRiskColor(liveAnalysis.currentResult?.fraudProbability || 0)}`} />
                </div>
                <div className={`text-3xl font-bold ${getRiskColor(liveAnalysis.currentResult?.fraudProbability || 0)}`}>
                  {((liveAnalysis.currentResult?.fraudProbability || 0) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Current Risk</div>
                <Badge 
                  variant={
                    liveAnalysis.currentResult?.riskLevel === 'blocked' ? 'destructive' :
                    liveAnalysis.currentResult?.riskLevel === 'warning' ? 'secondary' : 'outline'
                  }
                >
                  {liveAnalysis.currentResult?.riskLevel || 'safe'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Peak Risk */}
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <AlertTriangle className={`h-12 w-12 ${getRiskColor(peakRisk)}`} />
                </div>
                <div className={`text-3xl font-bold ${getRiskColor(peakRisk)}`}>
                  {(peakRisk * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Peak Risk</div>
                <Progress 
                  value={peakRisk * 100} 
                  className={`h-2 ${peakRisk >= 0.7 ? '[&>div]:bg-destructive' : peakRisk >= 0.4 ? '[&>div]:bg-yellow-500' : ''}`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Confidence */}
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <Activity className="h-12 w-12 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary">
                  {((liveAnalysis.currentResult?.confidenceScore || 0) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Confidence</div>
                <div className="text-xs text-muted-foreground">
                  Based on {liveAnalysis.chunksProcessed} audio chunks
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detected Indicators */}
      {allIndicators.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Detected Fraud Indicators ({allIndicators.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allIndicators.map((indicator, idx) => (
                <Badge key={idx} variant="destructive" className="text-xs">
                  {indicator.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis Panel */}
      {(liveAnalysis.isActive || liveAnalysis.currentResult) && (
        <AudioAnalysisPanel 
          state={{
            isActive: liveAnalysis.isActive,
            currentResult: liveAnalysis.currentResult,
            stats: liveAnalysis.stats,
            conversationState: liveAnalysis.conversationState,
            speakers: liveAnalysis.speakers,
            metadata: liveAnalysis.metadata,
            emotionalTrend: liveAnalysis.emotionalTrend,
          }}
          result={liveAnalysis.currentResult}
        />
      )}
    </div>
  );
}
