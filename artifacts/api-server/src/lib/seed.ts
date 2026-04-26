import { db, workflowsTable, promptsTable } from "@workspace/db";
import { logger } from "./logger";

const LEX_RURAL_WORKFLOWS = [
  {
    key: "rural_diagnostico",
    name: "Diagnóstico Estratégico",
    subtitle: "Análise completa da operação",
    module: "rural",
    category: "Análise Inicial",
    promptKey: "rural_diagnostico",
    fields: JSON.stringify([
      {
        title: "Dados da Operação",
        fields: [
          { id: "banco", label: "Banco/Financiador", type: "text" },
          { id: "valor", label: "Valor do Contrato", type: "text" },
          { id: "cultura", label: "Cultura Financiada", type: "text" },
          { id: "data_contrato", label: "Data do Contrato", type: "date" },
          { id: "modalidade", label: "Modalidade", type: "radio", options: ["Custeio", "Investimento", "Comercialização", "Industrialização"] },
        ]
      },
      {
        title: "Situação Atual",
        fields: [
          { id: "status", label: "Situação", type: "radio", options: ["Adimplente", "Inadimplente", "Renegociado", "Execução Judicial"] },
          { id: "irregularidades", label: "Irregularidades Identificadas", type: "checkbox", options: ["Spread abusivo", "Capitalização indevida", "Cláusulas ilegais", "Vencimento antecipado indevido", "Seguro embutido", "Outro"] },
          { id: "observacoes", label: "Observações", type: "textarea" },
        ]
      }
    ]),
    sortOrder: 1,
  },
  {
    key: "rural_calculo",
    name: "Cálculo de Expurgos",
    subtitle: "Revisão de cláusulas financeiras",
    module: "rural",
    category: "Análise Financeira",
    promptKey: "rural_calculo",
    fields: JSON.stringify([
      {
        title: "Dados Financeiros",
        fields: [
          { id: "valor_principal", label: "Valor Principal (R$)", type: "text" },
          { id: "taxa_contratual", label: "Taxa de Juros Contratual (%)", type: "text" },
          { id: "taxa_referencia", label: "Taxa de Referência do Período (%)", type: "text" },
          { id: "periodo", label: "Período de Apuração", type: "text" },
          { id: "encargos", label: "Encargos a Revisar", type: "checkbox", options: ["Juros remuneratórios", "Comissão de permanência", "IOF", "Spread bancário", "Seguros"] },
        ]
      }
    ]),
    sortOrder: 2,
  },
  {
    key: "rural_peticao",
    name: "Elaboração de Peça",
    subtitle: "Petição inicial ou contestação",
    module: "rural",
    category: "Peças Jurídicas",
    promptKey: "rural_peticao",
    fields: JSON.stringify([
      {
        title: "Dados do Processo",
        fields: [
          { id: "tipo_peca", label: "Tipo de Peça", type: "radio", options: ["Petição Inicial", "Contestação", "Recurso", "Impugnação"] },
          { id: "vara", label: "Vara/Juízo", type: "text" },
          { id: "autor", label: "Autor/Requerente", type: "text" },
          { id: "reu", label: "Réu/Requerido", type: "text" },
          { id: "fundamentos", label: "Fundamentos Jurídicos", type: "textarea" },
        ]
      }
    ]),
    sortOrder: 3,
  },
  {
    key: "rural_acordo",
    name: "Análise de Acordo",
    subtitle: "Avaliação de proposta de renegociação",
    module: "rural",
    category: "Negociação",
    promptKey: "rural_acordo",
    fields: JSON.stringify([
      {
        title: "Proposta",
        fields: [
          { id: "valor_divida", label: "Valor da Dívida Atual (R$)", type: "text" },
          { id: "valor_proposta", label: "Valor da Proposta (R$)", type: "text" },
          { id: "desconto", label: "Desconto Oferecido (%)", type: "text" },
          { id: "prazo", label: "Prazo para Pagamento", type: "text" },
          { id: "condicoes", label: "Condições Especiais", type: "textarea" },
        ]
      }
    ]),
    sortOrder: 4,
  },
  {
    key: "rural_proagro",
    name: "Proagro/Proagro Mais",
    subtitle: "Habilitação e contestação de sinistro",
    module: "rural",
    category: "Sinistros",
    promptKey: "rural_proagro",
    fields: JSON.stringify([
      {
        title: "Sinistro",
        fields: [
          { id: "tipo_sinistro", label: "Tipo de Sinistro", type: "radio", options: ["Seca", "Geada", "Granizo", "Excesso de chuva", "Doença", "Pragas"] },
          { id: "data_sinistro", label: "Data do Sinistro", type: "date" },
          { id: "area_afetada", label: "Área Afetada (ha)", type: "text" },
          { id: "perda_estimada", label: "Perda Estimada (%)", type: "text" },
          { id: "resultado_vistoria", label: "Resultado da Vistoria", type: "textarea" },
        ]
      }
    ]),
    sortOrder: 5,
  },
  {
    key: "rural_secagem",
    name: "Secagem e Armazenagem",
    subtitle: "Revisão de contratos de depósito",
    module: "rural",
    category: "Análise Contratual",
    promptKey: "rural_secagem",
    fields: JSON.stringify([
      {
        title: "Contrato de Depósito",
        fields: [
          { id: "depositario", label: "Depositário", type: "text" },
          { id: "produto", label: "Produto", type: "text" },
          { id: "quantidade", label: "Quantidade (sacas)", type: "text" },
          { id: "taxa_secagem", label: "Taxa de Secagem (%)", type: "text" },
          { id: "taxa_armazenagem", label: "Taxa de Armazenagem (R$/saca/mês)", type: "text" },
        ]
      }
    ]),
    sortOrder: 6,
  },
  {
    key: "rural_embargo",
    name: "Embargo Ambiental",
    subtitle: "Análise de restrições ambientais",
    module: "rural",
    category: "Ambiental",
    promptKey: "rural_embargo",
    fields: JSON.stringify([
      {
        title: "Embargo",
        fields: [
          { id: "orgao", label: "Órgão Autuante", type: "radio", options: ["IBAMA", "Estadual", "Municipal"] },
          { id: "area_embargada", label: "Área Embargada (ha)", type: "text" },
          { id: "motivo", label: "Motivo do Embargo", type: "textarea" },
          { id: "data_embargo", label: "Data do Embargo", type: "date" },
        ]
      }
    ]),
    sortOrder: 7,
  },
  {
    key: "rural_financiamento",
    name: "Análise de Financiamento",
    subtitle: "Revisão completa de contrato",
    module: "rural",
    category: "Análise Contratual",
    promptKey: "rural_financiamento",
    fields: JSON.stringify([
      {
        title: "Contrato",
        fields: [
          { id: "numero_contrato", label: "Número do Contrato", type: "text" },
          { id: "valor_liberado", label: "Valor Liberado (R$)", type: "text" },
          { id: "parcelas", label: "Número de Parcelas", type: "text" },
          { id: "vencimento", label: "Data de Vencimento", type: "date" },
          { id: "garantias", label: "Garantias Oferecidas", type: "checkbox", options: ["Penhor de safra", "Hipoteca", "Alienação fiduciária", "Aval"] },
        ]
      }
    ]),
    sortOrder: 8,
  },
  {
    key: "rural_renegociacao",
    name: "Renegociação de Dívida",
    subtitle: "Estratégia de reestruturação",
    module: "rural",
    category: "Negociação",
    promptKey: "rural_renegociacao",
    fields: JSON.stringify([
      {
        title: "Dívida",
        fields: [
          { id: "total_divida", label: "Total da Dívida (R$)", type: "text" },
          { id: "numero_contratos", label: "Número de Contratos", type: "text" },
          { id: "programas", label: "Programas Disponíveis", type: "checkbox", options: ["PESA", "Recoop", "Refis", "Programa especial do banco", "ANATER"] },
          { id: "capacidade_pagamento", label: "Capacidade de Pagamento Mensal (R$)", type: "text" },
        ]
      }
    ]),
    sortOrder: 9,
  },
];

