import { useState, useCallback } from "react";
import Header from "@/components/Header";
import SimulationLab from "@/components/SimulationLab";
import StatsGrid from "@/components/StatsGrid";
import CallDurationChart from "@/components/CallDurationChart";
import RiskBreakdown from "@/components/RiskBreakdown";
import CallModal from "@/components/CallModal";
import { toast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

const Index = () => {
  const [stats, setStats] = useState({
    totalCalls: 0,
    scamsBlocked: 0,
    warnings: 0,
    safeCalls: 0,
  });

  const [callHistory, setCallHistory] = useState<Array<{ call: number; duration: number; risk: number }>>([]);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  const handleRefresh = useCallback(() => {
    toast({
      title: "Dashboard Refreshed",
      description: "All data has been synchronized.",
    });
  }, []);

  const handleMakeCall = useCallback(() => {
    setIsCallModalOpen(true);
  }, []);

  const handleScenarioComplete = useCallback((result: { type: string; blocked: boolean }) => {
    setStats((prev) => ({
      ...prev,
      totalCalls: prev.totalCalls + 1,
      scamsBlocked: prev.scamsBlocked + (result.blocked ? 1 : 0),
      warnings: prev.warnings + (result.blocked ? 0 : 1),
    }));

    const duration = Math.floor(Math.random() * 120) + 30;
    setCallHistory((prev) => [
      ...prev.slice(-9),
      {
        call: prev.length + 1,
        duration,
        risk: result.blocked ? 85 : 45,
      },
    ]);
  }, []);

  const handleCallEnd = useCallback((result: { duration: number; riskLevel: 'safe' | 'warning' | 'blocked' }) => {
    setStats((prev) => ({
      ...prev,
      totalCalls: prev.totalCalls + 1,
      scamsBlocked: prev.scamsBlocked + (result.riskLevel === 'blocked' ? 1 : 0),
      warnings: prev.warnings + (result.riskLevel === 'warning' ? 1 : 0),
      safeCalls: prev.safeCalls + (result.riskLevel === 'safe' ? 1 : 0),
    }));

    setCallHistory((prev) => [
      ...prev.slice(-9),
      {
        call: prev.length + 1,
        duration: result.duration,
        risk: result.riskLevel === 'blocked' ? 85 : result.riskLevel === 'warning' ? 45 : 15,
      },
    ]);
  }, []);

  const riskData = {
    safe: stats.safeCalls,
    warning: stats.warnings,
    blocked: stats.scamsBlocked,
  };

  return (
    <>
      <Helmet>
        <title>CallGuard-Sentinel | Real-time Call Fraud Detection</title>
        <meta name="description" content="Advanced AI-powered call fraud detection system with real-time voice analysis, speaker diarization, and multimodal threat assessment." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pb-8 max-w-7xl">
          <Header onRefresh={handleRefresh} onMakeCall={handleMakeCall} />

          <main className="space-y-6">
            <SimulationLab onScenarioComplete={handleScenarioComplete} />
            
            <StatsGrid stats={stats} />

            <div className="grid gap-4 lg:grid-cols-3">
              <CallDurationChart data={callHistory} />
              <RiskBreakdown data={riskData} />
            </div>
          </main>
        </div>

        <CallModal
          isOpen={isCallModalOpen}
          onClose={() => setIsCallModalOpen(false)}
          onCallEnd={handleCallEnd}
        />
      </div>
    </>
  );
};

export default Index;
