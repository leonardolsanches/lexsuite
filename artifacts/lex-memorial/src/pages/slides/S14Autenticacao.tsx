export default function S14Autenticacao() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#1A1B26", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", color: "#C0CAF5" }}>
      <div style={{ width: "22vw", height: "100vh", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "5vh 3vw", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "6vh" }}>
          <div style={{ width: "1.5vw", height: "1.5vw", background: "linear-gradient(135deg, #D4A853 50%, #3B82F6 50%)", borderRadius: "0.3vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#FFFFFF" }}>Lex Suite</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>Visão Geral</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "2.5vh" }}>Infraestrutura</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "2.5vh" }}>Inteligência Artificial</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "2.5vh" }}>Banco & Segurança</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", marginBottom: "3.5vh" }}>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>pgvector</div>
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Autenticação Clerk
          </div>
        </div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "6vh 5vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1.5vh" }}>Segurança</div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1.5vh 0", letterSpacing: "-0.02em" }}>Autenticação — Clerk</h1>
        <p style={{ fontSize: "1.3vw", color: "#9AA5CE", lineHeight: 1.5, margin: "0 0 2.5vh 0", maxWidth: "44vw" }}>
          Clerk (dev instance) gerencia login/signup. Cada request carrega Bearer JWT validado pelo Express antes de qualquer acesso aos dados.
        </p>
        <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
          {/* Auth Flow SVG */}
          <div style={{ flex: 1.3 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh", marginBottom: "2vh" }}>Fluxo de Autenticação</div>
            <svg viewBox="0 0 480 300" style={{ width: "100%", height: "auto" }} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker id="authArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#565F89" />
                </marker>
                <marker id="authArrowB" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#7AA2F7" />
                </marker>
                <marker id="authArrowG" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#9ECE6A" />
                </marker>
              </defs>
              {/* Step 1: Usuário faz login */}
              <rect x="5" y="10" width="110" height="55" rx="6" fill="rgba(122,162,247,0.12)" stroke="#7AA2F7" strokeWidth="1.5" />
              <text x="60" y="34" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Usuário</text>
              <text x="60" y="50" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">email + senha</text>

              <line x1="115" y1="37" x2="160" y2="37" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#authArrow)" />
              <text x="137" y="30" textAnchor="middle" fill="#565F89" fontSize="8" fontFamily="DM Mono">login()</text>

              {/* Step 2: Clerk */}
              <rect x="160" y="10" width="110" height="55" rx="6" fill="rgba(122,162,247,0.1)" stroke="#7AA2F7" strokeWidth="1.5" />
              <text x="215" y="34" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Clerk</text>
              <text x="215" y="50" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">pk_test_... instance</text>

              <line x1="270" y1="37" x2="315" y2="37" stroke="#9ECE6A" strokeWidth="1.5" markerEnd="url(#authArrowG)" />
              <text x="292" y="30" textAnchor="middle" fill="#9ECE6A" fontSize="8" fontFamily="DM Mono">JWT token</text>

              {/* Step 3: Frontend armazena token */}
              <rect x="315" y="10" width="155" height="55" rx="6" fill="rgba(158,206,106,0.08)" stroke="rgba(158,206,106,0.3)" strokeWidth="1.5" />
              <text x="392" y="30" textAnchor="middle" fill="#9ECE6A" fontSize="9" fontWeight="600" fontFamily="IBM Plex Sans">setAuthTokenGetter</text>
              <text x="392" y="46" textAnchor="middle" fill="#9AA5CE" fontSize="8" fontFamily="DM Mono">() ={">"} clerk.session.getToken()</text>

              {/* Step 4: API Request */}
              <rect x="5" y="105" width="200" height="55" rx="6" fill="rgba(224,175,104,0.08)" stroke="rgba(224,175,104,0.3)" strokeWidth="1.5" />
              <text x="105" y="125" textAnchor="middle" fill="#E0AF68" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">API Request</text>
              <text x="105" y="141" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">Authorization: Bearer {"<JWT>"}</text>

              <line x1="205" y1="132" x2="250" y2="132" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#authArrow)" />

              {/* Step 5: clerkMiddleware */}
              <rect x="250" y="105" width="220" height="55" rx="6" fill="rgba(122,162,247,0.1)" stroke="#7AA2F7" strokeWidth="1.5" />
              <text x="360" y="125" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">clerkMiddleware</text>
              <text x="360" y="141" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">verifica assinatura JWT</text>

              {/* Step 6: requireAuth */}
              <rect x="5" y="200" width="200" height="55" rx="6" fill="rgba(122,162,247,0.08)" stroke="rgba(122,162,247,0.3)" strokeWidth="1.5" />
              <text x="105" y="220" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">requireAuth()</text>
              <text x="105" y="236" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">getAuth(req) → userId</text>

              {/* Step 7: getOrCreateUser */}
              <rect x="250" y="200" width="220" height="55" rx="6" fill="rgba(158,206,106,0.1)" stroke="#9ECE6A" strokeWidth="1.5" />
              <text x="360" y="220" textAnchor="middle" fill="#9ECE6A" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">getOrCreateUser</text>
              <text x="360" y="236" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">DB Bridge → users table</text>

              {/* Arrows */}
              <line x1="105" y1="160" x2="105" y2="198" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#authArrow)" />
              <line x1="360" y1="160" x2="360" y2="198" stroke="#7AA2F7" strokeWidth="1.5" markerEnd="url(#authArrowB)" />
              <line x1="205" y1="227" x2="248" y2="227" stroke="#7AA2F7" strokeWidth="1.5" markerEnd="url(#authArrowB)" />
              <line x1="392" y1="65" x2="392" y2="104" stroke="#565F89" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#authArrow)" />
              <line x1="215" y1="65" x2="215" y2="104" stroke="#565F89" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#authArrow)" />
            </svg>
          </div>
          {/* Details */}
          <div style={{ flex: 0.7, display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh" }}>Tabela users</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", lineHeight: 1.8 }}>
              <div style={{ color: "#7AA2F7" }}>id       <span style={{ color: "#E0AF68" }}>TEXT PK</span>  <span style={{ color: "#565F89" }}>(Clerk userId)</span></div>
              <div style={{ color: "#7AA2F7" }}>email    <span style={{ color: "#E0AF68" }}>TEXT</span></div>
              <div style={{ color: "#7AA2F7" }}>name     <span style={{ color: "#E0AF68" }}>TEXT</span></div>
              <div style={{ color: "#7AA2F7" }}>role     <span style={{ color: "#E0AF68" }}>TEXT</span>  <span style={{ color: "#565F89" }}>DEFAULT 'user'</span></div>
              <div style={{ color: "#7AA2F7" }}>created_at <span style={{ color: "#E0AF68" }}>TIMESTAMPTZ</span></div>
            </div>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh" }}>Tabela user_modules</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", lineHeight: 1.8 }}>
              <div style={{ color: "#7AA2F7" }}>id       <span style={{ color: "#E0AF68" }}>SERIAL PK</span></div>
              <div style={{ color: "#7AA2F7" }}>user_id  <span style={{ color: "#E0AF68" }}>TEXT FK</span></div>
              <div style={{ color: "#7AA2F7" }}>module   <span style={{ color: "#E0AF68" }}>TEXT</span>   <span style={{ color: "#565F89" }}>'rural'|'executio'</span></div>
              <div style={{ color: "#9ECE6A" }}>UNIQUE(user_id, module)</div>
            </div>
            <div style={{ padding: "1.5vh 1.5vw", backgroundColor: "rgba(255,158,100,0.08)", border: "1px solid rgba(255,158,100,0.2)", borderRadius: "0.5vw" }}>
              <div style={{ fontSize: "0.95vw", color: "#FF9E64", fontWeight: 600, marginBottom: "0.5vh" }}>401 Retry Logic</div>
              <div style={{ fontSize: "0.9vw", color: "#9AA5CE", lineHeight: 1.5 }}>
                QueryClient: retry 401 até 2x com 500ms delay. Token refrescado via getToken() síncrono antes de cada request.
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "2vh", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>14</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
