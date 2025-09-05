
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LucideGavel } from "@/components/icons/LucideGavel";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      // Navigation happens in the login function based on user role
    } catch (err) {
      setError((err as Error).message || "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
        <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <img src="/lovable-uploads/4e53edd2-c5d5-441a-8e85-dd6d8a88c97d.png" alt="County Assembly of Makueni" className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold mt-4">Makueni County Assembly</h1>
          <p className="text-muted-foreground mt-1">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>

          <Button
            type="button"
            variant="link"
            className="w-full"
            onClick={() => setShowForgotPassword(true)}
          >
            Forgot Password?
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Note: You need to sign up in Supabase first.</p>
          <p>After signing up, an admin can promote you to admin/clerk role.</p>
        </div>
        
        <Button
          variant="link"
          className="w-full mt-4"
          onClick={() => navigate("/")}
        >
          Back to Public View
        </Button>
      </Card>
      
      <footer className="absolute bottom-0 left-0 right-0 bg-gray-100 py-4">
        <div className="container text-center">
          <p className="text-sm text-gray-600">
            © 2025 All Rights Reserved By County Assembly of Makueni
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
