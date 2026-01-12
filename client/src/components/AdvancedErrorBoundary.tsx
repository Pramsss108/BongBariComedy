import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/logger";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AdvancedErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    logger.error(error, "ErrorBoundary");
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans">
          <Card className="w-full max-w-md border-red-500/50 bg-zinc-900/90 text-white shadow-2xl backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 text-red-500">
              <AlertTriangle className="h-8 w-8" />
              <CardTitle className="text-xl font-bold uppercase tracking-widest">System Failure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black/50 p-3 rounded-lg border border-white/10 max-h-48 overflow-auto font-mono text-xs text-red-300">
                <p className="font-bold mb-1">{this.state.error?.message || "Unknown Error"}</p>
                <p className="opacity-50 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</p>
              </div>
              
              <div className="text-sm text-zinc-400">
                The application encountered a critical error. We have logged this event.
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restart System
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                  }}
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-950"
                >
                    Hard Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
