import { useState, useEffect } from "react";
import { Phone, PhoneOff, Mic, MicOff, Shield, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallEnd: (result: { 
    duration: number; 
    riskLevel: 'safe' | 'warning' | 'blocked';
    riskScore: number;
    fraudIndicators: string[];
  }) => void;
}

const CallModal = ({ isOpen, onClose, onCallEnd }: CallModalProps) => {
  const [callState, setCallState] = useState<'connecting' | 'active' | 'analyzing' | 'complete'>('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [fraudIndicators, setFraudIndicators] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setCallState('connecting');
      setDuration(0);
      setIsMuted(false);
      setRiskScore(0);
      setFraudIndicators([]);
      return;
    }

    // Simulate connection
    const connectTimer = setTimeout(() => setCallState('active'), 1500);

    return () => clearTimeout(connectTimer);
  }, [isOpen]);

  useEffect(() => {
    if (callState !== 'active') return;

    const durationInterval = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    // Simulate risk analysis
    const riskInterval = setInterval(() => {
      const newRisk = Math.min(riskScore + Math.random() * 15, 100);
      setRiskScore(newRisk);

      if (newRisk > 30 && fraudIndicators.length === 0) {
        setFraudIndicators(['Urgency detected in speech pattern']);
      }
      if (newRisk > 50 && fraudIndicators.length === 1) {
        setFraudIndicators((prev) => [...prev, 'Authority claim detected']);
      }
      if (newRisk > 70 && fraudIndicators.length === 2) {
        setFraudIndicators((prev) => [...prev, 'Request for sensitive info']);
      }
    }, 2000);

    return () => {
      clearInterval(durationInterval);
      clearInterval(riskInterval);
    };
  }, [callState, riskScore, fraudIndicators.length]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallState('analyzing');
    
    const finalRiskScore = riskScore;
    const finalIndicators = [...fraudIndicators];
    
    setTimeout(() => {
      let riskLevel: 'safe' | 'warning' | 'blocked';
      if (finalRiskScore < 30) riskLevel = 'safe';
      else if (finalRiskScore < 60) riskLevel = 'warning';
      else riskLevel = 'blocked';

      onCallEnd({ 
        duration, 
        riskLevel,
        riskScore: finalRiskScore,
        fraudIndicators: finalIndicators,
      });
      setCallState('complete');
      
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 2000);
  };

  const getRiskColor = () => {
    if (riskScore < 30) return 'text-success';
    if (riskScore < 60) return 'text-warning';
    return 'text-primary';
  };

  const getRiskLabel = () => {
    if (riskScore < 30) return 'Low Risk';
    if (riskScore < 60) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'active' && 'Call in Progress'}
            {callState === 'analyzing' && 'Analyzing Call...'}
            {callState === 'complete' && 'Call Complete'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Call Timer */}
          <div className="text-center">
            <p className="text-5xl font-mono font-bold">
              {formatDuration(duration)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {callState === 'connecting' && 'Establishing secure connection...'}
              {callState === 'active' && 'Live fraud analysis active'}
              {callState === 'analyzing' && 'Processing call data...'}
              {callState === 'complete' && 'Analysis complete'}
            </p>
          </div>

          {/* Risk Indicator */}
          {callState === 'active' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Fraud Risk Score</span>
                <span className={`text-sm font-medium ${getRiskColor()}`}>
                  {getRiskLabel()} ({Math.round(riskScore)}%)
                </span>
              </div>
              <Progress 
                value={riskScore} 
                className="h-2"
              />

              {/* Fraud Indicators */}
              {fraudIndicators.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Detected Indicators
                  </p>
                  <ul className="space-y-1">
                    {fraudIndicators.map((indicator, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Analyzing State */}
          {callState === 'analyzing' && (
            <div className="flex items-center justify-center gap-3">
              <Shield className="w-8 h-8 text-primary animate-pulse" />
              <span className="text-muted-foreground">Running fraud detection models...</span>
            </div>
          )}

          {/* Complete State */}
          {callState === 'complete' && (
            <div className="flex items-center justify-center gap-3">
              <Shield className="w-8 h-8 text-success" />
              <span className="text-success font-medium">Analysis saved to dashboard</span>
            </div>
          )}

          {/* Call Controls */}
          {callState === 'active' && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className="w-12 h-12 rounded-full"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                variant="danger"
                size="icon"
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallModal;
