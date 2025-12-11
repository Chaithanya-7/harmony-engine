import { FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ScenarioCard from "./ScenarioCard";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const scenarios = [
  {
    id: "irs",
    title: "IRS Impersonation",
    description: "Claims unpaid taxes and threatens arrest.",
  },
  {
    id: "grandchild",
    title: "Grandchild in Trouble",
    description: "Fake grandchild claiming to be arrested abroad.",
  },
  {
    id: "tech",
    title: "Tech Support Fraud",
    description: "Fake support claiming computer virus.",
  },
];

interface SimulationLabProps {
  onScenarioComplete: (result: { type: string; blocked: boolean }) => void;
}

const SimulationLab = ({ onScenarioComplete }: SimulationLabProps) => {
  const [runningScenario, setRunningScenario] = useState<string | null>(null);

  const handleRunScenario = async (scenarioId: string, title: string) => {
    setRunningScenario(scenarioId);
    
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const blocked = Math.random() > 0.3; // 70% detection rate for demo
    
    onScenarioComplete({ type: scenarioId, blocked });
    
    toast({
      title: blocked ? "🛡️ Scam Detected & Blocked" : "⚠️ Warning: Suspicious Activity",
      description: `${title} scenario ${blocked ? "was successfully blocked" : "triggered a warning"}.`,
      variant: blocked ? "default" : "destructive",
    });
    
    setRunningScenario(null);
  };

  return (
    <Card className="bg-card border-border animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FlaskConical className="w-5 h-5 text-success" />
          Scam Simulation Lab
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test the detection system with pre-recorded scenarios
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              title={scenario.title}
              description={scenario.description}
              isRunning={runningScenario === scenario.id}
              onRun={() => handleRunScenario(scenario.id, scenario.title)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimulationLab;
