export default function S06RenderAPI() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#1A1B26", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", color: "#C0CAF5" }}>
      <div style={{ width: "22vw", height: "100vh", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "5vh 3vw", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "6vh" }}>
          <div style={{ width: "1.5vw", height: "1.5vw", background: "linear-gradient(135deg, #D4A853 50%, #3B82F6 50%)", borderRadius: "0.3vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#FFFFFF" }}>Lex Suite</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>Visão Geral</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "2.5vh" }}>Infraestrutura</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", marginBottom: "3.5vh" }}>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>Render — Frontend</div>
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Render — API Server
          </div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Mini PC</div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Cloudflare Tunnel</div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Fluxo Completo</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "1vh" }}>Inteligência Artificial</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2.5vh" }}>Banco & Segurança</div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "6vh 5vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1.5vh" }}>Infraestrutura</div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1.5vh 0", letterSpacing: "-0.02em" }}>Render — API Server</h1>
        <p style={{ fontSize: "1.3vw", color: "#9AA5CE", lineHeight: 1.5, margin: "0 0 2.5vh 0", maxWidth: "44vw" }}>
          Serviço Node.js no Render. Express 5 com middleware chain: CORS → Clerk → Pino → Rotas → Error Handler.
        </p>
        <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
          {/* Middleware Chain */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh", marginBottom: "2vh" }}>Middleware Chain</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8vh" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "1.2vh 1.5vw", backgroundColor: "rgba(122,162,247,0.1)", border: "1px solid rgba(122,162,247,0.2)", borderRadius: "0.4vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#7AA2F7", fontFamily: "'DM Mono', monospace", fontWeight: 600, width: "2vw" }}>1</div>
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>pinoHttp — structured logging</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "1.2vh 1.5vw", backgroundColor: "rgba(158,206,106,0.08)", border: "1px solid rgba(158,206,106,0.2)", borderRadius: "0.4vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", fontWeight: 600, width: "2vw" }}>2</div>
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>clerkProxyMiddleware — /__clerk/*</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "1.2vh 1.5vw", backgroundColor: "rgba(224,175,104,0.08)", border: "1px solid rgba(224,175,104,0.2)", borderRadius: "0.4vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace", fontWeight: 600, width: "2vw" }}>3</div>
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>cors — credentials + origin</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "1.2vh 1.5vw", backgroundColor: "rgba(224,175,104,0.08)", border: "1px solid rgba(224,175,104,0.2)", borderRadius: "0.4vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace", fontWeight: 600, width: "2vw" }}>4</div>
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>express.json — limit 10mb</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "1.2vh 1.5vw", backgroundColor: "rgba(122,162,247,0.1)", border: "1px solid rgba(122,162,247,0.2)", borderRadius: "0.4vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#7AA2F7", fontFamily: "'DM Mono', monospace", fontWeight: 600, width: "2vw" }}>5</div>
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>clerkMiddleware — JWT validation</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "1.2vh 1.5vw", backgroundColor: "rgba(158,206,106,0.08)", border: "1px solid rgba(158,206,106,0.2)", borderRadius: "0.4vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", fontWeight: 600, width: "2vw" }}>6</div>
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>router /api — todas as rotas</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "1.2vh 1.5vw", backgroundColor: "rgba(255,158,100,0.08)", border: "1px solid rgba(255,158,100,0.2)", borderRadius: "0.4vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#FF9E64", fontFamily: "'DM Mono', monospace", fontWeight: 600, width: "2vw" }}>7</div>
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>errorHandler — 500/503 JSON</div>
              </div>
            </div>
          </div>
          {/* Routes */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh", marginBottom: "2vh" }}>Rotas da API</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "2vh 2vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.95vw", lineHeight: 1.9 }}>
              <div><span style={{ color: "#9ECE6A" }}>GET</span>  <span style={{ color: "#7AA2F7" }}>/api/healthz</span>      <span style={{ color: "#565F89" }}>public</span></div>
              <div><span style={{ color: "#9ECE6A" }}>GET</span>  <span style={{ color: "#7AA2F7" }}>/api/debug</span>       <span style={{ color: "#565F89" }}>public · diagnóstico</span></div>
              <div><span style={{ color: "#9ECE6A" }}>GET</span>  <span style={{ color: "#7AA2F7" }}>/api/me</span>          <span style={{ color: "#E0AF68" }}>auth</span></div>
              <div><span style={{ color: "#9ECE6A" }}>GET</span>  <span style={{ color: "#7AA2F7" }}>/api/workflows</span>   <span style={{ color: "#E0AF68" }}>auth</span></div>
              <div><span style={{ color: "#9ECE6A" }}>GET</span>  <span style={{ color: "#7AA2F7" }}>/api/prompts/:key</span> <span style={{ color: "#E0AF68" }}>auth</span></div>
              <div><span style={{ color: "#FF9E64" }}>POST</span> <span style={{ color: "#7AA2F7" }}>/api/analyze</span>     <span style={{ color: "#E0AF68" }}>auth · SSE stream</span></div>
              <div><span style={{ color: "#9ECE6A" }}>GET</span>  <span style={{ color: "#7AA2F7" }}>/api/sessions</span>    <span style={{ color: "#E0AF68" }}>auth</span></div>
              <div><span style={{ color: "#FF9E64" }}>POST</span> <span style={{ color: "#7AA2F7" }}>/api/documents</span>   <span style={{ color: "#E0AF68" }}>auth · multipart</span></div>
            </div>
            <div style={{ marginTop: "2vh", padding: "1.5vh 1.5vw", backgroundColor: "rgba(122,162,247,0.08)", border: "1px solid rgba(122,162,247,0.2)", borderRadius: "0.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, marginBottom: "0.5vh" }}>requireAuth middleware</div>
              <div style={{ fontSize: "0.95vw", color: "#9AA5CE", fontFamily: "'DM Mono', monospace" }}>
                getAuth(req) → userId → getOrCreateUser(userId) → next()
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>06</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
