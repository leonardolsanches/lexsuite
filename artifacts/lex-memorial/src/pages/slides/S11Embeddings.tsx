export default function S11Embeddings() {
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
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Embeddings
          </div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Pipeline RAG</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "1vh" }}>Banco & Segurança</div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "6vh 5vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1.5vh" }}>Inteligência Artificial</div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1.5vh 0", letterSpacing: "-0.02em" }}>Embeddings</h1>
        <p style={{ fontSize: "1.3vw", color: "#9AA5CE", lineHeight: 1.5, margin: "0 0 3vh 0", maxWidth: "44vw" }}>
          Representação vetorial de textos jurídicos. Permitem busca semântica por similaridade de contexto, não apenas palavras-chave.
        </p>
        <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
          <div style={{ flex: 1.2 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh", marginBottom: "2vh" }}>Modelos Disponíveis</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
              <div style={{ backgroundColor: "rgba(158,206,106,0.06)", border: "1px solid rgba(158,206,106,0.25)", borderRadius: "0.6vw", padding: "2vh 2vw" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1vh" }}>
                  <div style={{ fontSize: "1.1vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>nomic-embed-text</div>
                  <div style={{ fontSize: "0.9vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", backgroundColor: "rgba(158,206,106,0.15)", padding: "0.3vh 0.8vw", borderRadius: "0.3vw" }}>768 dims</div>
                </div>
                <div style={{ fontSize: "1vw", color: "#9AA5CE", lineHeight: 1.5 }}>Modelo padrão. Treinado em corpus multilingual. Ótimo desempenho em PT-BR jurídico. VRAM mínimo.</div>
                <div style={{ marginTop: "1vh", fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace" }}>ollama pull nomic-embed-text · ~274MB</div>
              </div>
              <div style={{ backgroundColor: "rgba(122,162,247,0.06)", border: "1px solid rgba(122,162,247,0.25)", borderRadius: "0.6vw", padding: "2vh 2vw" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1vh" }}>
                  <div style={{ fontSize: "1.1vw", color: "#7AA2F7", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>mxbai-embed-large</div>
                  <div style={{ fontSize: "0.9vw", color: "#7AA2F7", fontFamily: "'DM Mono', monospace", backgroundColor: "rgba(122,162,247,0.15)", padding: "0.3vh 0.8vw", borderRadius: "0.3vw" }}>1024 dims</div>
                </div>
                <div style={{ fontSize: "1vw", color: "#9AA5CE", lineHeight: 1.5 }}>Alta qualidade semântica. MTEB benchmark superior. Recomendado para corpus jurídico especializado.</div>
                <div style={{ marginTop: "1vh", fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace" }}>ollama pull mxbai-embed-large · ~669MB</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 0.8 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh", marginBottom: "2vh" }}>Como são gerados</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "2vh 1.5vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", lineHeight: 1.8, marginBottom: "2vh" }}>
              <div style={{ color: "#565F89" }}>// DB Bridge: POST /chunks/insert</div>
              <div style={{ color: "#C0CAF5", marginTop: "0.5vh" }}>{"{"}</div>
              <div style={{ paddingLeft: "1.5vw", color: "#7AA2F7" }}>"doc_id": <span style={{ color: "#E0AF68" }}>"abc123"</span>,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#7AA2F7" }}>"content": <span style={{ color: "#E0AF68" }}>"texto do chunk..."</span>,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#7AA2F7" }}>"embedding": <span style={{ color: "#9ECE6A" }}>[0.12, -0.34, ...]</span>,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#7AA2F7" }}>"module": <span style={{ color: "#E0AF68" }}>"rural"</span></div>
              <div style={{ color: "#C0CAF5" }}>{"}"}</div>
            </div>
            <div style={{ padding: "1.5vh 1.5vw", backgroundColor: "rgba(224,175,104,0.08)", border: "1px solid rgba(224,175,104,0.2)", borderRadius: "0.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#E0AF68", fontWeight: 600, marginBottom: "0.8vh" }}>Fluxo de Indexação</div>
              <div style={{ fontSize: "0.95vw", color: "#9AA5CE", lineHeight: 1.6 }}>
                Documento → split em chunks de 512 tokens → Ollama /api/embeddings → vetor float[] → POST /chunks/insert → pgvector
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "2vh", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>11</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
