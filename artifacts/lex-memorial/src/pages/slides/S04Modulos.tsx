export default function S04Modulos() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#1A1B26", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", color: "#C0CAF5" }}>
      <div style={{ width: "22vw", height: "100vh", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "5vh 3vw", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "6vh" }}>
          <div style={{ width: "1.5vw", height: "1.5vw", background: "linear-gradient(135deg, #D4A853 50%, #3B82F6 50%)", borderRadius: "0.3vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#FFFFFF" }}>Lex Suite</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>Visão Geral</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", marginBottom: "3.5vh" }}>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>Arquitetura</div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.5 }}>Stack Tecnológica</div>
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Módulos
          </div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>Infraestrutura</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh", marginTop: "2.5vh" }}>Inteligência Artificial</div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2.5vh" }}>Banco & Segurança</div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "6vh 5vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1.5vh" }}>Visão Geral</div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 3vh 0", letterSpacing: "-0.02em" }}>Módulos da Plataforma</h1>
        <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
          {/* Lex Rural */}
          <div style={{ flex: 1, backgroundColor: "rgba(212,168,83,0.06)", border: "1px solid rgba(212,168,83,0.25)", borderRadius: "0.8vw", padding: "3vh 2.5vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "2.5vh" }}>
              <div style={{ width: "1vw", height: "1vw", backgroundColor: "#D4A853", borderRadius: "50%" }} />
              <div style={{ fontSize: "1.8vw", fontWeight: 700, color: "#D4A853" }}>Lex Rural</div>
            </div>
            <div style={{ fontSize: "1.1vw", color: "#9AA5CE", marginBottom: "3vh", lineHeight: 1.5 }}>Especializado em crédito agrícola, execuções rurais e defesa do produtor rural contra instituições financeiras.</div>
            <div style={{ fontSize: "0.9vw", color: "#D4A853", fontFamily: "'DM Mono', monospace", marginBottom: "1.5vh", fontWeight: 500 }}>CATEGORIAS DE WORKFLOWS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", backgroundColor: "#D4A853", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>Pré-Análise · Diagnóstico estratégico</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", backgroundColor: "#D4A853", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>Peças Processuais · Petições</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", backgroundColor: "#D4A853", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>Defesa Processual · Embargos</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", backgroundColor: "#D4A853", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>Renegociação · Alongamentos MCR</div>
              </div>
            </div>
            <div style={{ marginTop: "3vh", padding: "1.5vh 1.5vw", backgroundColor: "rgba(212,168,83,0.1)", borderRadius: "0.4vw" }}>
              <div style={{ fontSize: "0.9vw", color: "#D4A853", fontFamily: "'DM Mono', monospace" }}>module: "rural" · 12+ workflows</div>
            </div>
          </div>
          {/* Lex Executio */}
          <div style={{ flex: 1, backgroundColor: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "0.8vw", padding: "3vh 2.5vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "2.5vh" }}>
              <div style={{ width: "1vw", height: "1vw", backgroundColor: "#3B82F6", borderRadius: "50%" }} />
              <div style={{ fontSize: "1.8vw", fontWeight: 700, color: "#3B82F6" }}>Lex Executio</div>
            </div>
            <div style={{ fontSize: "1.1vw", color: "#9AA5CE", marginBottom: "3vh", lineHeight: 1.5 }}>Focado em defesa do executado no processo de execução civil, CPC/2015, SISBAJUD e impugnações processuais.</div>
            <div style={{ fontSize: "0.9vw", color: "#3B82F6", fontFamily: "'DM Mono', monospace", marginBottom: "1.5vh", fontWeight: 500 }}>CATEGORIAS DE WORKFLOWS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", backgroundColor: "#3B82F6", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>Defesas · Embargos à execução</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", backgroundColor: "#3B82F6", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>SISBAJUD · Desbloqueio e impugnação</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", backgroundColor: "#3B82F6", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>Penhora · Impenhorabilidade salarial</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", backgroundColor: "#3B82F6", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1vw", color: "#C0CAF5" }}>Análise de Acórdãos · STJ/TJs</div>
              </div>
            </div>
            <div style={{ marginTop: "3vh", padding: "1.5vh 1.5vw", backgroundColor: "rgba(59,130,246,0.1)", borderRadius: "0.4vw" }}>
              <div style={{ fontSize: "0.9vw", color: "#3B82F6", fontFamily: "'DM Mono', monospace" }}>module: "executio" · 6+ workflows</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "2vh", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>04</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
