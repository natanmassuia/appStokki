import { AppLayout } from '@/components/AppLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  HelpCircle, 
  Settings, 
  Package, 
  TrendingUp, 
  MessageCircle, 
  LayoutDashboard, 
  Smartphone, 
  DollarSign, 
  MousePointerClick, 
  UploadCloud, 
  RefreshCw,
  Search,
  ExternalLink
} from 'lucide-react';

export default function Tutoriais() {
  const handleContactSupport = () => {
    window.open('https://wa.me/5511999999999', '_blank'); // Replace with actual support number
  };

  return (
    <AppLayout title="Central de Ajuda">
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text">Como podemos ajudar?</h1>
          <p className="text-lg text-muted-foreground">
            Explore nossos guias para dominar seu novo sistema de gestão
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-8">
          
          {/* Category 1: Primeiros Passos & Dashboard */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xl font-semibold border-b pb-2">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <span>Primeiros Passos & Dashboard</span>
            </div>
            <Accordion type="single" collapsible className="w-full space-y-3">
              <AccordionItem value="understanding-cockpit" className="glass-card rounded-lg border-border/30 px-4">
                <AccordionTrigger className="text-left font-medium">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Entendendo seu Centro de Operações
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3 pt-2">
                  <p>
                    O Dashboard foi redesenhado para dar uma visão clara da saúde da sua loja:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>
                      <strong>Faturamento (Verde):</strong> Soma total de todas as vendas realizadas no período.
                    </li>
                    <li>
                      <strong>Lucro Líquido (Azul):</strong> É o dinheiro que realmente sobra no seu bolso. 
                      <br />
                      <span className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                        Fórmula: (Vendas Totais) - (Custo dos Produtos) - (Despesas Operacionais)
                      </span>
                    </li>
                    <li>
                      <strong>Gráfico Verde vs Vermelho:</strong> A linha verde mostra suas entradas (vendas), 
                      enquanto a linha vermelha mostra suas saídas (custos + despesas). O objetivo é manter a linha verde sempre acima!
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="setup-store" className="glass-card rounded-lg border-border/30 px-4">
                <AccordionTrigger className="text-left font-medium">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Configurando sua Loja
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3 pt-2">
                  <p>
                    Personalize sua loja para deixá-la com a sua cara:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Acesse <strong>"Minha Loja"</strong> no menu lateral.</li>
                    <li>Na aba <strong>"Identidade Visual"</strong>, você pode fazer upload do seu Logo.</li>
                    <li>Escolha a <strong>Cor Primária</strong> da sua marca. Essa cor será usada em botões e destaques no seu Catálogo Online.</li>
                    <li>Use a seção <strong>"Live Preview"</strong> para ver como sua loja ficará em tempo real antes de salvar!</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Category 2: Gestão de Estoque (New Flow) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xl font-semibold border-b pb-2">
              <Package className="h-5 w-5 text-primary" />
              <span>Gestão de Estoque</span>
            </div>
            <Accordion type="single" collapsible className="w-full space-y-3">
              <AccordionItem value="add-products" className="glass-card rounded-lg border-border/30 px-4">
                <AccordionTrigger className="text-left font-medium">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Adicionando Produtos Rapidamente
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3 pt-2">
                  <p>
                    Esqueça as páginas lentas! Agora adicionar produtos é instantâneo:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Na página <strong>"Estoque"</strong>, clique no botão <strong>"Novo Produto"</strong>.</li>
                    <li>Uma gaveta lateral se abrirá sem sair da tela.</li>
                    <li>Preencha os dados e clique em salvar. O produto aparece na lista na hora!</li>
                  </ol>
                  <p className="text-sm bg-primary/10 p-2 rounded text-primary-foreground/80">
                    💡 Dica: Você pode continuar adicionando produtos em sequência sem fechar a gaveta.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="quick-edit" className="glass-card rounded-lg border-border/30 px-4">
                <AccordionTrigger className="text-left font-medium">
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    Edição Rápida (Quick Edit)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3 pt-2">
                  <p>
                    Precisa ajustar um preço ou estoque rápido? Não precisa abrir o formulário!
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Na tabela de estoque, clique diretamente sobre o <strong>Preço</strong> ou <strong>Quantidade</strong>.</li>
                    <li>O campo se tornará editável.</li>
                    <li>Digite o novo valor e aperte <strong>Enter</strong> ou clique fora.</li>
                    <li>Pronto! O valor foi atualizado.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bulk-import" className="glass-card rounded-lg border-border/30 px-4">
                <AccordionTrigger className="text-left font-medium">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="h-4 w-4 text-muted-foreground" />
                    Importação em Massa
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3 pt-2">
                  <p>
                    Tem muitos produtos? Use nossa importação inteligente:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Clique no botão <strong>"Importar CSV"</strong> no topo da página de Estoque.</li>
                    <li>Arraste sua planilha (Excel ou CSV).</li>
                    <li>
                      O sistema identifica automaticamente as colunas (Ex: "Preço", "Valor", "Custo").
                      <br />
                      <em>Não precisa de um modelo específico!</em>
                    </li>
                    <li>Revise os dados e confirme a importação.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Category 3: Financeiro & Lucro */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xl font-semibold border-b pb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span>Financeiro & Lucro</span>
            </div>
            <Accordion type="single" collapsible className="w-full space-y-3">
              <AccordionItem value="finance-tabs" className="glass-card rounded-lg border-border/30 px-4">
                <AccordionTrigger className="text-left font-medium">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    Vendas vs Gastos
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3 pt-2">
                  <p>
                    Centralizamos tudo na página <strong>/financeiro</strong>. Use as abas no topo para navegar:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Visão Geral:</strong> Resumo financeiro e KPIs.</li>
                    <li><strong>Vendas:</strong> Histórico completo de transações. Use para ver detalhes ou estornar vendas.</li>
                    <li><strong>Gastos:</strong> Gerencie despesas fixas (aluguel, internet) e variáveis.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="real-profit" className="glass-card rounded-lg border-border/30 px-4">
                <AccordionTrigger className="text-left font-medium">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Calculando seu Lucro Real
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3 pt-2">
                  <p>
                    Muitos lojistas confundem Faturamento com Lucro. Nós te ajudamos a ver a verdade:
                  </p>
                  <div className="bg-secondary/50 p-4 rounded-lg my-2 font-mono text-sm border border-border">
                    Lucro Real = (Vendas) - (Custo dos Produtos) - (Despesas Extras)
                  </div>
                  <p>
                    Cadastre sempre o <strong>Preço de Custo</strong> dos seus produtos e lance suas despesas na aba "Gastos". 
                    Assim, o sistema te dirá exatamente quanto seu negócio está rendendo.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Category 4: WhatsApp & CRM */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xl font-semibold border-b pb-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span>WhatsApp & CRM</span>
            </div>
            <Accordion type="single" collapsible className="w-full space-y-3">
              <AccordionItem value="whatsapp-connect" className="glass-card rounded-lg border-border/30 px-4">
                <AccordionTrigger className="text-left font-medium">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    Conectando o WhatsApp
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3 pt-2">
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Vá em <strong>"Minha Loja"</strong> e depois na aba <strong>"WhatsApp"</strong>.</li>
                    <li>Clique em "Gerenciar Conexão".</li>
                    <li>Um QR Code aparecerá (igual ao WhatsApp Web).</li>
                    <li>No seu celular, abra o WhatsApp, vá em "Aparelhos Conectados" e escaneie o código.</li>
                    <li>Pronto! Agora você pode enviar campanhas e recibos automáticos.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sync-contacts" className="glass-card rounded-lg border-border/30 px-4">
                <AccordionTrigger className="text-left font-medium">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    Sincronizando Contatos
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3 pt-2">
                  <p>
                    Traga seus clientes do WhatsApp para o sistema:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Vá até a página <strong>"Clientes"</strong>.</li>
                    <li>Clique no botão <strong>"Sincronizar Contatos"</strong>.</li>
                    <li>O sistema buscará seus contatos recentes do WhatsApp e criará perfis de clientes automaticamente.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

        </div>

        {/* Support Card */}
        <Card className="bg-primary/5 border-primary/20 mt-10">
          <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <HelpCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Ainda tem dúvidas?</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Nossa equipe de suporte está pronta para te ajudar no WhatsApp.
                </p>
              </div>
            </div>
            <Button onClick={handleContactSupport} className="w-full md:w-auto gap-2">
              <MessageCircle className="h-4 w-4" />
              Falar com Suporte
            </Button>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
