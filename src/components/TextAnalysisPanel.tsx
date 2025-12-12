import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Shield, 
  AlertTriangle, 
  Ban,
  Trash2,
  Send,
  Phone,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface AnalyzedMessage {
  id: string;
  senderNumber: string;
  message: string;
  isCyberbullying: boolean;
  threatLevel: 'safe' | 'warning' | 'danger';
  indicators: string[];
  score: number;
  analyzedAt: Date;
}

interface BlockedNumber {
  id: string;
  phoneNumber: string;
  reason: string | null;
  blockedAt: Date;
  messageCount: number;
}

export function TextAnalysisPanel() {
  const { user } = useAuth();
  const [senderNumber, setSenderNumber] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedMessages, setAnalyzedMessages] = useState<AnalyzedMessage[]>([]);
  const [blockedNumbers, setBlockedNumbers] = useState<BlockedNumber[]>([]);
  const [activeTab, setActiveTab] = useState<'analyze' | 'blocked'>('analyze');

  useEffect(() => {
    if (user) {
      fetchBlockedNumbers();
    }
  }, [user]);

  const fetchBlockedNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_numbers')
        .select('*')
        .order('blocked_at', { ascending: false });

      if (error) throw error;

      setBlockedNumbers(
        (data || []).map(item => ({
          id: item.id,
          phoneNumber: item.phone_number,
          reason: item.reason,
          blockedAt: new Date(item.blocked_at),
          messageCount: item.message_count || 1
        }))
      );
    } catch (error) {
      console.error('Error fetching blocked numbers:', error);
    }
  };

  const analyzeMessage = async () => {
    if (!messageText.trim()) {
      toast({
        title: "Empty Message",
        description: "Please enter a message to analyze.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-text', {
        body: { 
          message: messageText,
          senderNumber: senderNumber || 'Unknown'
        }
      });

      if (error) throw error;

      const result: AnalyzedMessage = {
        id: crypto.randomUUID(),
        senderNumber: data.senderNumber,
        message: messageText,
        isCyberbullying: data.isCyberbullying,
        threatLevel: data.threatLevel,
        indicators: data.indicators,
        score: data.score,
        analyzedAt: new Date()
      };

      setAnalyzedMessages(prev => [result, ...prev]);

      // Save to database
      if (user) {
        await supabase.from('text_messages').insert({
          user_id: user.id,
          sender_number: senderNumber || 'Unknown',
          message_content: messageText,
          is_cyberbullying: data.isCyberbullying,
          threat_level: data.threatLevel,
          detected_indicators: data.indicators
        });
      }

      // Show appropriate toast
      if (data.threatLevel === 'danger') {
        toast({
          title: "⚠️ Cyberbullying Detected!",
          description: data.recommendation,
          variant: "destructive"
        });
      } else if (data.threatLevel === 'warning') {
        toast({
          title: "Suspicious Content",
          description: data.recommendation,
        });
      } else {
        toast({
          title: "Message Safe",
          description: "No harmful content detected.",
        });
      }

      // Clear inputs
      setMessageText("");
    } catch (error) {
      console.error('Error analyzing message:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const blockNumber = async (phoneNumber: string, reason: string) => {
    if (!user || !phoneNumber) return;

    try {
      const { error } = await supabase.from('blocked_numbers').upsert({
        user_id: user.id,
        phone_number: phoneNumber,
        reason: reason,
        message_count: 1
      }, {
        onConflict: 'user_id,phone_number'
      });

      if (error) throw error;

      toast({
        title: "Number Blocked",
        description: `${phoneNumber} has been added to your blocklist.`,
      });

      fetchBlockedNumbers();
    } catch (error) {
      console.error('Error blocking number:', error);
      toast({
        title: "Block Failed",
        description: "Could not block the number. Please try again.",
        variant: "destructive"
      });
    }
  };

  const unblockNumber = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_numbers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Number Unblocked",
        description: "The number has been removed from your blocklist.",
      });

      fetchBlockedNumbers();
    } catch (error) {
      console.error('Error unblocking number:', error);
    }
  };

  const getThreatBadge = (level: string) => {
    switch (level) {
      case 'danger':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Danger</Badge>;
      case 'warning':
        return <Badge className="bg-warning text-warning-foreground gap-1"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
      default:
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="h-3 w-3" /> Safe</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Buttons */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'analyze' ? 'default' : 'outline'}
          onClick={() => setActiveTab('analyze')}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Analyze Text
        </Button>
        <Button
          variant={activeTab === 'blocked' ? 'default' : 'outline'}
          onClick={() => setActiveTab('blocked')}
          className="gap-2"
        >
          <Ban className="h-4 w-4" />
          Blocklist ({blockedNumbers.length})
        </Button>
      </div>

      {activeTab === 'analyze' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Input Panel */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Text Message Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Sender Number (optional)
                </label>
                <Input
                  placeholder="+1 234 567 8900"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message Content
                </label>
                <Textarea
                  placeholder="Paste the suspicious message here..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <Button 
                onClick={analyzeMessage} 
                disabled={isAnalyzing || !messageText.trim()}
                className="w-full gap-2"
              >
                {isAnalyzing ? (
                  <>Analyzing...</>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Analyze Message
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                {analyzedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                    <p>No messages analyzed yet</p>
                    <p className="text-sm">Paste a message to check for cyberbullying</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analyzedMessages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`p-3 rounded-lg border ${
                          msg.threatLevel === 'danger' 
                            ? 'border-destructive/50 bg-destructive/10' 
                            : msg.threatLevel === 'warning'
                              ? 'border-warning/50 bg-warning/10'
                              : 'border-success/50 bg-success/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{msg.senderNumber}</span>
                            {getThreatBadge(msg.threatLevel)}
                          </div>
                          {msg.threatLevel !== 'safe' && msg.senderNumber !== 'Unknown' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => blockNumber(msg.senderNumber, msg.indicators[0] || 'Cyberbullying detected')}
                              className="gap-1"
                            >
                              <Ban className="h-3 w-3" />
                              Block
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          "{msg.message}"
                        </p>
                        {msg.indicators.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {msg.indicators.slice(0, 3).map((indicator, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {indicator}
                              </Badge>
                            ))}
                            {msg.indicators.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{msg.indicators.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Blocklist Panel */
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ban className="h-5 w-5 text-destructive" />
              Blocked Numbers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {blockedNumbers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Shield className="h-12 w-12 mb-2 opacity-50" />
                  <p>No blocked numbers yet</p>
                  <p className="text-sm">Cyberbullying senders will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedNumbers.map((blocked) => (
                    <div 
                      key={blocked.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                    >
                      <div>
                        <p className="font-mono font-medium">{blocked.phoneNumber}</p>
                        {blocked.reason && (
                          <p className="text-sm text-muted-foreground">{blocked.reason}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Blocked {blocked.blockedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => unblockNumber(blocked.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}