"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    householdName: "",
    inviteCode: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providers = await getProviders();
        const ids = Object.keys(providers ?? {}).filter((id) => id !== "credentials");
        setEnabledProviders(new Set(ids));
      } catch (providerError) {
        console.error("Error loading auth providers:", providerError);
      }
    };

    loadProviders();
  }, []);

  const hasOAuthProviders = enabledProviders.size > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOAuthSignIn = async (provider: string) => {
    if (!enabledProviders.has(provider)) {
      setError("Ta metoda logowania nie jest obecnie dostępna");
      return;
    }

    setOauthLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      setError(`Błąd rejestracji przez ${provider}`);
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Hasła nie są identyczne");
      return;
    }

    if (formData.password.length < 6) {
      setError("Hasło musi mieć co najmniej 6 znaków");
      return;
    }

    if (mode === "join" && !formData.inviteCode.trim()) {
      setError("Wprowadź kod zaproszenia");
      return;
    }

    if (mode === "create" && !formData.householdName.trim()) {
      setError("Wprowadź nazwę gospodarstwa domowego");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          householdName: mode === "create" ? (formData.householdName || `Dom ${formData.name}`) : undefined,
          inviteCode: mode === "join" ? formData.inviteCode : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Wystąpił błąd podczas rejestracji");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Wystąpił błąd podczas rejestracji");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Home className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Utwórz konto</CardTitle>
          <CardDescription>
            Zarejestruj się i zacznij planować z rodziną
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                {error}
              </div>
            )}

            {/* OAuth Buttons */}
            {hasOAuthProviders && (
              <>
                <div className="space-y-2">
                  {enabledProviders.has("google") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleOAuthSignIn("google")}
                      disabled={!!oauthLoading || isLoading}
                    >
                      {oauthLoading === "google" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Zarejestruj się z Google
                    </Button>
                  )}

                  {enabledProviders.has("facebook") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleOAuthSignIn("facebook")}
                      disabled={!!oauthLoading || isLoading}
                    >
                      {oauthLoading === "facebook" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <svg className="mr-2 h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      )}
                      Zarejestruj się z Facebook
                    </Button>
                  )}

                  {enabledProviders.has("microsoft-entra-id") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleOAuthSignIn("microsoft-entra-id")}
                      disabled={!!oauthLoading || isLoading}
                    >
                      {oauthLoading === "microsoft-entra-id" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" fill="none">
                          <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                          <path fill="#f35325" d="M1 1h10v10H1z"/>
                          <path fill="#81bc06" d="M12 1h10v10H12z"/>
                          <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                          <path fill="#ffba08" d="M12 12h10v10H12z"/>
                        </svg>
                      )}
                      Zarejestruj się z Microsoft
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Lub zarejestruj się emailem
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Imię</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Jan"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jan@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-3 pt-2">
              <Label>Gospodarstwo domowe</Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className={`py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    mode === "create" 
                      ? "bg-background shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={isLoading}
                >
                  Utwórz nowe
                </button>
                <button
                  type="button"
                  onClick={() => setMode("join")}
                  className={`py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    mode === "join" 
                      ? "bg-background shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={isLoading}
                >
                  Dołącz do istniejącego
                </button>
              </div>

              {mode === "create" ? (
                <div className="space-y-2">
                  <Label htmlFor="householdName">Nazwa gospodarstwa</Label>
                  <Input
                    id="householdName"
                    name="householdName"
                    type="text"
                    placeholder="Np. Dom Kowalskich"
                    value={formData.householdName}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Opcjonalne - domyślnie &quot;Dom [Twoje imię]&quot;
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Kod zaproszenia</Label>
                  <Input
                    id="inviteCode"
                    name="inviteCode"
                    type="text"
                    placeholder="Wprowadź 10-znakowy kod"
                    value={formData.inviteCode}
                    onChange={handleChange}
                    disabled={isLoading}
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Otrzymasz kod od administratora gospodarstwa
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejestracja...
                </>
              ) : (
                "Zarejestruj się"
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Masz już konto?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Zaloguj się
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

