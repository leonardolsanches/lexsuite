export default function S10ModelosLLM() {
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
          <div style={{ fontSize: "1vw", color: "#7AA2F7", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <span style={{ width: "3px", height: "1.1vw", backgroundColor: "#7AA2F7", borderRadius: "2px", marginLeft: "-3vw" }} />
            Modelos LLM
          </div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Embeddings</div>
          <div style={{ fontSize: "1vw", color: "#C0CAF5", opacity: 0.6 }}>Pipeline RAG</div>
        </div>
        <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#565F89", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "1vh" }}>Banco & Segurança</div>
        <div style={{ marginTop: "auto", fontSize: "0.8vw", color: "#565F89" }}>v1.0 · 2025</div>
      </div>
      <div style={{ flex: 1, padding: "6vh 5vw", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1vw", color: "#7AA2F7", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "1.5vh" }}>Inteligência Artificial</div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 700, color: "#FFFFFF", margin: "0 0 1.5vh 0", letterSpacing: "-0.02em" }}>Modelos LLM — Comparativo</h1>
        <p style={{ fontSize: "1.2vw", color: "#9AA5CE", margin: "0 0 2.5vh 0" }}>Todos os modelos executados localmente via Ollama. Seleção por workflow conforme desempenho e requisitos de hardware.</p>
        {/* Table */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1.5fr", gap: "0", backgroundColor: "#16161E", borderRadius: "0.5vw 0.5vw 0 0", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ padding: "1.2vh 1.5vw", fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Modelo</div>
            <div style={{ padding: "1.2vh 1vw", fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Params</div>
            <div style={{ padding: "1.2vh 1vw", fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>VRAM</div>
            <div style={{ padding: "1.2vh 1vw", fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Velocidade</div>
            <div style={{ padding: "1.2vh 1vw", fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Qualidade</div>
            <div style={{ padding: "1.2vh 1vw", fontSize: "0.9vw", color: "#565F89", fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Uso Recomendado</div>
          </div>
          {/* Row 1 - Llama 3.1 8B */}
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1.5fr", border: "1px solid rgba(255,255,255,0.05)", borderTop: "none", backgroundColor: "rgba(158,206,106,0.04)" }}>
            <div style={{ padding: "1.5vh 1.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>llama3.1:8b</div>
              <div style={{ fontSize: "0.85vw", color: "#565F89" }}>Meta · Llama 3.1</div>
            </div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", fontSize: "1vw", color: "#C0CAF5", fontFamily: "'DM Mono', monospace", alignSelf: "center" }}>8B</div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", fontSize: "1vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", alignSelf: "center" }}>6 GB</div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", alignSelf: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.3vw" }}>
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(158,206,106,0.2)", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", alignSelf: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.3vw" }}>
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(122,162,247,0.2)", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(122,162,247,0.2)", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ padding: "1.5vh 1vw", fontSize: "0.9vw", color: "#9AA5CE", alignSelf: "center" }}>Análises rápidas, pré-análise</div>
          </div>
          {/* Row 2 - Llama 3.3 70B */}
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1.5fr", border: "1px solid rgba(255,255,255,0.05)", borderTop: "none", backgroundColor: "rgba(122,162,247,0.04)" }}>
            <div style={{ padding: "1.5vh 1.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#7AA2F7", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>llama3.3:70b</div>
              <div style={{ fontSize: "0.85vw", color: "#565F89" }}>Meta · Llama 3.3</div>
            </div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", fontSize: "1vw", color: "#C0CAF5", fontFamily: "'DM Mono', monospace", alignSelf: "center" }}>70B</div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", fontSize: "1vw", color: "#FF9E64", fontFamily: "'DM Mono', monospace", alignSelf: "center" }}>40 GB</div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", alignSelf: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.3vw" }}>
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(158,206,106,0.2)", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(158,206,106,0.2)", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(158,206,106,0.2)", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(158,206,106,0.2)", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", alignSelf: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.3vw" }}>
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ padding: "1.5vh 1vw", fontSize: "0.9vw", color: "#9AA5CE", alignSelf: "center" }}>Peças processuais complexas</div>
          </div>
          {/* Row 3 - Mistral 7B */}
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1.5fr", border: "1px solid rgba(255,255,255,0.05)", borderTop: "none" }}>
            <div style={{ padding: "1.5vh 1.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>mistral:7b</div>
              <div style={{ fontSize: "0.85vw", color: "#565F89" }}>Mistral AI</div>
            </div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", fontSize: "1vw", color: "#C0CAF5", fontFamily: "'DM Mono', monospace", alignSelf: "center" }}>7B</div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", fontSize: "1vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", alignSelf: "center" }}>5 GB</div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", alignSelf: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.3vw" }}>
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(158,206,106,0.2)", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", alignSelf: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.3vw" }}>
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(122,162,247,0.2)", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(122,162,247,0.2)", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ padding: "1.5vh 1vw", fontSize: "0.9vw", color: "#9AA5CE", alignSelf: "center" }}>Balanced — bom custo-benefício</div>
          </div>
          {/* Row 4 - Qwen 2.5 14B */}
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1.5fr", border: "1px solid rgba(255,255,255,0.05)", borderTop: "none", backgroundColor: "rgba(224,175,104,0.04)" }}>
            <div style={{ padding: "1.5vh 1.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>qwen2.5:14b</div>
              <div style={{ fontSize: "0.85vw", color: "#565F89" }}>Alibaba · Qwen 2.5</div>
            </div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", fontSize: "1vw", color: "#C0CAF5", fontFamily: "'DM Mono', monospace", alignSelf: "center" }}>14B</div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", fontSize: "1vw", color: "#E0AF68", fontFamily: "'DM Mono', monospace", alignSelf: "center" }}>9 GB</div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", alignSelf: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.3vw" }}>
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(158,206,106,0.2)", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(158,206,106,0.2)", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", alignSelf: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.3vw" }}>
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(122,162,247,0.2)", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ padding: "1.5vh 1vw", fontSize: "0.9vw", color: "#9AA5CE", alignSelf: "center" }}>Melhor PT-BR · contratos rurais</div>
          </div>
          {/* Row 5 - Phi-3.5 */}
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1.5fr", border: "1px solid rgba(255,255,255,0.05)", borderTop: "none", borderRadius: "0 0 0.5vw 0.5vw" }}>
            <div style={{ padding: "1.5vh 1.5vw" }}>
              <div style={{ fontSize: "1vw", color: "#9AA5CE", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>phi3.5:mini</div>
              <div style={{ fontSize: "0.85vw", color: "#565F89" }}>Microsoft · Phi-3.5</div>
            </div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", fontSize: "1vw", color: "#C0CAF5", fontFamily: "'DM Mono', monospace", alignSelf: "center" }}>3.8B</div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", fontSize: "1vw", color: "#9ECE6A", fontFamily: "'DM Mono', monospace", alignSelf: "center" }}>3 GB</div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", alignSelf: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.3vw" }}>
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#9ECE6A", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ padding: "1.5vh 1vw", textAlign: "center", alignSelf: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.3vw" }}>
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "#7AA2F7", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(122,162,247,0.2)", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(122,162,247,0.2)", borderRadius: "2px" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", backgroundColor: "rgba(122,162,247,0.2)", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ padding: "1.5vh 1vw", fontSize: "0.9vw", color: "#9AA5CE", alignSelf: "center" }}>Testes, dev, baixo hardware</div>
          </div>
        </div>
        <div style={{ marginTop: "2vh", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1vw", color: "#565F89", fontWeight: 500 }}>10</div>
          <div style={{ fontSize: "0.9vw", color: "#565F89" }}>Lex Suite · Memorial Descritivo</div>
        </div>
      </div>
    </div>
  );
}
