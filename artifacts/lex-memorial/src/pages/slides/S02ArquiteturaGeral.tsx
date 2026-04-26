export default function S02ArquiteturaGeral() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#1A1B26", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", color: "#C0CAF5" }}>
      <div style={{ width: "22vw", height: "100vh", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "5vh 3vw", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "6vh" }}>
          <div style={{ width: "1.5vw", height: "1.5vw", background: "linear-gradient(135deg, #D4A853 50%, #3B82F6 50%)", borderRadius: "0.3vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#FFFFFF" }}>Lex Suite</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>Visão Geral</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", marginBottom: "3.5vh" }}>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>Capa</div>
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Arquitetura
          </div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Stack Tecnológica</div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Módulos</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>Infraestrutura</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "2.5vh" }}>Inteligência Artificial</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2.5vh" }}>Banco & Segurança</div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "6vh 5vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1.5vh" }}>Visão Geral</div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1.5vh 0", letterSpacing: "-0.02em" }}>Arquitetura do Sistema</h1>
        <p style={{ fontSize: "1.3vw", color: "#9AA5CE", lineHeight: 1.5, margin: "0 0 3vh 0", maxWidth: "44vw" }}>
          Plataforma distribuída: frontend estático e API em cloud (Render) conectados via Cloudflare Tunnel ao Mini PC local com Ollama e PostgreSQL.
        </p>
        {/* Architecture SVG */}
        <svg viewBox="0 0 900 340" style={{ width: "100%", flex: 1 }} xmlns="http://www.w3.org/2000/svg">
          {/* Browser */}
          <rect x="10" y="130" width="120" height="80" rx="8" fill="rgba(122,162,247,0.1)" stroke="#7AA2F7" strokeWidth="1.5" />
          <text x="70" y="162" textAnchor="middle" fill="#7AA2F7" fontSize="11" fontWeight="600" fontFamily="IBM Plex Sans">Browser</text>
          <text x="70" y="180" textAnchor="middle" fill="#9AA5CE" fontSize="9.5" fontFamily="DM Mono">React SPA</text>
          <text x="70" y="196" textAnchor="middle" fill="#9AA5CE" fontSize="9.5" fontFamily="DM Mono">Wouter + TanStack</text>

          {/* Arrow Browser → Render Cloud */}
          <line x1="130" y1="170" x2="195" y2="170" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="162" y="163" textAnchor="middle" fill="#565F89" fontSize="8.5" fontFamily="DM Mono">HTTPS</text>

          {/* Render Cloud Box */}
          <rect x="195" y="60" width="240" height="220" rx="10" fill="rgba(158,206,106,0.05)" stroke="rgba(158,206,106,0.3)" strokeWidth="1.5" strokeDasharray="6,3" />
          <text x="315" y="82" textAnchor="middle" fill="#9ECE6A" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans" textTransform="uppercase">RENDER CLOUD</text>

          {/* Frontend box inside Render */}
          <rect x="210" y="90" width="200" height="70" rx="6" fill="rgba(122,162,247,0.1)" stroke="#7AA2F7" strokeWidth="1.2" />
          <text x="310" y="118" textAnchor="middle" fill="#7AA2F7" fontSize="11" fontWeight="600" fontFamily="IBM Plex Sans">Frontend (Static)</text>
          <text x="310" y="135" textAnchor="middle" fill="#9AA5CE" fontSize="9" fontFamily="DM Mono">React + Vite · Render CDN</text>
          <text x="310" y="150" textAnchor="middle" fill="#9AA5CE" fontSize="9" fontFamily="DM Mono">PORT via BASE_PATH</text>

          {/* API Server inside Render */}
          <rect x="210" y="175" width="200" height="70" rx="6" fill="rgba(224,175,104,0.1)" stroke="#E0AF68" strokeWidth="1.2" />
          <text x="310" y="203" textAnchor="middle" fill="#E0AF68" fontSize="11" fontWeight="600" fontFamily="IBM Plex Sans">API Server</text>
          <text x="310" y="220" textAnchor="middle" fill="#9AA5CE" fontSize="9" fontFamily="DM Mono">Express 5 · Node.js 20</text>
          <text x="310" y="235" textAnchor="middle" fill="#9AA5CE" fontSize="9" fontFamily="DM Mono">Clerk Middleware + Pino</text>

          {/* Clerk Auth */}
          <rect x="195" y="300" width="240" height="35" rx="6" fill="rgba(122,162,247,0.08)" stroke="rgba(122,162,247,0.4)" strokeWidth="1.2" />
          <text x="315" y="323" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Clerk Auth (Dev Instance) · JWT Bearer</text>

          {/* Vertical arrow API → Clerk */}
          <line x1="315" y1="245" x2="315" y2="298" stroke="#7AA2F7" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowBlue)" />

          {/* Arrow Render API → Cloudflare */}
          <line x1="435" y1="210" x2="520" y2="210" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="477" y="203" textAnchor="middle" fill="#565F89" fontSize="8.5" fontFamily="DM Mono">DB_BRIDGE_URL</text>
          <text x="477" y="222" textAnchor="middle" fill="#565F89" fontSize="8.5" fontFamily="DM Mono">OLLAMA_BASE_URL</text>

          {/* Cloudflare Tunnel */}
          <rect x="520" y="175" width="130" height="70" rx="6" fill="rgba(255,159,100,0.1)" stroke="#FF9E64" strokeWidth="1.2" />
          <text x="585" y="203" textAnchor="middle" fill="#FF9E64" fontSize="11" fontWeight="600" fontFamily="IBM Plex Sans">Cloudflare</text>
          <text x="585" y="220" textAnchor="middle" fill="#9AA5CE" fontSize="9" fontFamily="DM Mono">Tunnel HTTPS</text>
          <text x="585" y="235" textAnchor="middle" fill="#9AA5CE" fontSize="9" fontFamily="DM Mono">trycloudflare.com</text>

          {/* Arrow Cloudflare → Mini PC */}
          <line x1="650" y1="210" x2="720" y2="210" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Mini PC Box */}
          <rect x="720" y="60" width="165" height="280" rx="10" fill="rgba(212,168,83,0.05)" stroke="rgba(212,168,83,0.3)" strokeWidth="1.5" strokeDasharray="6,3" />
          <text x="802" y="82" textAnchor="middle" fill="#D4A853" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">MINI PC (LOCAL)</text>

          {/* Ollama */}
          <rect x="732" y="90" width="141" height="60" rx="6" fill="rgba(158,206,106,0.1)" stroke="#9ECE6A" strokeWidth="1.2" />
          <text x="802" y="116" textAnchor="middle" fill="#9ECE6A" fontSize="11" fontWeight="600" fontFamily="IBM Plex Sans">Ollama</text>
          <text x="802" y="133" textAnchor="middle" fill="#9AA5CE" fontSize="9" fontFamily="DM Mono">:11434 · LLM Local</text>

          {/* DB Bridge */}
          <rect x="732" y="165" width="141" height="60" rx="6" fill="rgba(122,162,247,0.1)" stroke="#7AA2F7" strokeWidth="1.2" />
          <text x="802" y="191" textAnchor="middle" fill="#7AA2F7" fontSize="11" fontWeight="600" fontFamily="IBM Plex Sans">DB Bridge</text>
          <text x="802" y="208" textAnchor="middle" fill="#9AA5CE" fontSize="9" fontFamily="DM Mono">FastAPI · :8000</text>

          {/* PostgreSQL */}
          <rect x="732" y="240" width="141" height="60" rx="6" fill="rgba(224,175,104,0.1)" stroke="#E0AF68" strokeWidth="1.2" />
          <text x="802" y="266" textAnchor="middle" fill="#E0AF68" fontSize="11" fontWeight="600" fontFamily="IBM Plex Sans">PostgreSQL</text>
          <text x="802" y="283" textAnchor="middle" fill="#9AA5CE" fontSize="9" fontFamily="DM Mono">:5432 · pgvector</text>

          {/* Internal arrows Mini PC */}
          <line x1="802" y1="150" x2="802" y2="163" stroke="#565F89" strokeWidth="1" markerEnd="url(#arrow)" />
          <line x1="802" y1="225" x2="802" y2="238" stroke="#565F89" strokeWidth="1" markerEnd="url(#arrow)" />

          {/* Arrow markers */}
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#565F89" />
            </marker>
            <marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#7AA2F7" />
            </marker>
          </defs>
        </svg>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>02</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
