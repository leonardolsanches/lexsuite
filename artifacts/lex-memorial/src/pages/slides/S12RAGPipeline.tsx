export default function S12RAGPipeline() {
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
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", marginBottom: "3.5vh" }}>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>Modelos LLM</div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>Embeddings</div>
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Pipeline RAG
          </div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "1vh" }}>Banco & Segurança</div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "5vh 4vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1vh" }}>Inteligência Artificial</div>
        <h1 style={{ fontSize: "3vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1vh 0", letterSpacing: "-0.02em" }}>Pipeline RAG — Retrieval-Augmented Generation</h1>
        <p style={{ fontSize: "1.2vw", color: "#9AA5CE", margin: "0 0 2.5vh 0" }}>Duas fases: indexação offline dos documentos e recuperação em tempo real durante análise jurídica.</p>
        {/* RAG Pipeline SVG */}
        <svg viewBox="0 0 900 290" style={{ width: "100%", flex: 1 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="ragArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#565F89" />
            </marker>
            <marker id="ragArrowG" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#9ECE6A" />
            </marker>
          </defs>

          {/* FASE 1: Indexação */}
          <rect x="0" y="0" width="900" height="120" rx="8" fill="rgba(122,162,247,0.04)" stroke="rgba(122,162,247,0.15)" strokeWidth="1" />
          <text x="12" y="18" fill="#7AA2F7" fontSize="9" fontWeight="700" fontFamily="IBM Plex Sans" textTransform="uppercase" letterSpacing="0.08em">FASE 1 — INDEXAÇÃO (offline)</text>

          {/* Box: Documento */}
          <rect x="15" y="28" width="100" height="72" rx="6" fill="rgba(224,175,104,0.12)" stroke="#E0AF68" strokeWidth="1.5" />
          <text x="65" y="58" textAnchor="middle" fill="#E0AF68" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Documento</text>
          <text x="65" y="74" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">PDF / TXT</text>
          <text x="65" y="88" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">acórdão, contrato</text>

          <line x1="115" y1="64" x2="150" y2="64" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#ragArrow)" />

          {/* Box: Chunks */}
          <rect x="150" y="28" width="100" height="72" rx="6" fill="rgba(158,206,106,0.1)" stroke="#9ECE6A" strokeWidth="1.5" />
          <text x="200" y="55" textAnchor="middle" fill="#9ECE6A" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Chunks</text>
          <text x="200" y="70" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">512 tokens</text>
          <text x="200" y="84" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">overlap 50t</text>

          <line x1="250" y1="64" x2="285" y2="64" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#ragArrow)" />

          {/* Box: Embed Model */}
          <rect x="285" y="28" width="115" height="72" rx="6" fill="rgba(122,162,247,0.1)" stroke="#7AA2F7" strokeWidth="1.5" />
          <text x="342" y="55" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Embed Model</text>
          <text x="342" y="70" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">nomic-embed-text</text>
          <text x="342" y="84" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">POST /api/embeddings</text>

          <line x1="400" y1="64" x2="440" y2="64" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#ragArrow)" />

          {/* Box: Vector [float] */}
          <rect x="440" y="28" width="110" height="72" rx="6" fill="rgba(158,206,106,0.08)" stroke="rgba(158,206,106,0.4)" strokeWidth="1.5" />
          <text x="495" y="55" textAnchor="middle" fill="#9ECE6A" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Vetor</text>
          <text x="495" y="70" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">float[768]</text>
          <text x="495" y="84" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">[0.12, -0.34...]</text>

          <line x1="550" y1="64" x2="585" y2="64" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#ragArrow)" />

          {/* Box: DB Bridge */}
          <rect x="585" y="28" width="100" height="72" rx="6" fill="rgba(122,162,247,0.1)" stroke="#7AA2F7" strokeWidth="1.5" />
          <text x="635" y="55" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">DB Bridge</text>
          <text x="635" y="70" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">POST</text>
          <text x="635" y="84" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">/chunks/insert</text>

          <line x1="685" y1="64" x2="720" y2="64" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#ragArrow)" />

          {/* Box: pgvector */}
          <rect x="720" y="28" width="165" height="72" rx="6" fill="rgba(224,175,104,0.1)" stroke="#E0AF68" strokeWidth="1.5" />
          <text x="802" y="55" textAnchor="middle" fill="#E0AF68" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">pgvector</text>
          <text x="802" y="70" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">chunks table</text>
          <text x="802" y="84" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">embedding column</text>

          {/* FASE 2: Recuperação */}
          <rect x="0" y="135" width="900" height="140" rx="8" fill="rgba(158,206,106,0.03)" stroke="rgba(158,206,106,0.15)" strokeWidth="1" />
          <text x="12" y="153" fill="#9ECE6A" fontSize="9" fontWeight="700" fontFamily="IBM Plex Sans" textTransform="uppercase" letterSpacing="0.08em">FASE 2 — RECUPERAÇÃO (em tempo real)</text>

          {/* Query do Usuário */}
          <rect x="15" y="162" width="105" height="96" rx="6" fill="rgba(122,162,247,0.1)" stroke="#7AA2F7" strokeWidth="1.5" />
          <text x="67" y="192" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Query</text>
          <text x="67" y="208" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">texto do usuário</text>
          <text x="67" y="222" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">+ dados do caso</text>
          <text x="67" y="238" textAnchor="middle" fill="#9AA5CE" fontSize="7.5" fontFamily="DM Mono">formulário preenchido</text>

          <line x1="120" y1="210" x2="155" y2="210" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#ragArrow)" />

          {/* Embed query */}
          <rect x="155" y="175" width="100" height="70" rx="6" fill="rgba(122,162,247,0.08)" stroke="rgba(122,162,247,0.3)" strokeWidth="1.5" />
          <text x="205" y="200" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Embed</text>
          <text x="205" y="215" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">query → vetor</text>
          <text x="205" y="230" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">float[768]</text>

          <line x1="255" y1="210" x2="290" y2="210" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#ragArrow)" />

          {/* Cosine Search */}
          <rect x="290" y="162" width="120" height="96" rx="6" fill="rgba(224,175,104,0.1)" stroke="#E0AF68" strokeWidth="1.5" />
          <text x="350" y="196" textAnchor="middle" fill="#E0AF68" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Cosine Search</text>
          <text x="350" y="212" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">1-(v1·v2)</text>
          <text x="350" y="226" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">top-k chunks</text>
          <text x="350" y="240" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">k=5, threshold</text>

          <line x1="410" y1="210" x2="445" y2="210" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#ragArrow)" />

          {/* Context */}
          <rect x="445" y="175" width="105" height="70" rx="6" fill="rgba(158,206,106,0.08)" stroke="rgba(158,206,106,0.3)" strokeWidth="1.5" />
          <text x="497" y="200" textAnchor="middle" fill="#9ECE6A" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Contexto</text>
          <text x="497" y="215" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">chunks relevantes</text>
          <text x="497" y="230" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">+ metadados</text>

          <line x1="550" y1="210" x2="585" y2="210" stroke="#565F89" strokeWidth="1.5" markerEnd="url(#ragArrow)" />

          {/* LLM + Prompt */}
          <rect x="585" y="162" width="120" height="96" rx="6" fill="rgba(158,206,106,0.1)" stroke="#9ECE6A" strokeWidth="1.5" />
          <text x="645" y="196" textAnchor="middle" fill="#9ECE6A" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">LLM (Ollama)</text>
          <text x="645" y="212" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">system prompt</text>
          <text x="645" y="226" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">+ contexto RAG</text>
          <text x="645" y="240" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">+ query usuário</text>

          <line x1="705" y1="210" x2="740" y2="210" stroke="#9ECE6A" strokeWidth="2" markerEnd="url(#ragArrowG)" />

          {/* Resposta */}
          <rect x="740" y="162" width="145" height="96" rx="6" fill="rgba(122,162,247,0.12)" stroke="#7AA2F7" strokeWidth="1.5" />
          <text x="812" y="196" textAnchor="middle" fill="#7AA2F7" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans">Resposta Jurídica</text>
          <text x="812" y="212" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">streaming SSE</text>
          <text x="812" y="226" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">fundamentada em</text>
          <text x="812" y="240" textAnchor="middle" fill="#9AA5CE" fontSize="8.5" fontFamily="DM Mono">documentos reais</text>
        </svg>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>12</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
