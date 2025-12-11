import { RefreshCw, Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onRefresh: () => void;
  onMakeCall: () => void;
}

const Header = ({ onRefresh, onMakeCall }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between py-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Shield className="w-10 h-10 text-primary" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            CallGuard-Sentinel
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time call protection
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
        <Button variant="danger" onClick={onMakeCall} className="gap-2">
          <Phone className="w-4 h-4" />
          Make Call
        </Button>
      </div>
    </header>
  );
};

export default Header;
