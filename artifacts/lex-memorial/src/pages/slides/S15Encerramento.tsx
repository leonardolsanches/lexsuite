export default function S15Encerramento() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#1A1B26", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", color: "#C0CAF5", background: "radial-gradient(ellipse at 50% 40%, rgba(122,162,247,0.08) 0%, transparent 65%)" }}>
      <div style={{ flex: 1, padding: "8vh 10vw", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", marginBottom: "5vh" }}>
          <div style={{ width: "3.5vw", height: "3.5vw", background: "linear-gradient(135deg, #D4A853 50%, #3B82F6 50%)", borderRadius: "0.8vw" }} />
          <div style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em" }}>Lex Suite</div>
        </div>
        <h2 style={{ fontSize: "2vw", fontWeight: 600, color: "#7AA2F7", margin: "0 0 1.5vh 0", textAlign: "center", letterSpacing: "0.02em" }}>
          Memorial Descritivo Técnico — Sumário Executivo
        </h2>
        <p style={{ fontSize: "1.4vw", color: "#9AA5CE", textAlign: "center", maxWidth: "52vw", lineHeight: 1.7, margin: "0 0 6vh 0" }}>
          Plataforma jurídica completa com IA local, custo zero de API LLM, privacidade dos dados do cliente e infraestrutura resiliente na nuvem.
        </p>
        {/* 4-column summary grid */}
        <div style={{ display: "flex", gap: "2vw", marginBottom: "6vh", width: "100%", maxWidth: "70vw" }}>
          <div style={{ flex: 1, backgroundColor: "rgba(122,162,247,0.06)", border: "1px solid rgba(122,162,247,0.2)", borderRadius: "0.8vw", padding: "2.5vh 2vw", textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 700, color: "#7AA2F7", marginBottom: "1vh" }}>2</div>
            <div style={{ fontSize: "1.1vw", color: "#FFFFFF", fontWeight: 600, marginBottom: "0.5vh" }}>Módulos</div>
            <div style={{ fontSize: "0.95vw", color: "#9AA5CE" }}>Lex Rural · Lex Executio</div>
          </div>
          <div style={{ flex: 1, backgroundColor: "rgba(158,206,106,0.06)", border: "1px solid rgba(158,206,106,0.2)", borderRadius: "0.8vw", padding: "2.5vh 2vw", textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 700, color: "#9ECE6A", marginBottom: "1vh" }}>5</div>
            <div style={{ fontSize: "1.1vw", color: "#FFFFFF", fontWeight: 600, marginBottom: "0.5vh" }}>Modelos LLM</div>
            <div style={{ fontSize: "0.95vw", color: "#9AA5CE" }}>Llama · Mistral · Qwen · Phi</div>
          </div>
          <div style={{ flex: 1, backgroundColor: "rgba(224,175,104,0.06)", border: "1px solid rgba(224,175,104,0.2)", borderRadius: "0.8vw", padding: "2.5vh 2vw", textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 700, color: "#E0AF68", marginBottom: "1vh" }}>768</div>
            <div style={{ fontSize: "1.1vw", color: "#FFFFFF", fontWeight: 600, marginBottom: "0.5vh" }}>Dimensões</div>
            <div style={{ fontSize: "0.95vw", color: "#9AA5CE" }}>nomic-embed-text · pgvector</div>
          </div>
          <div style={{ flex: 1, backgroundColor: "rgba(212,168,83,0.06)", border: "1px solid rgba(212,168,83,0.2)", borderRadius: "0.8vw", padding: "2.5vh 2vw", textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 700, color: "#D4A853", marginBottom: "1vh" }}>R$0</div>
            <div style={{ fontSize: "1.1vw", color: "#FFFFFF", fontWeight: 600, marginBottom: "0.5vh" }}>Custo LLM</div>
            <div style={{ fontSize: "0.95vw", color: "#9AA5CE" }}>Ollama local · sem API paga</div>
          </div>
        </div>
        {/* Key decisions */}
        <div style={{ display: "flex", gap: "4vw", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "4vh", width: "100%", maxWidth: "70vw", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.1vw", color: "#C0CAF5" }}>Express 5 + React 19</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.1vw", color: "#C0CAF5" }}>Clerk Auth · JWT</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#E0AF68", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.1vw", color: "#C0CAF5" }}>DB Bridge FastAPI</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#FF9E64", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.1vw", color: "#C0CAF5" }}>Cloudflare Tunnel</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#D4A853", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.1vw", color: "#C0CAF5" }}>RAG + pgvector</div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ position: "absolute", bottom: "5vh", left: "10vw", right: "10vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>15</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo Técnico · 2025</div>
        </div>
      </div>
    </div>
  );
}