const LEX_EXECUTIO_WORKFLOWS = [
  {
    key: "exec_diagnostico",
    name: "Diagnóstico da Execução",
    subtitle: "Análise inicial do processo",
    module: "executio",
    category: "Análise Inicial",
    promptKey: "exec_diagnostico",
    fields: JSON.stringify([
      {
        title: "Dados do Processo",
        fields: [
          { id: "numero_processo", label: "Número do Processo", type: "text" },
          { id: "vara", label: "Vara/Juízo", type: "text" },
          { id: "exequente", label: "Exequente (Banco/Credor)", type: "text" },
          { id: "executado", label: "Executado", type: "text" },
          { id: "valor_execucao", label: "Valor da Execução (R$)", type: "text" },
          { id: "titulo", label: "Título Executivo", type: "radio", options: ["CCB", "CDA", "Nota Promissória", "Cheque", "Sentença", "Outro"] },
        ]
      },
      {
        title: "Situação Processual",
        fields: [
          { id: "fase", label: "Fase Atual", type: "radio", options: ["Citação", "Embargos", "Penhora", "Avaliação", "Hasta Pública", "Satisfação"] },
          { id: "penhora_bens", label: "Bens Penhorados", type: "checkbox", options: ["Imóvel rural", "Imóvel urbano", "Veículo", "Conta bancária", "Safra", "Maquinário", "Nenhum"] },
          { id: "observacoes", label: "Observações", type: "textarea" },
        ]
      }
    ]),
    sortOrder: 1,
  },
  {
    key: "exec_calculo",
    name: "Planilha de Cálculo",
    subtitle: "Revisão de débito exequendo",
    module: "executio",
    category: "Análise Financeira",
    promptKey: "exec_calculo",
    fields: JSON.stringify([
      {
        title: "Cálculo do Débito",
        fields: [
          { id: "principal", label: "Principal (R$)", type: "text" },
          { id: "juros_mora", label: "Juros de Mora (% a.a.)", type: "text" },
          { id: "multa", label: "Multa Contratual (%)", type: "text" },
          { id: "correcao", label: "Índice de Correção", type: "radio", options: ["IPCA", "IGP-M", "INPC", "TR", "SELIC"] },
          { id: "data_base", label: "Data Base do Cálculo", type: "date" },
          { id: "data_calculo", label: "Data do Cálculo", type: "date" },
        ]
      }
    ]),
    sortOrder: 2,
  },
  {
    key: "exec_embargos",
    name: "Embargos à Execução",
    subtitle: "Elaboração de defesa",
    module: "executio",
    category: "Peças Jurídicas",
    promptKey: "exec_embargos",
    fields: JSON.stringify([
      {
        title: "Fundamentos dos Embargos",
        fields: [
          { id: "materia_defesa", label: "Matéria de Defesa", type: "checkbox", options: ["Excesso de execução", "Nulidade do título", "Prescrição", "Ilegitimidade", "Cláusulas abusivas", "Revisão de encargos"] },
          { id: "prazo_embargos", label: "Prazo para Embargos", type: "text" },
          { id: "garantia", label: "Garantia do Juízo", type: "radio", options: ["Penhora realizada", "Caução", "Seguro garantia", "Depósito judicial"] },
          { id: "argumentos", label: "Argumentos Específicos", type: "textarea" },
        ]
      }
    ]),
    sortOrder: 3,
  },
  {
    key: "exec_penhora",
    name: "Impugnação à Penhora",
    subtitle: "Defesa de bens penhorados",
    module: "executio",
    category: "Defesa Processual",
    promptKey: "exec_penhora",
    fields: JSON.stringify([
      {
        title: "Penhora Impugnada",
        fields: [
          { id: "bem_penhorado", label: "Bem Penhorado", type: "text" },
          { id: "valor_avaliado", label: "Valor Avaliado (R$)", type: "text" },
          { id: "fundamento_impugnacao", label: "Fundamento", type: "checkbox", options: ["Bem impenhorável", "Excesso de penhora", "Avaliação incorreta", "Substituição por menos oneroso", "Bem de família"] },
          { id: "argumentos", label: "Argumentos", type: "textarea" },
        ]
      }
    ]),
    sortOrder: 4,
  },
  {
    key: "exec_hasta",
    name: "Análise de Hasta Pública",
    subtitle: "Estratégia para leilão judicial",
    module: "executio",
    category: "Hasta Pública",
    promptKey: "exec_hasta",
    fields: JSON.stringify([
      {
        title: "Leilão",
        fields: [
          { id: "data_leilao", label: "Data do Leilão", type: "date" },
          { id: "bem_leiloado", label: "Bem a ser Leiloado", type: "text" },
          { id: "valor_minimo", label: "Valor Mínimo do Leilão (R$)", type: "text" },
          { id: "valor_mercado", label: "Valor de Mercado (R$)", type: "text" },
          { id: "opcoes", label: "Opções Disponíveis", type: "checkbox", options: ["Arrematar o bem", "Indicar terceiro arrematante", "Suspender o leilão", "Propor acordo"] },
        ]
      }
    ]),
    sortOrder: 5,
  },
  {
    key: "exec_prescricao",
    name: "Prescrição e Decadência",
    subtitle: "Análise de prazo prescricional",
    module: "executio",
    category: "Defesa Processual",
    promptKey: "exec_prescricao",
    fields: JSON.stringify([
      {
        title: "Prescrição",
        fields: [
          { id: "titulo", label: "Tipo de Título", type: "radio", options: ["CCB", "Nota Promissória", "Cheque", "CDA", "Duplicata", "Sentença"] },
          { id: "data_vencimento", label: "Data de Vencimento", type: "date" },
          { id: "data_ajuizamento", label: "Data do Ajuizamento", type: "date" },
          { id: "interrupcoes", label: "Interrupções do Prazo", type: "textarea" },
        ]
      }
    ]),
    sortOrder: 6,
  },
  {
    key: "exec_acordo",
    name: "Proposta de Acordo",
    subtitle: "Negociação para extinção do feito",
    module: "executio",
    category: "Negociação",
    promptKey: "exec_acordo",
    fields: JSON.stringify([
      {
        title: "Negociação",
        fields: [
          { id: "valor_cobrado", label: "Valor Cobrado pelo Credor (R$)", type: "text" },
          { id: "valor_real", label: "Valor Real da Dívida (R$)", type: "text" },
          { id: "capacidade", label: "Capacidade de Pagamento (R$)", type: "text" },
          { id: "proposta", label: "Proposta de Acordo", type: "textarea" },
          { id: "forma_pagamento", label: "Forma de Pagamento", type: "radio", options: ["À vista", "Parcelado", "Com desconto e pagamento único"] },
        ]
      }
    ]),
    sortOrder: 7,
  },
  {
    key: "exec_substituicao",
    name: "Substituição de Penhora",
    subtitle: "Proposta de bem menos oneroso",
    module: "executio",
    category: "Defesa Processual",
    promptKey: "exec_substituicao",
    fields: JSON.stringify([
      {
        title: "Substituição",
        fields: [
          { id: "bem_atual", label: "Bem Atualmente Penhorado", type: "text" },
          { id: "valor_atual", label: "Valor do Bem Atual (R$)", type: "text" },
          { id: "bem_substituto", label: "Bem Substituto Proposto", type: "text" },
          { id: "valor_substituto", label: "Valor do Bem Substituto (R$)", type: "text" },
          { id: "justificativa", label: "Justificativa", type: "textarea" },
        ]
      }
    ]),
    sortOrder: 8,
  },
  {
    key: "exec_excesso",
    name: "Impugnação por Excesso",
    subtitle: "Revisão do valor exequendo",
    module: "executio",
    category: "Análise Financeira",
    promptKey: "exec_excesso",
    fields: JSON.stringify([
      {
        title: "Excesso de Execução",
        fields: [
          { id: "valor_exequendo", label: "Valor Exequendo Alegado (R$)", type: "text" },
          { id: "valor_correto", label: "Valor Correto Apurado (R$)", type: "text" },
          { id: "diferenca", label: "Diferença (R$)", type: "text" },
          { id: "erros", label: "Erros Identificados", type: "checkbox", options: ["Capitalização indevida", "Juros em duplicidade", "Multa excessiva", "Correção monetária errada", "Honorários incorretos"] },
          { id: "memoria_calculo", label: "Memorial de Cálculo", type: "textarea" },
        ]
      }
    ]),
    sortOrder: 9,
  },
];

