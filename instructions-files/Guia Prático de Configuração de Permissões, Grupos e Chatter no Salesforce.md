# Guia Prático de Configuração de Permissões, Grupos e Chatter no Salesforce

Este guia apresenta um passo a passo “mão na massa” para você criar os conjuntos de permissões, os grupos de conjuntos de permissões e configurar o Chatter com notificações no Salesforce. O objetivo é que você consiga montar um esqueleto robusto e seguro, exatamente como um profissional sênior faria, garantindo a correta divisão de acessos e um fluxo de trabalho otimizado.

---

## Sumário

- [1. Mapeamento dos Requisitos e Fluxo](#1-mapeamento-dos-requisitos-e-fluxo)
  - [1.1 Resumo dos Perfis e Acessos](#11-resumo-dos-perfis-e-acessos)
  - [1.2 Fluxo dos Registros](#12-fluxo-dos-registros)
- [2. Criação dos Conjuntos de Permissões (Permission Sets)](#2-criação-dos-conjuntos-de-permissões-permission-sets)
  - [2.1 Acessando a Área de Conjuntos de Permissões](#21-acessando-a-área-de-conjuntos-de-permissões)
  - [2.2 Conjunto para o Head de Operações](#22-conjunto-para-o-head-de-operações)
  - [2.3 Conjunto para o Gestor de Operações](#23-conjunto-para-o-gestor-de-operações)
  - [2.4 Conjuntos para o Grupo Back Office](#24-conjuntos-para-o-grupo-back-office)
- [3. Criação dos Grupos de Conjuntos de Permissões (Permission Set Groups)](#3-criação-dos-grupos-de-conjuntos-de-permissões-permission-set-groups)
  - [3.1 Grupo para Operações](#31-grupo-para-operações)
  - [3.2 Grupo para Back Office](#32-grupo-para-back-office)
- [4. Mapeamento Visual do Fluxo e Melhorias](#4-mapeamento-visual-do-fluxo-e-melhorias)
- [5. Configuração do Chatter e Notificações](#5-configuração-do-chatter-e-notificações)
  - [5.1 Configurando o Chatter](#51-configurando-o-chatter)
  - [5.2 Configurando Notificações no Chatter e Alternativas](#52-configurando-notificações-no-chatter-e-alternativas)
- [6. Resumo Final e Recomendações](#6-resumo-final-e-recomendações)

---

## 1. Mapeamento dos Requisitos e Fluxo

### 1.1 Resumo dos Perfis e Acessos

**Grupo 01 – Operações**

- **Head de Operações**

  - **Operações de Investimento:** Acesso total (Criar, Editar, Excluir) a **todos** os registros.
  - **Contas (Clientes):** Acesso para **editar** e **visualizar** todos os registros e suas movimentações.
  - **Contas Bancárias:** Acesso para **criar** e **visualizar** todos os registros.
  - **Chatter:** Acesso completo – visualiza, posta, edita e interage livremente.

- **Gestor de Operações**
  - **Operações de Investimento:** Acesso para **criar** e **visualizar** apenas os registros designados a ele.
  - **Contas (Clientes):** Acesso para **visualizar** somente os registros designados a ele.
  - **Contas Bancárias:** Acesso para **visualizar** somente os registros designados a ele.
  - **Chatter:** Acesso restrito – vê apenas as atividades relevantes ao seu grupo.

**Grupo 02 – Back Office**

- **Head de Back Office**

  - **Operações Back Office:** Acesso total (Criar, Editar, Ler e Excluir) a **todos** os registros.
  - **Chatter:** Acesso completo.

- **Assistente de Back Office**
  - **Operações Back Office:** Acesso para **criar**, **editar** e **ler** apenas os registros atribuídos a ele.
  - **Chatter:** Acesso parcial – visualiza somente as atividades atribuídas a ele.

### 1.2 Fluxo dos Registros

- **Criação:**  
  Quando um registro é criado no objeto **Operação de Investimento**, o Flow Builder dispara a criação de um registro correspondente no objeto **Operação Back Office**. Esse registro é exibido em modo Kanban.

- **Atribuição e Notificação:**  
  Os **Heads** (tanto de Operações quanto de Back Office) designam registros para os subordinados (Gestor de Operações e Assistente de Back Office). Neste momento, o fluxo deve notificar os responsáveis por meio de posts no Chatter ou envio de emails.

---

## 2. Criação dos Conjuntos de Permissões (Permission Sets)

### 2.1 Acessando a Área de Conjuntos de Permissões

1. **Acesse o Setup:**  
   Clique no ícone de **Setup** no canto superior direito.

2. **Localize “Permission Sets”:**  
   Use a caixa de pesquisa rápida (Setup Quick Find) e digite `Permission Sets`. Selecione a opção.

### 2.2 Conjunto para o Head de Operações

1. **Clique em “New”:**  
   No canto superior da página de Permission Sets, clique em **New**.

2. **Preencha os Dados:**

   - **Label:** `Head_Operacoes_Investimentos`
   - **Descrição:** `Permissões completas para o Head de Operações – Acesso total aos objetos: Operações de Investimento, Contas (Clientes) e Contas Bancárias.`
   - **Licença do Usuário:** Selecione a licença adequada (geralmente "Salesforce").

3. **Clique em Salvar.**

4. **Configurar as Permissões de Objeto:**

   - **Operações de Investimento:**
     - Vá em **Object Settings** → Selecione o objeto → Clique em **Edit** e marque **Create**, **Read**, **Edit**, **Delete**.
   - **Contas (Clientes):**
     - Em **Object Settings**, selecione o objeto e marque **Read** e **Edit**.
   - **Contas Bancárias:**
     - Em **Object Settings**, selecione o objeto e marque **Create** e **Read**.

5. **Configurações Adicionais:**
   - Ajuste permissões de **Field-Level Security** se necessário.
   - Verifique as configurações de **Chatter** para garantir o acesso total.

### 2.3 Conjunto para o Gestor de Operações

1. **Clique em “New”:**

   - **Label:** `Gestor_Operacoes`
   - **Descrição:** `Permissões limitadas para o Gestor de Operações – acesso somente aos registros que lhe são designados.`
   - Selecione a licença de usuário adequada e clique em **Salvar**.

2. **Configurar as Permissões de Objeto:**

   - **Operações de Investimento:**
     - Marque **Create** e **Read** (não marque **Edit** ou **Delete**).
     - Lembre-se: a limitação aos registros deve ser feita via regras de compartilhamento ou critérios de propriedade.
   - **Contas (Clientes):**
     - Marque apenas **Read**.
   - **Contas Bancárias:**
     - Marque apenas **Read**.

3. **Chatter:**
   - Configure para limitar o que o usuário pode ver ou postar, se necessário, usando **Custom Permissions** ou configurações específicas de Chatter.

### 2.4 Conjuntos para o Grupo Back Office

#### Head de Back Office

1. **Criar Novo Conjunto:**

   - **Label:** `Head_BackOffice`
   - **Descrição:** `Permissões completas para o Head de Back Office – Acesso total ao objeto Back Office.`
   - Clique em **Salvar**.

2. **Configurar Permissões de Objeto:**

   - Em **Object Settings**, selecione o objeto **Back Office** e marque **Create**, **Read**, **Edit**, **Delete**.

3. **Chatter:**
   - Garanta que as configurações de Chatter estejam configuradas para acesso completo.

#### Assistente de Back Office

1. **Criar Novo Conjunto:**

   - **Label:** `Assistente_BackOffice`
   - **Descrição:** `Permissões restritas para o Assistente de Back Office – Acesso somente aos registros atribuídos, com permissão para criar, editar e ler.`
   - Clique em **Salvar**.

2. **Configurar Permissões de Objeto:**

   - Em **Object Settings**, selecione o objeto **Back Office** e marque **Create**, **Read**, **Edit** (não marque **Delete**).

3. **Chatter:**
   - Configure para que o usuário visualize apenas as atividades atribuídas a ele.

---

## 3. Criação dos Grupos de Conjuntos de Permissões (Permission Set Groups)

### 3.1 Grupo para Operações

1. **Acesse “Permission Set Groups”:**  
   Utilize a caixa de pesquisa no Setup e digite `Permission Set Groups`.

2. **Clique em “New”:**

   - **Label:** `Grupo_Operacoes`
   - **Descrição:** `Agrupa as permissões para Head e Gestor de Operações.`
   - Clique em **Salvar**.

3. **Adicionar Conjuntos ao Grupo:**
   - Na página do grupo, clique em **Add Permission Sets**.
   - Selecione os conjuntos `Head_Operacoes_Investimentos` e `Gestor_Operacoes`.
   - Clique em **Add** para confirmar.

### 3.2 Grupo para Back Office

1. **Clique em “New”:**

   - **Label:** `Grupo_BackOffice`
   - **Descrição:** `Agrupa as permissões para Head e Assistente de Back Office.`
   - Clique em **Salvar**.

2. **Adicionar Conjuntos ao Grupo:**
   - Adicione os conjuntos `Head_BackOffice` e `Assistente_BackOffice`.
   - Salve as alterações.

---

## 4. Mapeamento Visual do Fluxo e Melhorias

### 4.1 Esboço do Fluxo Atual

1. **Criação do Registro no Objeto “Operação de Investimento”:**

   - Registro criado manualmente ou via integração.
   - Flow Builder aciona a criação do registro correspondente no objeto **Operação Back Office**.

2. **Atribuição dos Registros:**

   - O **Head de Operações** e o **Head de Back Office** designam registros para os subordinados.

3. **Notificação:**
   - Notificação (via Chatter ou email) é disparada informando o responsável sobre o novo registro.

### 4.2 Melhorias e Ajustes Sugeridos

- **Regras de Compartilhamento:**  
  Configure regras para que os usuários com acesso limitado vejam somente os registros que lhes foram atribuídos.  
  _(Utilize critérios de propriedade ou regras de compartilhamento manual.)_

- **Padronização da Atribuição:**  
  Crie um campo “Status de Atribuição” e utilize o Flow Builder para atualizar automaticamente esse status quando um registro for designado.

- **Diagrama do Fluxo:**

  ```mermaid
  graph TD;
      A[Operação de Investimento] --> B[Flow Builder aciona criação];
      B --> C[Operação Back Office Criada];
      C --> D[Head de Operações];
      C --> E[Head de Back Office];
      D --> F[Gestor de Operações];
      E --> G[Assistente de Back Office];
  ```
