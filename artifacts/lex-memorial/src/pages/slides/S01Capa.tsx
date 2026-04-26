export default function S01Capa() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#1A1B26", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", color: "#C0CAF5" }}>
      {/* Left Sidebar */}
      <div style={{ width: "22vw", height: "100vh", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "5vh 3vw", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "6vh" }}>
          <div style={{ width: "1.5vw", height: "1.5vw", background: "linear-gradient(135deg, #D4A853 50%, #3B82F6 50%)", borderRadius: "0.3vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#FFFFFF" }}>Lex Suite</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>Visão Geral</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", marginBottom: "3.5vh" }}>
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
      {/* Main Content */}
      <div style={{ flex: 1, padding: "8vh 6vw", display: "flex", flexDirection: "column", position: "relative", background: "radial-gradient(ellipse at 80% 50%, rgba(122,162,247,0.07) 0%, transparent 60%)" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "2vh" }}>Memorial Descritivo Técnico</div>
        <h1 style={{ fontSize: "5.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 2.5vh 0", letterSpacing: "-0.03em", lineHeight: 1.1 }}>Lex Suite</h1>
        <p style={{ fontSize: "1.5vw", color: "#9AA5CE", lineHeight: 1.6, maxWidth: "38vw", margin: "0 0 6vh 0", fontWeight: 400 }}>
          Plataforma jurídica com IA local para advogados brasileiros. Dois módulos especializados com análise por LLM, RAG e banco vetorial.
        </p>
        <div style={{ display: "flex", gap: "2vw", marginBottom: "5vh" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1vw", padding: "1.5vh 2vw", backgroundColor: "rgba(212,168,83,0.12)", border: "1px solid rgba(212,168,83,0.3)", borderRadius: "0.5vw" }}>
            <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#D4A853", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.2vw", color: "#D4A853", fontWeight: 600 }}>Lex Rural</div>
            <div style={{ fontSize: "1vw", color: "#9AA5CE" }}>Crédito Agrícola</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1vw", padding: "1.5vh 2vw", backgroundColor: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "0.5vw" }}>
            <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#3B82F6", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.2vw", color: "#3B82F6", fontWeight: 600 }}>Lex Executio</div>
            <div style={{ fontSize: "1vw", color: "#9AA5CE" }}>Processo de Execução</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "3vw" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.1vw", color: "#C0CAF5" }}>Express 5 + Node.js</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#E0AF68", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.1vw", color: "#C0CAF5" }}>Ollama LLM Local</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.1vw", color: "#C0CAF5" }}>pgvector + RAG</div>
          </div>
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>01</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
