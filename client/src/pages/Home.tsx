import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Download, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  calculateDIFAL,
  STATE_ALIQUOTS,
  formatCurrency,
  formatPercent,
  DIFALCalculation,
} from '@/lib/difal-calculator';

/**
 * Design: Minimalismo Corporativo com Foco em Dados
 * - Paleta: Azul corporativo (#1E40AF) + Verde (#10B981)
 * - Layout: Sidebar + Central + Painel de resultados
 * - Tipografia: Poppins para títulos + Inter para corpo
 */

export default function Home() {
  const [invoiceValue, setInvoiceValue] = useState<string>('10000');
  const [originState, setOriginState] = useState<string>('SP');
  const [destinationState, setDestinationState] = useState<string>('RJ');
  const [operationType, setOperationType] = useState<'consumer' | 'contributor'>('consumer');
  const [calculationMethod, setCalculationMethod] = useState<'single-base' | 'double-base'>('single-base');
  const [calculation, setCalculation] = useState<DIFALCalculation | null>(null);
  const [history, setHistory] = useState<DIFALCalculation[]>([]);
  const [hasFecop, setHasFecop] = useState<boolean>(false);
  const [fecopPercent, setFecopPercent] = useState<string>('2');
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [manualInterstateRate, setManualInterstateRate] = useState<string>('12');
  const [manualInternalRate, setManualInternalRate] = useState<string>('18');

  // Recalcular sempre que os parâmetros mudam
  useEffect(() => {
    const value = parseFloat(invoiceValue) || 0;
    const fPercent = parseFloat(fecopPercent) || 0;

    if (value > 0) {
      const origin = STATE_ALIQUOTS[originState];
      let destination = STATE_ALIQUOTS[destinationState];

      if (isManualMode && destination) {
        destination = {
          ...destination,
          internalRate: (parseFloat(manualInternalRate) || 0) / 100
        };
      }

      if (origin && destination) {
        const result = calculateDIFAL(
          value,
          origin,
          destination,
          operationType,
          calculationMethod,
          hasFecop,
          fPercent,
          isManualMode ? (parseFloat(manualInterstateRate) || 0) / 100 : undefined
        );
        setCalculation(result);
      }
    }
  }, [invoiceValue, originState, destinationState, operationType, calculationMethod, hasFecop, fecopPercent, isManualMode, manualInterstateRate, manualInternalRate]);

  const handleCalculate = () => {
    if (calculation) {
      setHistory([calculation, ...history.slice(0, 9)]);
    }
  };

  const handleReset = () => {
    setInvoiceValue('10000');
    setOriginState('SP');
    setDestinationState('RJ');
    setOperationType('consumer');
    setCalculationMethod('single-base');
    setHasFecop(false);
    setFecopPercent('2');
    setIsManualMode(false);
    setManualInterstateRate('12');
    setManualInternalRate('18');
    setHistory([]);
  };

  const handleExportPDF = () => {
    if (calculation) {
      const content = calculation.results.breakdown;
      const element = document.createElement('a');
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
      );
      element.setAttribute('download', `difal-${new Date().toISOString().split('T')[0]}.txt`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const stateOptions = Object.entries(STATE_ALIQUOTS).map(([code, state]) => ({
    code,
    name: state.name,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Calculadora DIFAL
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Especialista Tributário - Cálculo Preciso do Diferencial de Alíquota
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Limpar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Inputs */}
          <div className="lg:col-span-2">
            <Card className="p-6 shadow-sm border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900 mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Dados da Operação
              </h2>

              <div className="space-y-6">
                {/* Valor da NF */}
                <div>
                  <Label htmlFor="invoice-value" className="text-sm font-medium text-slate-700">
                    Valor da Nota Fiscal (R$)
                  </Label>
                  <Input
                    id="invoice-value"
                    type="number"
                    value={invoiceValue}
                    onChange={(e) => setInvoiceValue(e.target.value)}
                    placeholder="0.00"
                    className="mt-2 text-lg font-mono"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Insira o valor total da nota fiscal para cálculo do DIFAL
                  </p>
                </div>

                {/* Estados */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="origin-state" className="text-sm font-medium text-slate-700">
                      Estado de Origem
                    </Label>
                    <Select value={originState} onValueChange={setOriginState}>
                      <SelectTrigger id="origin-state" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stateOptions.map((state) => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.code} - {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dest-state" className="text-sm font-medium text-slate-700">
                      Estado de Destino
                    </Label>
                    <Select value={destinationState} onValueChange={setDestinationState}>
                      <SelectTrigger id="dest-state" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stateOptions.map((state) => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.code} - {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tipo de Operação */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 block mb-3">
                    Tipo de Operação
                  </Label>
                  <div className="flex gap-3">
                    <Button
                      variant={operationType === 'consumer' ? 'default' : 'outline'}
                      onClick={() => setOperationType('consumer')}
                      className="flex-1"
                    >
                      Consumidor Final
                    </Button>
                    <Button
                      variant={operationType === 'contributor' ? 'default' : 'outline'}
                      onClick={() => setOperationType('contributor')}
                      className="flex-1"
                    >
                      Contribuinte
                    </Button>
                  </div>
                </div>

                {/* Método de Cálculo */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 block mb-3">
                    Método de Cálculo
                  </Label>
                  <div className="flex gap-3">
                    <Button
                      variant={calculationMethod === 'single-base' ? 'default' : 'outline'}
                      onClick={() => setCalculationMethod('single-base')}
                      className="flex-1"
                    >
                      <div className="text-left">
                        <div className="font-medium">Base Única</div>
                        <div className="text-xs opacity-70">Por Fora</div>
                      </div>
                    </Button>
                    <Button
                      variant={calculationMethod === 'double-base' ? 'default' : 'outline'}
                      onClick={() => setCalculationMethod('double-base')}
                      className="flex-1"
                    >
                      <div className="text-left">
                        <div className="font-medium">Base Dupla</div>
                        <div className="text-xs opacity-70">Por Dentro</div>
                      </div>
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {calculationMethod === 'single-base'
                      ? 'Aplicável à maioria dos estados'
                      : 'Aplicável a São Paulo e alguns estados'}
                  </p>
                </div>

                {/* FECOP */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="has-fecop" className="text-sm font-medium text-slate-700">
                      Adicional de FECOP
                    </Label>
                    <div
                      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${hasFecop ? 'bg-blue-600' : 'bg-slate-300'}`}
                      onClick={() => setHasFecop(!hasFecop)}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${hasFecop ? 'translate-x-6' : ''}`} />
                    </div>
                  </div>

                  {hasFecop && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label htmlFor="fecop-percent" className="text-xs font-medium text-slate-600">
                        Percentual do FECOP (%)
                      </Label>
                      <Input
                        id="fecop-percent"
                        type="number"
                        value={fecopPercent}
                        onChange={(e) => setFecopPercent(e.target.value)}
                        className="mt-1 h-8 text-sm"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                  )}
                </div>

                {/* Modo Manual Toggle */}
                <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div
                    className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isManualMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                    onClick={() => setIsManualMode(!isManualMode)}
                  >
                    <div className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${isManualMode ? 'translate-x-5' : ''}`} />
                  </div>
                  <Label className="text-xs font-semibold text-blue-900 cursor-pointer" onClick={() => setIsManualMode(!isManualMode)}>
                    Ajustar Alíquotas Manualmente
                  </Label>
                </div>

                {isManualMode && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/30 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                    <div>
                      <Label htmlFor="manual-interstate" className="text-xs font-medium text-slate-600">
                        Alíq. Interestadual (%)
                      </Label>
                      <Input
                        id="manual-interstate"
                        type="number"
                        value={manualInterstateRate}
                        onChange={(e) => setManualInterstateRate(e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="manual-internal" className="text-xs font-medium text-slate-600">
                        Alíq. Interna Destino (%)
                      </Label>
                      <Input
                        id="manual-internal"
                        type="number"
                        value={manualInternalRate}
                        onChange={(e) => setManualInternalRate(e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Botão Calcular */}
                <Button
                  onClick={handleCalculate}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3"
                >
                  Calcular DIFAL
                </Button>
              </div>
            </Card>

            {/* Informações Técnicas */}
            <Card className="mt-6 p-6 shadow-sm border-slate-200 bg-blue-50">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
                ℹ️ Sobre o DIFAL
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                O DIFAL (Diferencial de Alíquota do ICMS) é um imposto que equilibra a arrecadação entre o estado de origem e o estado de destino em operações interestaduais. Este cálculo segue as normas da EC 87/2015 e é obrigatório para operações a consumidor final não contribuinte.
              </p>
            </Card>
          </div>

          {/* Right Panel - Results */}
          <div>
            {calculation && (
              <Card className="p-6 shadow-sm border-green-200 bg-gradient-to-br from-green-50 to-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Resultado
                  </h2>
                  <Badge className="bg-green-600 text-white">
                    {calculationMethod === 'single-base' ? 'Base Única' : 'Base Dupla'}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {/* DIFAL Principal */}
                  <div className="bg-white rounded-lg p-4 border-2 border-green-500">
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                      DIFAL a Recolher
                    </p>
                    <p className="text-3xl font-bold text-green-700 mt-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      {formatCurrency(calculation.results.difal)}
                    </p>
                  </div>

                  {/* Detalhes */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                      <span className="text-sm text-slate-600">ICMS Origem:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatCurrency(calculation.results.icms_origem)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                      <span className="text-sm text-slate-600">ICMS Destino Total:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatCurrency(calculation.results.icms_destino_total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                      <span className="text-sm text-slate-600">FECOP:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatCurrency(calculation.results.fecop)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white border border-green-200 rounded">
                      <span className="text-sm font-semibold text-green-800">Total a Recolher:</span>
                      <span className="font-mono font-bold text-green-900">
                        {formatCurrency(calculation.results.total_recolher_destino)}
                      </span>
                    </div>
                  </div>

                  {/* Mensagem do Especialista */}
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs text-blue-800">
                      {calculation.results.mensagem}
                    </AlertDescription>
                  </Alert>

                  {/* Exportar */}
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    className="w-full gap-2 mt-4"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Detalhes
                  </Button>
                </div>
              </Card>
            )}

            {/* Histórico */}
            {history.length > 0 && (
              <Card className="mt-6 p-6 shadow-sm border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Últimos Cálculos ({history.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((calc, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 cursor-pointer transition"
                      onClick={() => {
                        setInvoiceValue(calc.invoiceValue.toString());
                        setOriginState(calc.originState.code);
                        setDestinationState(calc.destinationState.code);
                        setOperationType(calc.operationType);
                        setCalculationMethod(calc.calculationMethod);
                        setHasFecop(calc.hasFecop);
                        setFecopPercent(calc.fecopPercent.toString());
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-xs text-slate-600">
                          {calc.originState.code} → {calc.destinationState.code}
                        </div>
                        <span className="font-mono font-bold text-green-700 text-sm">
                          {formatCurrency(calc.results.difal)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatCurrency(calc.invoiceValue)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Tabela de Alíquotas */}
        <Card className="mt-8 p-6 shadow-sm border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Tabela de Alíquotas por Estado
          </h2>
          <Tabs defaultValue="sudeste" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="sudeste">Sudeste</TabsTrigger>
              <TabsTrigger value="sul">Sul</TabsTrigger>
              <TabsTrigger value="nordeste">Nordeste</TabsTrigger>
              <TabsTrigger value="norte">Norte</TabsTrigger>
              <TabsTrigger value="centro-oeste">Centro-Oeste</TabsTrigger>
            </TabsList>

            {['sudeste', 'sul', 'nordeste', 'norte', 'centro-oeste'].map((region) => (
              <TabsContent key={region} value={region}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {Object.values(STATE_ALIQUOTS)
                    .filter((state) => state.region === region)
                    .map((state) => (
                      <div
                        key={state.code}
                        className="p-3 bg-slate-50 rounded border border-slate-200"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-900">{state.code}</p>
                            <p className="text-xs text-slate-600">{state.name}</p>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {formatPercent(state.internalRate)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-slate-900 text-slate-300 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>
            Calculadora DIFAL © 2025 - Especialista Tributário
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Informações baseadas na legislação tributária vigente (EC 87/2015). Consulte um especialista para operações específicas.
          </p>
        </div>
      </footer>
    </div>
  );
}
