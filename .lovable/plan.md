

## ResellManager - Sistema de Gestão para Revendedores

### 🎨 Design e Identidade Visual
- **Tema escuro profissional** com backgrounds em Slate/Zinc
- **Cor de destaque**: Emerald Green (#10b981) para lucros e ações positivas
- **Estilo Glassmorphism** nos cards com blur e transparência
- **100% em Português (PT-BR)** - toda interface localizada
- Estética premium estilo Nubank/Inter

---

### 🔐 1. Autenticação e Perfil
**Páginas:** Login, Cadastro, Perfil

- Login/Cadastro com email e senha via Supabase Auth
- Perfil simples do usuário com:
  - Nome da loja/revendedor
  - Foto de perfil (upload via Supabase Storage)
- Row Level Security para isolar dados por usuário

---

### 📊 2. Painel Principal (Dashboard)
**A tela principal com visão completa do negócio**

**4 Cards de Resumo com ícones:**
1. 💰 **Total Investido** - Soma do custo total do estoque
2. 📈 **Receita Prevista** - Potencial de venda total
3. ✨ **Lucro Projetado** - Diferença entre receita e investimento
4. 📊 **ROI Atual** - Retorno percentual calculado

**Seção de Gráficos:**
- Gráfico de linha: Evolução de vendas por dia/semana
- Gráfico de barras: Lucro por período
- Gráfico de pizza: Categorias mais vendidas

**Lista de Movimentações:**
- "Últimas Movimentações" com vendas e compras recentes
- Ícones e cores diferenciando tipo de transação

---

### 📦 3. Gestão de Estoque
**Tabela rica e interativa com todos os produtos**

**Colunas:**
- Produto, Categoria, Quantidade, Preço Custo (R$), Preço Venda (R$), Margem (%), Ações

**Funcionalidades:**
- Badges coloridos para nível de estoque (Verde >5, Laranja <3, Vermelho =0)
- Botão "Vender" em cada linha abrindo modal de confirmação
- Filtros por categoria e busca por nome
- Ordenação por qualquer coluna

---

### ➕ 4. Adicionar Produto (Modal Inteligente)
**Lógica de segurança financeira integrada**

- Campo: Nome do Produto, Categoria, Quantidade
- Campo: **Preço de Custo** (entrada do usuário)
- Campo: **Preço de Venda** (calculado automaticamente com margem 45%)
- Usuário pode ajustar preço de venda manualmente
- ⚠️ Aviso amarelo se margem < 45%: "Atenção: Margem Baixa"
- Exibição em tempo real: **"Lucro Estimado: R$ X,XX"**
- Formatação monetária BR: `R$ 1.234,56`

---

### 🏷️ 5. Gestão de Categorias
**Página para gerenciar categorias personalizadas**

- Lista de categorias criadas pelo usuário
- Adicionar novas categorias
- Editar e excluir categorias existentes
- Visualização de quantos produtos cada categoria possui

---

### 🔔 6. Notificações e Feedback
**Sistema de toasts para ações do usuário**

- Sucesso: "Produto vendido com sucesso! Lucro: R$ 50,00" ✅
- Aviso: Mensagens de margem baixa
- Erro: Feedback claro para problemas

---

### 🗄️ Estrutura do Banco de Dados (Supabase)

**Tabelas:**
- `profiles` - Dados do usuário (nome loja, avatar)
- `categories` - Categorias customizáveis por usuário
- `products` - Produtos do estoque com preços
- `transactions` - Histórico de vendas e compras

**Segurança:**
- RLS em todas as tabelas
- Cada usuário vê apenas seus próprios dados

---

### 📱 Navegação da Aplicação

**Menu lateral (Sidebar):**
- 🏠 Painel Principal
- 📦 Estoque
- ➕ Adicionar Produto
- 🏷️ Categorias
- 👤 Meu Perfil
- 🚪 Sair

