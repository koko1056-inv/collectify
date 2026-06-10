import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// LanguageProvider のクラッシュ時にも安全に動作させるため、
// 言語はコンテキストではなく localStorage から直接読む
const isEnglish = () => {
  try {
    return localStorage.getItem("app-language") === "en";
  } catch {
    return false;
  }
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught render error:", error, errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false });
    window.location.href = "/my-room";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const en = isEnglish();
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="text-5xl">😢</div>
          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-foreground">
              {en ? "Something went wrong" : "問題が発生しました"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {en
                ? "An unexpected error occurred. Please reload the app or return to your room."
                : "予期しないエラーが発生しました。再読み込みするか、マイルームに戻ってください。"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={this.handleReload} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              {en ? "Reload" : "再読み込み"}
            </Button>
            <Button onClick={this.handleGoHome} variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              {en ? "Back to My Room" : "マイルームに戻る"}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
