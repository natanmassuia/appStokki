import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';

export default function Termos() {
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
            <CardTitle className="text-3xl">Termos de Uso</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
              <p className="text-muted-foreground">
                Ao acessar e usar o AppStokki, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. 
                Se você não concorda com alguma parte destes termos, não deve usar nosso serviço.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
              <p className="text-muted-foreground">
                O AppStokki é uma plataforma de gestão de estoque e vendas que permite aos usuários gerenciar produtos, 
                clientes, transações e campanhas de marketing. O serviço é fornecido "como está" e está sujeito a alterações 
                ou descontinuação a qualquer momento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Conta do Usuário</h2>
              <p className="text-muted-foreground">
                Você é responsável por manter a confidencialidade de suas credenciais de conta e por todas as atividades 
                que ocorrem sob sua conta. Você concorda em notificar-nos imediatamente sobre qualquer uso não autorizado 
                de sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Uso Aceitável</h2>
              <p className="text-muted-foreground mb-2">
                Você concorda em não usar o AppStokki para:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Qualquer propósito ilegal ou não autorizado</li>
                <li>Violar qualquer lei ou regulamento aplicável</li>
                <li>Infringir direitos de propriedade intelectual de terceiros</li>
                <li>Transmitir vírus, malware ou código malicioso</li>
                <li>Interferir ou interromper o funcionamento do serviço</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Propriedade Intelectual</h2>
              <p className="text-muted-foreground">
                Todo o conteúdo do AppStokki, incluindo mas não limitado a textos, gráficos, logotipos, ícones, imagens, 
                clipes de áudio, downloads digitais e software, é propriedade do AppStokki ou de seus fornecedores de conteúdo 
                e está protegido por leis de direitos autorais internacionais.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Limitação de Responsabilidade</h2>
              <p className="text-muted-foreground">
                O AppStokki não será responsável por quaisquer danos diretos, indiretos, incidentais, especiais ou consequenciais 
                resultantes do uso ou incapacidade de usar o serviço, mesmo que tenhamos sido avisados da possibilidade de tais danos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Modificações dos Termos</h2>
              <p className="text-muted-foreground">
                Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor 
                imediatamente após a publicação. É sua responsabilidade revisar periodicamente estes termos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Contato</h2>
              <p className="text-muted-foreground">
                Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco através da página 
                <Link to="/fale-conosco" className="text-primary hover:underline ml-1">Fale Conosco</Link>.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
