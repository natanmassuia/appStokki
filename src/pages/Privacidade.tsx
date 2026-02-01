import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold gradient-text">AppStokki</span>
          </div>
          <Button asChild variant="ghost">
            <Link to="/cadastro">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-3xl">Política de Privacidade</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
              <p className="text-muted-foreground">
                O AppStokki ("nós", "nosso" ou "aplicativo") está comprometido em proteger sua privacidade. 
                Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações 
                quando você usa nosso serviço.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Informações que Coletamos</h2>
              <p className="text-muted-foreground mb-2">
                Coletamos as seguintes informações:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li><strong>Informações de Conta:</strong> Nome, endereço de e-mail e senha (criptografada)</li>
                <li><strong>Dados de Negócio:</strong> Produtos, clientes, transações e outras informações relacionadas ao seu negócio</li>
                <li><strong>Informações de Uso:</strong> Como você interage com nosso serviço, incluindo páginas visitadas e ações realizadas</li>
                <li><strong>Informações Técnicas:</strong> Endereço IP, tipo de navegador, sistema operacional e informações do dispositivo</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Como Usamos suas Informações</h2>
              <p className="text-muted-foreground mb-2">
                Usamos suas informações para:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Fornecer, manter e melhorar nossos serviços</li>
                <li>Processar transações e enviar notificações relacionadas</li>
                <li>Enviar comunicações importantes sobre o serviço</li>
                <li>Detectar, prevenir e resolver problemas técnicos</li>
                <li>Cumprir obrigações legais e regulamentares</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Compartilhamento de Informações</h2>
              <p className="text-muted-foreground">
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto nas seguintes circunstâncias:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4 mt-2">
                <li>Com seu consentimento explícito</li>
                <li>Para cumprir obrigações legais ou responder a processos legais</li>
                <li>Com prestadores de serviços que nos ajudam a operar nosso serviço (sob acordos de confidencialidade)</li>
                <li>Em caso de fusão, aquisição ou venda de ativos (com notificação prévia)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Segurança dos Dados</h2>
              <p className="text-muted-foreground">
                Implementamos medidas de segurança técnicas e organizacionais apropriadas para proteger suas informações 
                contra acesso não autorizado, alteração, divulgação ou destruição. Isso inclui criptografia, controles 
                de acesso e monitoramento regular de segurança.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Seus Direitos</h2>
              <p className="text-muted-foreground mb-2">
                Você tem o direito de:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Acessar suas informações pessoais</li>
                <li>Corrigir informações incorretas ou incompletas</li>
                <li>Solicitar a exclusão de suas informações pessoais</li>
                <li>Opor-se ao processamento de suas informações</li>
                <li>Solicitar a portabilidade de seus dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Cookies e Tecnologias Similares</h2>
              <p className="text-muted-foreground">
                Usamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso do serviço e 
                personalizar conteúdo. Você pode controlar cookies através das configurações do seu navegador.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Retenção de Dados</h2>
              <p className="text-muted-foreground">
                Retemos suas informações pessoais apenas pelo tempo necessário para cumprir os propósitos descritos 
                nesta política, a menos que um período de retenção mais longo seja exigido ou permitido por lei.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Alterações nesta Política</h2>
              <p className="text-muted-foreground">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças 
                significativas publicando a nova política nesta página e atualizando a data de "Última atualização".
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Contato</h2>
              <p className="text-muted-foreground">
                Se você tiver dúvidas ou preocupações sobre esta Política de Privacidade ou sobre como tratamos suas 
                informações pessoais, entre em contato conosco através da página 
                <Link to="/fale-conosco" className="text-primary hover:underline ml-1">Fale Conosco</Link>.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
