export default function S05RenderFrontend() {
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
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Render — Frontend
          </div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Render — API Server</div>
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
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1.5vh 0", letterSpacing: "-0.02em" }}>Render — Frontend</h1>
        <p style={{ fontSize: "1.3vw", color: "#9AA5CE", lineHeight: 1.5, margin: "0 0 3vh 0", maxWidth: "44vw" }}>
          SPA estática servida via CDN do Render. Build com Vite, roteamento SPA via rewrite rules, variáveis de ambiente em build time.
        </p>
        <div style={{ display: "flex", gap: "3vw" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh" }}>render.yaml</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "2vh 2vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.95vw", lineHeight: 1.7 }}>
              <div style={{ color: "#7AA2F7" }}>type: <span style={{ color: "#9ECE6A" }}>web</span></div>
              <div style={{ color: "#7AA2F7" }}>name: <span style={{ color: "#9ECE6A" }}>lexsuite</span></div>
              <div style={{ color: "#7AA2F7" }}>buildCommand: <span style={{ color: "#9AA5CE" }}>pnpm install</span></div>
              <div style={{ color: "#9AA5CE", paddingLeft: "1.5vw" }}>{"&& pnpm --filter @workspace/lex-suite run build"}</div>
              <div style={{ color: "#7AA2F7" }}>publishDir: <span style={{ color: "#E0AF68" }}>artifacts/lex-suite/dist/public</span></div>
              <div style={{ color: "#7AA2F7", marginTop: "1vh" }}>routes:</div>
              <div style={{ color: "#9AA5CE", paddingLeft: "1.5vw" }}>{"- type: rewrite"}</div>
              <div style={{ color: "#9AA5CE", paddingLeft: "2.5vw" }}>{"source: /*"}</div>
              <div style={{ color: "#9AA5CE", paddingLeft: "2.5vw" }}>{"destination: /index.html"}</div>
            </div>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh" }}>Variáveis de Ambiente</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "2vh 2vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.95vw", lineHeight: 1.8 }}>
              <div><span style={{ color: "#7AA2F7" }}>VITE_CLERK_PUBLISHABLE_KEY</span> <span style={{ color: "#565F89" }}>=</span> <span style={{ color: "#E0AF68" }}>pk_test_...</span></div>
              <div><span style={{ color: "#7AA2F7" }}>VITE_API_URL</span> <span style={{ color: "#565F89" }}>=</span> <span style={{ color: "#9ECE6A" }}>https://api.onrender.com</span></div>
              <div><span style={{ color: "#565F89" }}>BASE_PATH</span> <span style={{ color: "#565F89" }}>=</span> <span style={{ color: "#565F89" }}>/  (opcional)</span></div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh" }}>vite.config.ts — pontos-chave</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "2vh 2vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.95vw", lineHeight: 1.7 }}>
              <div style={{ color: "#C0CAF5" }}>{"const port = +(process.env."}<span style={{ color: "#7AA2F7" }}>PORT</span>{"|| "}<span style={{ color: "#FF9E64" }}>5173</span>{")"}</div>
              <div style={{ color: "#C0CAF5", marginTop: "0.5vh" }}>{"const base = process.env."}<span style={{ color: "#7AA2F7" }}>BASE_PATH</span>{" || "}<span style={{ color: "#9ECE6A" }}>"/""</span></div>
              <div style={{ color: "#C0CAF5", marginTop: "1vh" }}>server: {"{"}</div>
              <div style={{ color: "#C0CAF5", paddingLeft: "1.5vw" }}>port, host: <span style={{ color: "#9ECE6A" }}>true</span>,</div>
              <div style={{ color: "#C0CAF5", paddingLeft: "1.5vw" }}>allowedHosts: <span style={{ color: "#9ECE6A" }}>true</span></div>
              <div style={{ color: "#C0CAF5" }}>{"}"}</div>
              <div style={{ color: "#C0CAF5", marginTop: "0.5vh" }}>build: {"{ outDir: "}<span style={{ color: "#E0AF68" }}>"dist/public"</span>{" }"}</div>
            </div>
            <div style={{ padding: "2vh 2vw", backgroundColor: "rgba(158,206,106,0.08)", border: "1px solid rgba(158,206,106,0.2)", borderRadius: "0.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#9ECE6A", fontWeight: 600, marginBottom: "0.8vh" }}>Fluxo de Build</div>
              <div style={{ fontSize: "0.95vw", color: "#9AA5CE", lineHeight: 1.6 }}>
                pnpm install → tsc → vite build → dist/public/index.html + assets → Render CDN
              </div>
            </div>
            <div style={{ padding: "2vh 2vw", backgroundColor: "rgba(122,162,247,0.08)", border: "1px solid rgba(122,162,247,0.2)", borderRadius: "0.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, marginBottom: "0.8vh" }}>SPA Routing</div>
              <div style={{ fontSize: "0.95vw", color: "#9AA5CE", lineHeight: 1.6 }}>
                Todas as rotas reescrevem para index.html. Wouter gerencia /app, /app/rural, /app/executio no browser.
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>05</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
