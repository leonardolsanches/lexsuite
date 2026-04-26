export default function S13pgvector() {
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
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            pgvector
          </div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Autenticação Clerk</div>
        </div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "6vh 5vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1.5vh" }}>Banco de Dados</div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1.5vh 0", letterSpacing: "-0.02em" }}>pgvector — Banco Vetorial</h1>
        <p style={{ fontSize: "1.3vw", color: "#9AA5CE", lineHeight: 1.5, margin: "0 0 2.5vh 0", maxWidth: "44vw" }}>
          Extensão do PostgreSQL para armazenamento e busca por similaridade de vetores. Elimina a necessidade de banco vetorial externo.
        </p>
        <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
          <div style={{ flex: 1.1 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh", marginBottom: "2vh" }}>Schema — Tabela chunks</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "2vh 2vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", lineHeight: 1.8 }}>
              <div style={{ color: "#7AA2F7" }}>CREATE TABLE <span style={{ color: "#9ECE6A" }}>chunks</span> {"("}</div>
              <div style={{ paddingLeft: "1.5vw", color: "#C0CAF5" }}>id          <span style={{ color: "#E0AF68" }}>SERIAL PRIMARY KEY</span>,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#C0CAF5" }}>doc_id      <span style={{ color: "#E0AF68" }}>TEXT NOT NULL</span>,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#C0CAF5" }}>user_id     <span style={{ color: "#E0AF68" }}>TEXT NOT NULL</span>,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#C0CAF5" }}>content     <span style={{ color: "#E0AF68" }}>TEXT NOT NULL</span>,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#7AA2F7" }}>embedding   <span style={{ color: "#9ECE6A" }}>VECTOR(768)</span>,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#C0CAF5" }}>module      <span style={{ color: "#E0AF68" }}>TEXT</span>,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#C0CAF5" }}>chunk_index <span style={{ color: "#E0AF68" }}>INT</span>,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#C0CAF5" }}>created_at  <span style={{ color: "#E0AF68" }}>TIMESTAMPTZ DEFAULT NOW()</span></div>
              <div style={{ color: "#7AA2F7" }}>{")"}</div>
              <div style={{ color: "#7AA2F7", marginTop: "1vh" }}>CREATE EXTENSION IF NOT EXISTS <span style={{ color: "#9ECE6A" }}>vector</span></div>
            </div>
            <div style={{ marginTop: "1.5vh" }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh", marginBottom: "1.5vh" }}>Índice para busca eficiente</div>
              <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "1.5vh 2vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", lineHeight: 1.7 }}>
                <div style={{ color: "#7AA2F7" }}>CREATE INDEX ON <span style={{ color: "#9ECE6A" }}>chunks</span></div>
                <div style={{ color: "#C0CAF5", paddingLeft: "1.5vw" }}>USING <span style={{ color: "#E0AF68" }}>ivfflat</span> {"("}<span style={{ color: "#7AA2F7" }}>embedding</span>{")"}</div>
                <div style={{ color: "#C0CAF5", paddingLeft: "1.5vw" }}>WITH {"("}<span style={{ color: "#FF9E64" }}>lists = 100</span>{")"}</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 0.9 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1vh", marginBottom: "2vh" }}>Busca por Similaridade</div>
            <div style={{ backgroundColor: "#16161E", borderRadius: "0.5vw", padding: "2vh 2vw", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", lineHeight: 1.8, marginBottom: "2vh" }}>
              <div style={{ color: "#565F89" }}>-- DB Bridge: POST /chunks/search</div>
              <div style={{ color: "#7AA2F7", marginTop: "0.5vh" }}>SELECT</div>
              <div style={{ paddingLeft: "1.5vw", color: "#C0CAF5" }}>content, doc_id,</div>
              <div style={{ paddingLeft: "1.5vw", color: "#9ECE6A" }}>1 - (embedding <span style={{ color: "#7AA2F7" }}>{"<=>"}</span> $1)</div>
              <div style={{ paddingLeft: "2.5vw", color: "#9ECE6A" }}>AS <span style={{ color: "#C0CAF5" }}>similarity</span></div>
              <div style={{ color: "#7AA2F7" }}>FROM <span style={{ color: "#9ECE6A" }}>chunks</span></div>
              <div style={{ color: "#7AA2F7" }}>WHERE <span style={{ color: "#C0CAF5" }}>user_id = $2</span></div>
              <div style={{ color: "#7AA2F7" }}>ORDER BY</div>
              <div style={{ paddingLeft: "1.5vw", color: "#C0CAF5" }}>embedding <span style={{ color: "#7AA2F7" }}>{"<=>"}</span> $1</div>
              <div style={{ color: "#7AA2F7" }}>LIMIT <span style={{ color: "#FF9E64" }}>5</span></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
              <div style={{ padding: "1.2vh 1.5vw", backgroundColor: "rgba(122,162,247,0.08)", border: "1px solid rgba(122,162,247,0.2)", borderRadius: "0.4vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#7AA2F7", fontFamily: "'DM Mono', monospace" }}>{"<=>"}  Distância cosseno</div>
              </div>
              <div style={{ padding: "1.2vh 1.5vw", backgroundColor: "rgba(158,206,106,0.08)", border: "1px solid rgba(158,206,106,0.2)", borderRadius: "0.4vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace" }}>{"<#>"}  Produto interno</div>
              </div>
              <div style={{ padding: "1.2vh 1.5vw", backgroundColor: "rgba(224,175,104,0.08)", border: "1px solid rgba(224,175,104,0.2)", borderRadius: "0.4vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace" }}>{"<->"}  Distância euclidiana</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "2vh", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>13</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
