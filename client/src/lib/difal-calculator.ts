/**
 * DIFAL Calculator - Especialista Tributário
 * Cálculos precisos de DIFAL (Diferencial de Alíquota do ICMS)
 * 
 * Suporta:
 * - Base Única (por fora): Valor NF × (Alíquota Interna - Alíquota Interestadual)
 * - Base Dupla (por dentro): Cálculo com exclusão do ICMS da base
 */

export interface StateAliquot {
  code: string;
  name: string;
  internalRate: number; // Alíquota interna (ICMS estadual)
  region: 'norte' | 'nordeste' | 'centro-oeste' | 'sudeste' | 'sul';
}

export interface DIFALCalculation {
  invoiceValue: number;
  originState: StateAliquot;
  destinationState: StateAliquot;
  operationType: 'consumer' | 'contributor';
  calculationMethod: 'single-base' | 'double-base';
  interstateRate: number;
  hasFecop: boolean;
  fecopPercent: number;
  isImported: boolean;
  results: {
    icms_origem: number;
    icms_destino_total: number;
    difal: number;
    fecop: number;
    total_icms_operacao: number;
    total_recolher_destino: number;
    mensagem: string;
    breakdown: string;
  };
}

// Tabela de alíquotas interestaduais (2025)
const INTERSTATE_RATES: Record<string, number> = {
  'AC': 0.07, 'AL': 0.17, 'AP': 0.07, 'AM': 0.07, 'BA': 0.17, 'CE': 0.17,
  'DF': 0.18, 'ES': 0.12, 'GO': 0.10, 'MA': 0.17, 'MT': 0.10, 'MS': 0.10,
  'MG': 0.12, 'PA': 0.17, 'PB': 0.17, 'PR': 0.12, 'PE': 0.17, 'PI': 0.17,
  'RJ': 0.18, 'RN': 0.17, 'RS': 0.12, 'RO': 0.07, 'RR': 0.07, 'SC': 0.12,
  'SP': 0.18, 'SE': 0.17, 'TO': 0.10
};

// Tabela de alíquotas internas por estado (Atualizada para 2025/2026)
export const STATE_ALIQUOTS: Record<string, StateAliquot> = {
  'AC': { code: 'AC', name: 'Acre', internalRate: 0.19, region: 'norte' },
  'AL': { code: 'AL', name: 'Alagoas', internalRate: 0.19, region: 'nordeste' },
  'AP': { code: 'AP', name: 'Amapá', internalRate: 0.18, region: 'norte' },
  'AM': { code: 'AM', name: 'Amazonas', internalRate: 0.20, region: 'norte' },
  'BA': { code: 'BA', name: 'Bahia', internalRate: 0.205, region: 'nordeste' },
  'CE': { code: 'CE', name: 'Ceará', internalRate: 0.20, region: 'nordeste' },
  'DF': { code: 'DF', name: 'Distrito Federal', internalRate: 0.20, region: 'centro-oeste' },
  'ES': { code: 'ES', name: 'Espírito Santo', internalRate: 0.17, region: 'sudeste' },
  'GO': { code: 'GO', name: 'Goiás', internalRate: 0.19, region: 'centro-oeste' },
  'MA': { code: 'MA', name: 'Maranhão', internalRate: 0.23, region: 'nordeste' },
  'MT': { code: 'MT', name: 'Mato Grosso', internalRate: 0.17, region: 'centro-oeste' },
  'MS': { code: 'MS', name: 'Mato Grosso do Sul', internalRate: 0.17, region: 'centro-oeste' },
  'MG': { code: 'MG', name: 'Minas Gerais', internalRate: 0.18, region: 'sudeste' },
  'PA': { code: 'PA', name: 'Pará', internalRate: 0.19, region: 'norte' },
  'PB': { code: 'PB', name: 'Paraíba', internalRate: 0.20, region: 'nordeste' },
  'PR': { code: 'PR', name: 'Paraná', internalRate: 0.195, region: 'sul' },
  'PE': { code: 'PE', name: 'Pernambuco', internalRate: 0.205, region: 'nordeste' },
  'PI': { code: 'PI', name: 'Piauí', internalRate: 0.225, region: 'nordeste' },
  'RJ': { code: 'RJ', name: 'Rio de Janeiro', internalRate: 0.20, region: 'sudeste' },
  'RN': { code: 'RN', name: 'Rio Grande do Norte', internalRate: 0.20, region: 'nordeste' },
  'RS': { code: 'RS', name: 'Rio Grande do Sul', internalRate: 0.17, region: 'sul' },
  'RO': { code: 'RO', name: 'Rondônia', internalRate: 0.195, region: 'norte' },
  'RR': { code: 'RR', name: 'Roraima', internalRate: 0.20, region: 'norte' },
  'SC': { code: 'SC', name: 'Santa Catarina', internalRate: 0.17, region: 'sul' },
  'SP': { code: 'SP', name: 'São Paulo', internalRate: 0.18, region: 'sudeste' },
  'SE': { code: 'SE', name: 'Sergipe', internalRate: 0.19, region: 'nordeste' },
  'TO': { code: 'TO', name: 'Tocantins', internalRate: 0.20, region: 'centro-oeste' }
};

