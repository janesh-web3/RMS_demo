import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  ChefHat,
  Utensils,
  Coffee,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
      toast.success("Welcome back! Redirecting to dashboard...");
    } catch (err: any) {
      setError(err.message || "Login failed");
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const floatingIcons = [
    { icon: ChefHat, delay: "0s", duration: "6s" },
    { icon: Utensils, delay: "2s", duration: "8s" },
    { icon: Coffee, delay: "4s", duration: "7s" },
    { icon: Clock, delay: "1s", duration: "9s" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 animate-pulse-scale" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 animate-pulse-scale"
          style={{ animationDelay: "3s" }}
        />

        {/* Floating Icons */}
        {floatingIcons.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="absolute opacity-10 dark:opacity-5"
              style={{
                left: `${20 + index * 20}%`,
                top: `${10 + index * 15}%`,
                animationDelay: item.delay,
                animationDuration: item.duration,
              }}
            >
              <Icon className="w-8 h-8 animate-bounce" />
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative z-10">
        <div
          className={`w-full max-w-md transform transition-all duration-1000 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center animate-bounce-in">
                  <ChefHat className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent animate-slide-in-left">
              Welcome Back!
            </h1>
            <p className="text-lg text-muted-foreground mt-2 animate-slide-in-right">
              Ready to manage your restaurant? ✨
            </p>
          </div>

          {/* Login Card */}
          <Card className="backdrop-blur-sm bg-card/95 border-primary/20 shadow-2xl animate-fade-in">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl text-center font-semibold">
                Restaurant Management System
              </CardTitle>
              <CardDescription className="text-center text-base">
                Sign in to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="chef@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 px-4 text-base bg-background/50 border-primary/20 focus:border-primary transition-all duration-200 hover:border-primary/40"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 px-4 pr-12 text-base bg-background/50 border-primary/20 focus:border-primary transition-all duration-200 hover:border-primary/40"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 animate-fade-in">
                    <p className="text-destructive text-sm text-center font-medium">
                      {error}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      <span>Signing you in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Sign In</span>
                      <ChefHat className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </form>

              {/* Quick Access Info */}
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-center text-muted-foreground">
                  Your culinary command center awaits 🍽️
                </p>
                <div className="flex justify-center space-x-4 mt-3">
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Utensils className="w-3 h-3" />
                    <span>Orders</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Coffee className="w-3 h-3" />
                    <span>Menu</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Reports</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
