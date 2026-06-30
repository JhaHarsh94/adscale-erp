import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-[1.5rem] border border-red-100 bg-red-50 p-8 text-center">
          <div className="rounded-2xl bg-red-100 p-4 text-red-600">
            <AlertTriangle size={32} />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-950">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-sm text-sm font-semibold text-slate-500">
            {this.state.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