/**
 * Obtém a alíquota interestadual entre dois estados
 * A alíquota interestadual é a mesma independente da origem
 */
function getInterstateRate(destinationStateCode: string): number {
  return INTERSTATE_RATES[destinationStateCode] || 0.12;
}

/**
 * Calcula o DIFAL com todas as informações necessárias seguindo as regras do especialista
 */
export function calculateDIFAL(
  invoiceValue: number,
  originState: StateAliquot,
  destinationState: StateAliquot,
  operationType: 'consumer' | 'contributor',
  calculationMethod: 'single-base' | 'double-base',
  hasFecop: boolean = false,
  fecopPercent: number = 0,
  manualInterstateRate?: number,
  isImported: boolean = false
): DIFALCalculation {
  let interstateRate: number;

  if (manualInterstateRate !== undefined) {
    interstateRate = manualInterstateRate;
  } else if (isImported) {
    interstateRate = 0.04;
  } else {
    interstateRate = getInterstateRate(destinationState.code);
  }

  const internalDestRate = destinationState.internalRate;

  // 1. ICMS Origem
  // icms_origem = valor_operacao × aliquota_interestadual
  const icms_origem = invoiceValue * interstateRate;

  // 2. ICMS Destino Total
  // icms_destino_total = valor_operacao × aliquota_interna_destino
  let icms_destino_total: number;
  let difal: number;

  if (calculationMethod === 'single-base') {
    icms_destino_total = invoiceValue * internalDestRate;
    difal = icms_destino_total - icms_origem;
  } else {
    // Mantendo a lógica de Base Dupla se selecionada, mas adaptando aos campos do prompt
    const baseWithoutICMS = invoiceValue / (1 - internalDestRate);
    icms_destino_total = baseWithoutICMS * internalDestRate;
    difal = icms_destino_total - (baseWithoutICMS * interstateRate);
  }

  // Se aliquota_interna_destino <= aliquota_interestadual: difal = 0
  let finalDifal = difal;
  let message = "";

  if (internalDestRate <= interstateRate) {
    finalDifal = 0;
    message = "Não há DIFAL: alíquota interna menor ou igual à interestadual.";
  } else {
    finalDifal = Math.max(0, difal);
    message = "DIFAL calculado conforme EC 87/2015";
  }

  // 3. FECOP
  const fecop = hasFecop ? (invoiceValue * (fecopPercent / 100)) : 0;
  if (hasFecop && fecop > 0) {
    if (finalDifal > 0) {
      message += " com adicional de FECOP.";
    } else {
      message = "Operação com adicional de FECOP.";
    }
  } else if (finalDifal > 0) {
    message += ".";
  }

  // 4. Total ICMS da Operação
  const total_icms_operacao = icms_destino_total;

  // 5. Total a Recolher ao Destino
  const total_recolher_destino = finalDifal + fecop;

  const breakdown = `
CÁLCULO DIFAL - ${calculationMethod === 'single-base' ? 'BASE ÚNICA' : 'BASE DUPLA'}
─────────────────────────────────────────
Valor da Operação: R$ ${invoiceValue.toFixed(2)}
Origem: ${originState.code} | Destino: ${destinationState.code}
Alíquota Interestadual: ${(interstateRate * 100).toFixed(2)}%
Alíquota Interna Destino: ${(internalDestRate * 100).toFixed(2)}%
${isImported ? 'Mercadoria Importada (4%)\n' : ''}${hasFecop ? `FECOP: ${fecopPercent}%` : 'Sem FECOP'}

ICMS Origem: R$ ${icms_origem.toFixed(2)}
ICMS Destino Total: R$ ${icms_destino_total.toFixed(2)}
DIFAL: R$ ${finalDifal.toFixed(2)}
FECOP: R$ ${fecop.toFixed(2)}
─────────────────────────────────────────
TOTAL RECOLHER DESTINO: R$ ${total_recolher_destino.toFixed(2)}
  `.trim();

  return {
    invoiceValue,
    originState,
    destinationState,
    operationType,
    calculationMethod,
    interstateRate,
    hasFecop,
    fecopPercent,
    isImported,
    results: {
      icms_origem: Number(icms_origem.toFixed(2)),
      icms_destino_total: Number(icms_destino_total.toFixed(2)),
      difal: Number(finalDifal.toFixed(2)),
      fecop: Number(fecop.toFixed(2)),
      total_icms_operacao: Number(total_icms_operacao.toFixed(2)),
      total_recolher_destino: Number(total_recolher_destino.toFixed(2)),
      mensagem: message,
      breakdown
    }
  };
}


/**
 * Formata valor monetário brasileiro
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata percentual
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
