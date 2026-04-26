export default function S09FluxoRenderMiniPC() {
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
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>Cloudflare Tunnel</div>
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Fluxo Completo
          </div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "1vh" }}>Inteligência Artificial</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2.5vh" }}>Banco & Segurança</div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "5vh 4vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1vh" }}>Infraestrutura</div>
        <h1 style={{ fontSize: "3vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1vh 0", letterSpacing: "-0.02em" }}>Fluxo Completo: Render ↔ Mini PC</h1>
        <p style={{ fontSize: "1.2vw", color: "#9AA5CE", margin: "0 0 2vh 0" }}>Ciclo de vida de uma requisição de análise jurídica do browser até o streaming de resposta.</p>
        {/* Flow SVG */}
        <svg viewBox="0 0 940 370" style={{ width: "100%", flex: 1 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrowW" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#565F89" />
            </marker>
            <marker id="arrowG" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#9ECE6A" />
            </marker>
            <marker id="arrowO" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#E0AF68" />
            </marker>
          </defs>

          {/* Step labels row */}
          {/* STEP 1: Browser */}
          <rect x="5" y="30" width="100" height="56" rx="7" fill="rgba(122,162,247,0.12)" stroke="#7AA2F7" strokeWidth="1.5" />
          <text x="55" y="54" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Browser</text>
          <text x="55" y="70" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">POST /api/analyze</text>
          <text x="55" y="82" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">Bearer JWT</text>

          {/* Arrow 1→2 */}
          <line x1="105" y1="58" x2="155" y2="58" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#arrowW)" />

          {/* STEP 2: Render API */}
          <rect x="155" y="30" width="120" height="56" rx="7" fill="rgba(224,175,104,0.12)" stroke="#E0AF68" strokeWidth="1.5" />
          <text x="215" y="52" textAnchor="middle" fill="#E0AF68" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Render API</text>
          <text x="215" y="67" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">Express 5</text>
          <text x="215" y="80" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">clerkMiddleware</text>

          {/* Arrow 2→Clerk */}
          <line x1="215" y1="86" x2="215" y2="126" stroke="#7AA2F7" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowW)" />

          {/* Clerk Auth box */}
          <rect x="155" y="126" width="120" height="44" rx="6" fill="rgba(122,162,247,0.08)" stroke="rgba(122,162,247,0.4)" strokeWidth="1.2" />
          <text x="215" y="146" textAnchor="middle" fill="#7AA2F7" fontSize="9.5" fontWeight="600" fontFamily="IBM Plex Sans">Clerk Auth</text>
          <text x="215" y="161" textAnchor="middle" fill="#9AA5CE" fontSize="8" fontFamily="DM Mono">JWT valid → userId</text>

          {/* Arrow back up from Clerk */}
          <line x1="230" y1="126" x2="230" y2="86" stroke="#7AA2F7" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowW)" />

          {/* Arrow 2→DB Bridge (prompt fetch) */}
          <line x1="275" y1="55" x2="345" y2="55" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#arrowW)" />
          <text x="310" y="48" textAnchor="middle" fill="#9ECE6A" fontSize="8" fontFamily="DM Mono">GET prompt</text>

          {/* STEP 3: Cloudflare Tunnel */}
          <rect x="345" y="30" width="115" height="56" rx="7" fill="rgba(255,158,100,0.1)" stroke="#FF9E64" strokeWidth="1.5" />
          <text x="402" y="52" textAnchor="middle" fill="#FF9E64" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Cloudflare</text>
          <text x="402" y="67" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">Tunnel HTTPS</text>
          <text x="402" y="80" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">trycloudflare.com</text>

          {/* Arrow Tunnel → DB Bridge */}
          <line x1="460" y1="58" x2="520" y2="58" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#arrowW)" />

          {/* STEP 4: DB Bridge */}
          <rect x="520" y="30" width="110" height="56" rx="7" fill="rgba(122,162,247,0.1)" stroke="#7AA2F7" strokeWidth="1.5" />
          <text x="575" y="52" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">DB Bridge</text>
          <text x="575" y="67" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">FastAPI :8000</text>
          <text x="575" y="80" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">POST /query</text>

          {/* DB Bridge → PostgreSQL */}
          <line x1="575" y1="86" x2="575" y2="126" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#arrowW)" />

          {/* PostgreSQL */}
          <rect x="520" y="126" width="110" height="44" rx="6" fill="rgba(224,175,104,0.1)" stroke="#E0AF68" strokeWidth="1.5" />
          <text x="575" y="146" textAnchor="middle" fill="#E0AF68" fontSize="9.5" fontWeight="600" fontFamily="IBM Plex Sans">PostgreSQL</text>
          <text x="575" y="161" textAnchor="middle" fill="#9AA5CE" fontSize="8" fontFamily="DM Mono">SELECT prompt → rows</text>

          {/* PostgreSQL → DB Bridge return */}
          <line x1="560" y1="126" x2="560" y2="86" stroke="#9ECE6A" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowG)" />

          {/* Render API → Cloudflare (Ollama call) */}
          <line x1="275" y1="70" x2="345" y2="70" stroke="#9ECE6A" strokeWidth="1.2" strokeDasharray="4,3" />
          <text x="310" y="80" textAnchor="middle" fill="#9ECE6A" fontSize="8" fontFamily="DM Mono">Ollama call</text>

          {/* Second tunnel box for Ollama */}
          {/* Arrow Cloudflare → Ollama */}
          <line x1="460" y1="73" x2="660" y2="73" stroke="#9ECE6A" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowG)" />

          {/* STEP 5: Ollama */}
          <rect x="660" y="30" width="120" height="56" rx="7" fill="rgba(158,206,106,0.1)" stroke="#9ECE6A" strokeWidth="1.5" />
          <text x="720" y="52" textAnchor="middle" fill="#9ECE6A" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Ollama LLM</text>
          <text x="720" y="67" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">:11434 local</text>
          <text x="720" y="80" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">POST /api/generate</text>

          {/* SECOND HALF: Response path — bottom half */}
          {/* Labels */}
          <text x="55" y="208" textAnchor="middle" fill="#565F89" fontSize="8.5" fontFamily="DM Mono" fontStyle="italic">browser</text>
          <text x="215" y="208" textAnchor="middle" fill="#565F89" fontSize="8.5" fontFamily="DM Mono" fontStyle="italic">render api</text>
          <text x="402" y="208" textAnchor="middle" fill="#565F89" fontSize="8.5" fontFamily="DM Mono" fontStyle="italic">cloudflare</text>
          <text x="720" y="208" textAnchor="middle" fill="#565F89" fontSize="8.5" fontFamily="DM Mono" fontStyle="italic">ollama</text>

          {/* Streaming response path (bottom) */}
          <text x="470" y="225" textAnchor="middle" fill="#9ECE6A" fontSize="9" fontWeight="600" fontFamily="IBM Plex Sans">streaming response (SSE/chunks)</text>

          {/* Ollama stream → Cloudflare → API → Browser */}
          <line x1="660" y1="235" x2="460" y2="235" stroke="#9ECE6A" strokeWidth="2" markerEnd="url(#arrowG)" />
          <line x1="345" y1="235" x2="275" y2="235" stroke="#9ECE6A" strokeWidth="2" markerEnd="url(#arrowG)" />
          <line x1="155" y1="235" x2="105" y2="235" stroke="#9ECE6A" strokeWidth="2" markerEnd="url(#arrowG)" />

          {/* Render API box (bottom) */}
          <rect x="155" y="215" width="120" height="40" rx="6" fill="rgba(224,175,104,0.08)" stroke="rgba(224,175,104,0.3)" strokeWidth="1.2" />
          <text x="215" y="232" textAnchor="middle" fill="#E0AF68" fontSize="9" fontWeight="600" fontFamily="IBM Plex Sans">Render API</text>
          <text x="215" y="247" textAnchor="middle" fill="#9AA5CE" fontSize="7.5" fontFamily="DM Mono">pipe → res (SSE)</text>

          {/* Cloudflare box (bottom) */}
          <rect x="345" y="215" width="115" height="40" rx="6" fill="rgba(255,158,100,0.08)" stroke="rgba(255,158,100,0.3)" strokeWidth="1.2" />
          <text x="402" y="232" textAnchor="middle" fill="#FF9E64" fontSize="9" fontWeight="600" fontFamily="IBM Plex Sans">Cloudflare</text>
          <text x="402" y="247" textAnchor="middle" fill="#9AA5CE" fontSize="7.5" fontFamily="DM Mono">proxy transparente</text>

          {/* Ollama box (bottom) */}
          <rect x="660" y="215" width="120" height="40" rx="6" fill="rgba(158,206,106,0.08)" stroke="rgba(158,206,106,0.3)" strokeWidth="1.2" />
          <text x="720" y="232" textAnchor="middle" fill="#9ECE6A" fontSize="9" fontWeight="600" fontFamily="IBM Plex Sans">Ollama</text>
          <text x="720" y="247" textAnchor="middle" fill="#9AA5CE" fontSize="7.5" fontFamily="DM Mono">stream: true</text>

          {/* Browser final */}
          <rect x="5" y="215" width="100" height="40" rx="6" fill="rgba(122,162,247,0.1)" stroke="rgba(122,162,247,0.4)" strokeWidth="1.2" />
          <text x="55" y="232" textAnchor="middle" fill="#7AA2F7" fontSize="9" fontWeight="600" fontFamily="IBM Plex Sans">Browser</text>
          <text x="55" y="247" textAnchor="middle" fill="#9AA5CE" fontSize="7.5" fontFamily="DM Mono">render stream UI</text>

          {/* Legend */}
          <rect x="5" y="290" width="920" height="70" rx="8" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x="20" y="308" fill="#565F89" fontSize="9" fontFamily="IBM Plex Sans" fontWeight="600">LEGENDA</text>
          <line x1="80" y1="307" x2="120" y2="307" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#arrowW)" />
          <text x="125" y="311" fill="#9AA5CE" fontSize="9" fontFamily="IBM Plex Sans">Requisição (request)</text>
          <line x1="270" y1="307" x2="310" y2="307" stroke="#9ECE6A" strokeWidth="1.5" markerEnd="url(#arrowG)" />
          <text x="315" y="311" fill="#9AA5CE" fontSize="9" fontFamily="IBM Plex Sans">Resposta/Streaming</text>
          <line x1="460" y1="307" x2="500" y2="307" stroke="#7AA2F7" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#arrowW)" />
          <text x="505" y="311" fill="#9AA5CE" fontSize="9" fontFamily="IBM Plex Sans">Auth/JWT (Clerk)</text>

          <text x="20" y="348" fill="#9AA5CE" fontSize="9" fontFamily="IBM Plex Sans">Latência típica: 2-5s até primeiro token · Throughput: depende do modelo e hardware do Mini PC · DB Bridge timeout: 30s</text>
        </svg>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>09</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