const RURAL_PROMPT = `Você é Lex Rural, assistente jurídico especializado em Direito do Agronegócio e Crédito Rural Brasileiro. Sua especialidade abrange:

- Legislação de crédito rural (Manual de Crédito Rural - MCR, PRONAF, PRONAMP, ABC)
- Jurisprudência do STJ, TRF e TJ sobre contratos bancários rurais
- Revisão de cláusulas abusivas em financiamentos rurais
- Proagro, Proagro Mais e sinistros rurais
- Legislação ambiental aplicada ao agronegócio (Código Florestal, IBAMA)
- Contratos de depósito, secagem, armazenagem e comercialização

REGRAS DE CONDUTA:
1. Sempre cite a base legal específica (lei, artigo, súmula)
2. Referencie jurisprudência relevante do STJ/TRF quando aplicável
3. Identifique [DADO PENDENTE] quando informação essencial não for fornecida
4. Organize a análise em fases claramente identificadas (FASE 1 —, FASE 2 —, etc.)
5. Conclua com recomendações práticas e acionáveis

DADOS DO CASO:
{{DADOS}}

Realize análise jurídica completa conforme sua especialização. Ao finalizar completamente, escreva exatamente: [ANÁLISE CONCLUÍDA]`;

const EXECUTIO_PROMPT = `Você é Lex Executio, assistente jurídico especializado em Execuções Bancárias e Processo de Execução Civil. Sua especialidade abrange:

- Código de Processo Civil (execução de títulos extrajudiciais e judiciais)
- Embargos à execução e impugnação ao cumprimento de sentença
- Revisão de cálculos e planilhas de débito exequendo
- Defesa em hasta pública e arrematação
- Prescrição e decadência em execuções bancárias
- Jurisprudência do STJ sobre execuções e contratos bancários
- Súmulas aplicáveis: STJ Súmulas 294, 296, 379, 380, 382 e demais

REGRAS DE CONDUTA:
1. Cite expressamente o artigo do CPC aplicável
2. Referencie súmulas e jurisprudência relevante
3. Identifique [DADO PENDENTE] quando informação essencial não for fornecida
4. Organize em fases: FASE 1 — Análise Processual, FASE 2 — Análise Financeira, FASE 3 — Estratégia
5. Seja preciso nos prazos processuais

DADOS DO CASO:
{{DADOS}}

Realize análise jurídica completa conforme sua especialização. Ao finalizar completamente, escreva exatamente: [ANÁLISE CONCLUÍDA]`;

export async function seedDatabase() {
  try {
    const existingWorkflows = await db.select().from(workflowsTable).limit(1);
    if (existingWorkflows.length > 0) {
      logger.info("Database already seeded, skipping");
      return;
    }

    logger.info("Seeding database with workflows and prompts...");

    for (const w of [...LEX_RURAL_WORKFLOWS, ...LEX_EXECUTIO_WORKFLOWS]) {
      await db.insert(workflowsTable).values(w).onConflictDoNothing();
    }

    const promptsToSeed = [
      ...LEX_RURAL_WORKFLOWS.map(w => ({
        key: w.promptKey,
        content: RURAL_PROMPT,
        module: "rural",
      })),
      ...LEX_EXECUTIO_WORKFLOWS.map(w => ({
        key: w.promptKey,
        content: EXECUTIO_PROMPT,
        module: "executio",
      })),
    ];

    for (const p of promptsToSeed) {
      await db.insert(promptsTable).values(p).onConflictDoNothing();
    }

    logger.info("Database seeded successfully");
  } catch (err) {
    logger.error({ err }, "Error seeding database");
  }
}
