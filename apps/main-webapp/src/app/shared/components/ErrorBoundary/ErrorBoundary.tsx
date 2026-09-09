import { Component, type ReactNode } from "react";
import ErrorState from "@shared/components/ErrorState/ErrorState";

interface ErrorBoundaryProps {
  children: ReactNode;
}

// React requires a class component to catch render errors.
class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error("Unhandled UI error:", error);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <ErrorState
        title="This page crashed"
        description="An unexpected error occurred. Reload to continue."
        onRetry={() => {
          this.setState({ hasError: false });
          window.location.reload();
        }}
      />
    );
  }
}

export default ErrorBoundary;
