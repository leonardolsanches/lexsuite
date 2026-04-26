export default function S07MiniPC() {
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
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>Render — API Server</div>
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Mini PC
          </div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Cloudflare Tunnel</div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Fluxo Completo</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "1vh" }}>Inteligência Artificial</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2.5vh" }}>Banco & Segurança</div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "6vh 5vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1.5vh" }}>Infraestrutura</div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1.5vh 0", letterSpacing: "-0.02em" }}>Mini PC — Infraestrutura Local</h1>
        <p style={{ fontSize: "1.3vw", color: "#9AA5CE", lineHeight: 1.5, margin: "0 0 3vh 0", maxWidth: "44vw" }}>
          Servidor local com três serviços independentes expostos via Cloudflare Tunnel. Hardware dedicado para inferência LLM sem custo de API.
        </p>
        <div style={{ display: "flex", gap: "2.5vw", flex: 1 }}>
          {/* Ollama */}
          <div style={{ flex: 1, backgroundColor: "rgba(158,206,106,0.06)", border: "1px solid rgba(158,206,106,0.25)", borderRadius: "0.8vw", padding: "2.5vh 2vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "2vh" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#9ECE6A", borderRadius: "50%" }} />
              <div style={{ fontSize: "1.4vw", fontWeight: 700, color: "#9ECE6A" }}>Ollama</div>
              <div style={{ fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace" }}>:11434</div>
            </div>
            <div style={{ fontSize: "1vw", color: "#9AA5CE", lineHeight: 1.6, marginBottom: "2vh" }}>Servidor de LLM local com gestão de modelos, cache de contexto e API OpenAI-compatible.</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.4vw", padding: "1.5vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", lineHeight: 1.7 }}>
              <div style={{ color: "#9ECE6A" }}>POST /api/generate</div>
              <div style={{ color: "#9ECE6A" }}>POST /api/embeddings</div>
              <div style={{ color: "#565F89" }}>GET  /api/tags</div>
            </div>
            <div style={{ marginTop: "1.5vh", fontSize: "0.9vw", color: "#9AA5CE", fontFamily: "'DM Mono', monospace" }}>stream: true · context window</div>
          </div>
          {/* DB Bridge */}
          <div style={{ flex: 1, backgroundColor: "rgba(122,162,247,0.06)", border: "1px solid rgba(122,162,247,0.25)", borderRadius: "0.8vw", padding: "2.5vh 2vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "2vh" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#7AA2F7", borderRadius: "50%" }} />
              <div style={{ fontSize: "1.4vw", fontWeight: 700, color: "#7AA2F7" }}>DB Bridge</div>
              <div style={{ fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace" }}>:8000</div>
            </div>
            <div style={{ fontSize: "1vw", color: "#9AA5CE", lineHeight: 1.6, marginBottom: "2vh" }}>FastAPI proxy que expõe o PostgreSQL local via HTTP. Elimina conexão TCP direta do Render ao banco.</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.4vw", padding: "1.5vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", lineHeight: 1.7 }}>
              <div style={{ color: "#7AA2F7" }}>POST /query</div>
              <div style={{ color: "#7AA2F7" }}>POST /chunks/insert</div>
              <div style={{ color: "#7AA2F7" }}>POST /chunks/search</div>
              <div style={{ color: "#565F89" }}>GET  /health</div>
            </div>
            <div style={{ marginTop: "1.5vh", fontSize: "0.9vw", color: "#9AA5CE", fontFamily: "'DM Mono', monospace" }}>{"{ sql, params } → { rows, row_count }"}</div>
          </div>
          {/* PostgreSQL */}
          <div style={{ flex: 1, backgroundColor: "rgba(224,175,104,0.06)", border: "1px solid rgba(224,175,104,0.25)", borderRadius: "0.8vw", padding: "2.5vh 2vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "2vh" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#E0AF68", borderRadius: "50%" }} />
              <div style={{ fontSize: "1.4vw", fontWeight: 700, color: "#E0AF68" }}>PostgreSQL</div>
              <div style={{ fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace" }}>:5432</div>
            </div>
            <div style={{ fontSize: "1vw", color: "#9AA5CE", lineHeight: 1.6, marginBottom: "2vh" }}>Banco principal com extensão pgvector para busca semântica. Acesso exclusivo via DB Bridge.</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.4vw", padding: "1.5vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", lineHeight: 1.7 }}>
              <div style={{ color: "#E0AF68" }}>users</div>
              <div style={{ color: "#E0AF68" }}>user_modules</div>
              <div style={{ color: "#E0AF68" }}>workflows</div>
              <div style={{ color: "#E0AF68" }}>prompts</div>
              <div style={{ color: "#E0AF68" }}>sessions · chunks</div>
            </div>
            <div style={{ marginTop: "1.5vh", fontSize: "0.9vw", color: "#9AA5CE", fontFamily: "'DM Mono', monospace" }}>pgvector · embedding(768)</div>
          </div>
        </div>
        <div style={{ marginTop: "2vh", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>07</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
