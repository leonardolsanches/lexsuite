export default function S03StackTecnologica() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#1A1B26", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", color: "#C0CAF5" }}>
      <div style={{ width: "22vw", height: "100vh", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "5vh 3vw", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "6vh" }}>
          <div style={{ width: "1.5vw", height: "1.5vw", background: "linear-gradient(135deg, #D4A853 50%, #3B82F6 50%)", borderRadius: "0.3vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#FFFFFF" }}>Lex Suite</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>Visão Geral</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", marginBottom: "3.5vh" }}>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>Arquitetura</div>
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Stack Tecnológica
          </div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Módulos</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>Infraestrutura</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "2.5vh" }}>Inteligência Artificial</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2.5vh" }}>Banco & Segurança</div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "6vh 5vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1.5vh" }}>Visão Geral</div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 3vh 0", letterSpacing: "-0.02em" }}>Stack Tecnológica</h1>
        <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
          {/* Frontend */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#7AA2F7", marginBottom: "2vh", borderBottom: "1px solid rgba(122,162,247,0.2)", paddingBottom: "1vh" }}>Frontend</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "1vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>React 19 + Vite 6</div>
                <div style={{ fontSize: "0.9vw", color: "#9AA5CE", marginTop: "0.4vh" }}>SPA, build estático, HMR</div>
              </div>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "1vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>Wouter</div>
                <div style={{ fontSize: "0.9vw", color: "#9AA5CE", marginTop: "0.4vh" }}>Roteamento client-side leve</div>
              </div>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "1vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>TanStack Query v5</div>
                <div style={{ fontSize: "0.9vw", color: "#9AA5CE", marginTop: "0.4vh" }}>Cache, retry, streaming</div>
              </div>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "1vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>shadcn/ui + Tailwind v4</div>
                <div style={{ fontSize: "0.9vw", color: "#9AA5CE", marginTop: "0.4vh" }}>Componentes acessíveis, temas</div>
              </div>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "1vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>@clerk/react</div>
                <div style={{ fontSize: "0.9vw", color: "#9AA5CE", marginTop: "0.4vh" }}>Auth, token getter síncrono</div>
              </div>
            </div>
          </div>
          {/* Backend */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#E0AF68", marginBottom: "2vh", borderBottom: "1px solid rgba(224,175,104,0.2)", paddingBottom: "1vh" }}>Backend</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "1vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>Express 5 + Node.js 20</div>
                <div style={{ fontSize: "0.9vw", color: "#9AA5CE", marginTop: "0.4vh" }}>API REST, async/await nativo</div>
              </div>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "1vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>@clerk/express</div>
                <div style={{ fontSize: "0.9vw", color: "#9AA5CE", marginTop: "0.4vh" }}>clerkMiddleware + requireAuth</div>
              </div>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "1vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>Pino Logger</div>
                <div style={{ fontSize: "0.9vw", color: "#9AA5CE", marginTop: "0.4vh" }}>Structured JSON logging</div>
              </div>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "1vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>DB Bridge (FastAPI HTTP)</div>
                <div style={{ fontSize: "0.9vw", color: "#9AA5CE", marginTop: "0.4vh" }}>POST /query → PostgreSQL</div>
              </div>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "1vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>Ollama HTTP API</div>
                <div style={{ fontSize: "0.9vw", color: "#9AA5CE", marginTop: "0.4vh" }}>Streaming via SSE / chunks</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "2vh", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>03</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
