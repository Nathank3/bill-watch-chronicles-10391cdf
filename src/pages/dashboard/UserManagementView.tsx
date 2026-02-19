import { Component, ErrorInfo, ReactNode } from "react";
import { AdminUsers } from "@/components/AdminUsers.tsx";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("UserManagementView Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-500 rounded bg-red-50 text-red-900">
          <h2 className="text-lg font-bold mb-2">Something went wrong.</h2>
          <p className="font-mono text-sm whitespace-pre-wrap">{this.state.error?.toString()}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function UserManagementView() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
      <ErrorBoundary>
        <AdminUsers />
      </ErrorBoundary>
    </div>
  );
}
