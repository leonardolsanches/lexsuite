
import { useState, useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, AuthenticateWithRedirectCallback, Show, useClerk, useUser, useAuth } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import ModuleView from "@/pages/ModuleView";
import Documents from "@/pages/Documents";

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) setBaseUrl(apiUrl);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 && failureCount < 2) return true;
        return false;
      },
      retryDelay: 500,
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(43 57% 55%)",
    colorForeground: "hsl(40 19% 93%)",
    colorMutedForeground: "hsl(30 5% 42%)",
    colorDanger: "hsl(0 44% 39%)",
    colorBackground: "hsl(60 5% 9%)",
    colorInput: "hsl(218 8% 16%)",
    colorInputForeground: "hsl(40 19% 93%)",
    colorNeutral: "hsl(218 8% 16%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "bg-[#181815] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#292925]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-serif",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground",
    formFieldLabel: "text-foreground",
    footerActionLink: "text-primary hover:text-primary/90",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-foreground",
    alertText: "text-foreground",
    logoBox: "",
    logoImage: "",
    socialButtonsBlockButton: "border-border hover:bg-accent",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
    formFieldInput: "bg-input border-border text-foreground placeholder:text-muted-foreground",
    footerAction: "",
    dividerLine: "bg-border",
    alert: "bg-destructive/20 border-destructive",
    otpCodeFieldInput: "bg-input border-border text-foreground",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ApiClientSetup() {
  const { getToken } = useAuth();
  // Set synchronously during render so sibling queries have the token available
  // on their first fetch (useEffect would be too late — queries fire before effects run)
  setAuthTokenGetter(() => getToken());
  useEffect(() => () => setAuthTokenGetter(null), []);
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: any }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Lex Suite",
            subtitle: "Entre para acessar seu assistente jurídico",
            actionText: "Não tem conta?",
            actionLink: "Cadastre-se",
          },
        },
        signUp: {
          start: {
            title: "Criar conta no Lex Suite",
            subtitle: "Cadastre-se para acessar o assistente jurídico",
            actionText: "Já tem conta?",
            actionLink: "Entre aqui",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ApiClientSetup />
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/sso-callback">
              <AuthenticateWithRedirectCallback />
            </Route>
            <Route path="/sign-up/sso-callback">
              <AuthenticateWithRedirectCallback />
            </Route>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/app">
              <ProtectedRoute component={Dashboard} />
            </Route>
            <Route path="/app/rural">
              <ProtectedRoute component={() => <ModuleView module="rural" />} />
            </Route>
            <Route path="/app/executio">
              <ProtectedRoute component={() => <ModuleView module="executio" />} />
            </Route>
            <Route path="/app/rural/documents">
              <ProtectedRoute component={() => <Documents module="rural" />} />
            </Route>
            <Route path="/app/executio/documents">
              <ProtectedRoute component={() => <Documents module="executio" />} />
            </Route>
            
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
