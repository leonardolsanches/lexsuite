export default function S08CloudflareTunnel() {
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
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>Mini PC</div>
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Cloudflare Tunnel
          </div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Fluxo Completo</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "1vh" }}>Inteligência Artificial</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2.5vh" }}>Banco & Segurança</div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "6vh 5vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1.5vh" }}>Infraestrutura</div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1.5vh 0", letterSpacing: "-0.02em" }}>Cloudflare Tunnel</h1>
        <p style={{ fontSize: "1.3vw", color: "#9AA5CE", lineHeight: 1.5, margin: "0 0 3vh 0", maxWidth: "44vw" }}>
          Ponte HTTPS segura entre Render Cloud e Mini PC local. Nenhuma porta aberta no router — o Mini PC inicia a conexão de saída.
        </p>
        <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
          <div style={{ flex: 1.2 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh", marginBottom: "2vh" }}>Como funciona</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5vw" }}>
                <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "50%", backgroundColor: "rgba(255,158,100,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF9E64", fontSize: "1.1vw", fontWeight: 700, flexShrink: 0 }}>1</div>
                <div>
                  <div style={{ fontSize: "1.1vw", color: "#FFFFFF", fontWeight: 600, marginBottom: "0.5vh" }}>cloudflared no Mini PC</div>
                  <div style={{ fontSize: "0.95vw", color: "#9AA5CE" }}>O daemon cloudflared abre conexão WebSocket de saída para os servidores da Cloudflare. Sem inbound firewall.</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5vw" }}>
                <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "50%", backgroundColor: "rgba(158,206,106,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ECE6A", fontSize: "1.1vw", fontWeight: 700, flexShrink: 0 }}>2</div>
                <div>
                  <div style={{ fontSize: "1.1vw", color: "#FFFFFF", fontWeight: 600, marginBottom: "0.5vh" }}>URL pública gerada</div>
                  <div style={{ fontSize: "0.95vw", color: "#9AA5CE", fontFamily: "'DM Mono', monospace" }}>https://[random].trycloudflare.com</div>
                  <div style={{ fontSize: "0.95vw", color: "#9AA5CE", marginTop: "0.3vh" }}>URL diferente a cada reinicialização do cloudflared.</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5vw" }}>
                <div style={{ width: "2.5vw", height: "2.5vw", borderRadius: "50%", backgroundColor: "rgba(122,162,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7AA2F7", fontSize: "1.1vw", fontWeight: 700, flexShrink: 0 }}>3</div>
                <div>
                  <div style={{ fontSize: "1.1vw", color: "#FFFFFF", fontWeight: 600, marginBottom: "0.5vh" }}>Render API usa a URL</div>
                  <div style={{ fontSize: "0.95vw", color: "#9AA5CE" }}>DB_BRIDGE_URL e OLLAMA_BASE_URL são secrets no Render. Devem ser atualizados ao reiniciar o Mini PC.</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ flex: 0.8 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh", marginBottom: "2vh" }}>Secrets no Render</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "2vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", lineHeight: 1.9 }}>
              <div><span style={{ color: "#7AA2F7" }}>DB_BRIDGE_URL</span></div>
              <div style={{ color: "#9ECE6A", paddingLeft: "1vw", fontSize: "0.85vw" }}>https://[abc].trycloudflare.com</div>
              <div style={{ marginTop: "1vh" }}><span style={{ color: "#7AA2F7" }}>OLLAMA_BASE_URL</span></div>
              <div style={{ color: "#9ECE6A", paddingLeft: "1vw", fontSize: "0.85vw" }}>https://[xyz].trycloudflare.com</div>
              <div style={{ marginTop: "1vh" }}><span style={{ color: "#7AA2F7" }}>SESSION_SECRET</span></div>
              <div style={{ color: "#565F89", paddingLeft: "1vw", fontSize: "0.85vw" }}>*** (secret)</div>
            </div>
            <div style={{ marginTop: "2vh", padding: "1.5vh 1.5vw", backgroundColor: "rgba(255,158,100,0.08)", border: "1px solid rgba(255,158,100,0.25)", borderRadius: "0.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#FF9E64", fontWeight: 600, marginBottom: "0.5vh" }}>Atenção</div>
              <div style={{ fontSize: "0.95vw", color: "#9AA5CE", lineHeight: 1.5 }}>
                Quando o Mini PC reinicia, as URLs mudam. Atualize os dois secrets no painel do Render e faça redeploy da API.
              </div>
            </div>
            <div style={{ marginTop: "2vh", padding: "1.5vh 1.5vw", backgroundColor: "rgba(158,206,106,0.08)", border: "1px solid rgba(158,206,106,0.2)", borderRadius: "0.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#9ECE6A", fontWeight: 600, marginBottom: "0.5vh" }}>Diagnóstico</div>
              <div style={{ fontSize: "0.9vw", color: "#9AA5CE", fontFamily: "'DM Mono', monospace" }}>
                GET /api/debug → ping + workflows_count
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>08</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
