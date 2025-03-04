# Guia Prático: Criando Regras de Compartilhamento do Zero

Este guia detalhado vai te orientar passo a passo para criar regras de compartilhamento no Salesforce, de forma a garantir que cada usuário veja somente os registros que lhe foram designados – conforme o seu cenário para os objetos **Operações de Investimento**, **Contas (Clientes)**, **Contas Bancárias** e **Operações Back Office**.

> **Observação:**  
> Para que as regras de compartilhamento funcionem, recomenda-se que os **Organizational-Wide Defaults (OWD)** desses objetos estejam definidos como **Privado**. Assim, somente o dono dos registros e os usuários com regras explícitas terão acesso.

---

## 1. Conceitos Básicos

- **OWD (Organizational-Wide Defaults):**  
  Define o acesso padrão para registros de cada objeto. Em nosso caso, defina como “Privado” para que as regras de compartilhamento sejam necessárias.

- **Regras de Compartilhamento:**  
  São regras que permitem estender o acesso a registros para usuários que não são os donos. Elas podem ser:

  - **Baseadas em Propriedade (Owner-based):** Compartilham registros de acordo com o dono do registro.
  - **Baseadas em Critérios (Criteria-based):** Compartilham registros que atendam a determinados critérios (por exemplo, se um campo “Atribuído a” for igual a um valor específico).

- **Public Groups:**  
  Em alguns cenários, você pode criar grupos públicos para compartilhar registros com um conjunto de usuários. **Atenção:** Se o objetivo é que cada usuário veja somente seus próprios registros designados, o ideal é usar regras baseadas em critérios direcionadas a cada usuário individualmente – especialmente se os registros não forem de propriedade do usuário.

---

## 2. Cenário Específico

### 2.1 Para o Objeto **Operações de Investimento**

- **Head de Operações:**  
  Já terá acesso completo por meio dos conjuntos de permissões e, se estiver acima na hierarquia, acessará todos os registros.
- **Gestor de Operações:**  
  Deve visualizar (e, se necessário, editar) somente os registros que foram **designados a ele** – mesmo que o registro não seja o seu (ou seja, não seja o owner).

### 2.2 Para o Objeto **Operações Back Office**

- **Head de Back Office:**  
  Tem acesso total, normalmente via hierarquia e conjuntos de permissões.
- **Assistente de Back Office:**  
  Deve visualizar e editar somente os registros que foram **atribuídos a ele**.

_Nota:_ Se o campo “Atribuído a” (por exemplo, `Atribuido_a__c`) for um lookup para o usuário, você poderá usar regras baseadas em critérios para compartilhar os registros.

---

## 3. Passo a Passo: Criando Regras de Compartilhamento

### 3.1 Configurar o OWD (Organizational-Wide Defaults)

1. **Acesse o Setup:**

   - Clique no ícone de **Setup** no canto superior direito.

2. **Pesquise por “Sharing Settings”:**

   - Na caixa de pesquisa rápida, digite `Sharing Settings` e selecione a opção.

3. **Verifique os OWD:**
   - Para cada objeto (Operações de Investimento, Contas, Contas Bancárias e Operações Back Office), certifique-se de que o **Default Internal Access** está definido como **Private**.

---

### 3.2 Criando Regras para **Operações de Investimento**

#### Cenário:

- **Gestor de Operações** deve ter acesso aos registros **designados a ele**.

#### Passos:

1. **No Setup, acesse as Sharing Settings:**

   - Dentro de **Sharing Settings**, role até a seção referente ao objeto **Operações de Investimento**.

2. **Clique em “New” na seção de Regras de Compartilhamento para o objeto:**

   - Será aberta a tela para criar uma nova regra.

3. **Selecione o Tipo da Regra:**

   - **Critérios-based Sharing Rule** (Regra baseada em critérios).

4. **Defina os Detalhes da Regra:**
   - **Nome da Regra:**  
     Exemplo: `Compartilhar_Operacoes_Com_Gestor_[NomeDoGestor]`
   - **Critério da Regra:**

     - Selecione o campo que identifica a designação, por exemplo: `Atribuido_a__c` (ou o nome que você tenha definido para indicar a atribuição).
     - Configure o critério para: **igual a** o ID do Gestor de Operações.

     > **Dica:** Se houver apenas 1 Gestor para o grupo, você pode inserir o valor fixo. Caso haja mais de um, considere criar uma regra separada para cada usuário ou usar uma lógica de campo (por exemplo, um checkbox específico) que seja marcado quando o registro for atribuído a um Gestor.
5. **Defina o Grupo de Usuários para Compartilhamento:**

   - Escolha **Users** e, em seguida, selecione o usuário específico (ou um Public Group contendo somente aquele Gestor – se for possível manter o acesso individualizado).

6. **Selecione o Nível de Acesso:**
   - Marque **Read/Write** se o Gestor precisar editar os registros; caso contrário, **Read Only**.
7. **Salvar a Regra.**

> **Repita o mesmo processo para os objetos "Contas (Clientes)" e "Contas Bancárias"** se os mesmos critérios de designação (campo "Atribuido_a\_\_c") forem aplicáveis e se os Gestores precisarem ter acesso aos registros designados.

---

### 3.3 Criando Regras para **Operações Back Office**

#### Cenário:

- **Assistente de Back Office** deve ter acesso somente aos registros **atribuídos a ele**.

#### Passos:

1. **No Setup, acesse as Sharing Settings:**

   - Na seção referente ao objeto **Operações Back Office**.

2. **Clique em “New” para criar uma nova regra de compartilhamento.**

3. **Selecione o Tipo da Regra:**

   - **Critérios-based Sharing Rule**.

4. **Defina os Detalhes da Regra:**

   - **Nome da Regra:**  
     Exemplo: `Compartilhar_BackOffice_Com_Assistente_[NomeDoAssistente]`
   - **Critério da Regra:**
     - Utilize o campo de atribuição, por exemplo: `Atribuido_a__c`.
     - Configure para **igual a** o ID do Assistente de Back Office.

5. **Defina o Grupo de Usuários:**

   - Selecione o usuário específico ou crie um grupo (caso haja somente este assistente no grupo) que contenha somente ele.

6. **Selecione o Nível de Acesso:**

   - Normalmente, **Read/Write** se ele deve editar os registros.

7. **Salvar a Regra.**

---

## 4. Considerações Adicionais e Melhores Práticas

- **Utilize Public Groups com Cuidado:**  
  Se o grupo de usuários contiver mais de um usuário e o objetivo é que cada um veja apenas os seus registros, a utilização de Public Groups pode não ser ideal. Nesse caso, a criação de regras individuais (mesmo que em menor escala) pode ser necessária.

- **Atualização do Dono do Registro:**  
  Uma alternativa ao uso de regras de compartilhamento é atualizar o campo **Owner** do registro para o usuário designado. O proprietário do registro sempre tem acesso total sem necessidade de regras adicionais.

- **Testes em Sandbox:**  
  Sempre teste as regras de compartilhamento em um ambiente sandbox antes de aplicá-las em produção. Crie registros de teste e simule a atribuição para confirmar que somente os usuários desejados têm acesso.

- **Documentação:**  
  Mantenha um registro detalhado de cada regra criada, com o nome da regra, critério utilizado, grupo ou usuário compartilhado e nível de acesso. Essa documentação é essencial para futuras auditorias e ajustes.

- **Monitoramento:**  
  Utilize os **Sharing Recalculation Logs** e os relatórios de auditoria do Salesforce para verificar se as regras estão sendo aplicadas corretamente.

---

## 5. Exemplo Prático para o Objeto **Operações de Investimento**

1. **Acesse Setup → Sharing Settings.**
2. **Localize o objeto “Operações de Investimento”.**
3. **Clique em “New” ao lado de “Operações de Investimento Sharing Rules”.**
4. **Tipo de Regra:** Selecione “Based on Criteria”.
5. **Nome da Regra:** `Compartilhar_Operacoes_Com_Gestor_Joao`  
   _(Substitua “Joao” pelo nome do Gestor)_
6. **Critério da Regra:**
   - Campo: `Atribuido_a__c`
   - Operador: `igual a`
   - Valor: _[ID do usuário Gestor – copie do registro de usuário ou do lookup]_
7. **Compartilhar Com:**
   - Selecione “Users” e escolha o Gestor de Operações.
8. **Nível de Acesso:** Selecione “Read/Write” (ou “Read Only” se a edição não for necessária).
9. **Clique em Save.**

---

## 6. Exemplo Prático para o Objeto **Operações Back Office**

1. **Acesse Setup → Sharing Settings.**
2. **Localize o objeto “Operações Back Office”.**
3. **Clique em “New” na seção de regras para este objeto.**
4. **Tipo de Regra:** Selecione “Based on Criteria”.
5. **Nome da Regra:** `Compartilhar_BackOffice_Com_Assistente_Maria`  
   _(Substitua “Maria” pelo nome do Assistente)_
6. **Critério da Regra:**
   - Campo: `Atribuido_a__c`
   - Operador: `igual a`
   - Valor: _[ID do usuário Assistente]_
7. **Compartilhar Com:**
   - Selecione “Users” e escolha o Assistente de Back Office.
8. **Nível de Acesso:** Selecione “Read/Write”.
9. **Clique em Save.**

---

## Conclusão

Seguindo estes passos detalhados, você será capaz de configurar regras de compartilhamento personalizadas para que os registros dos objetos **Operações de Investimento** e **Operações Back Office** fiquem acessíveis somente aos usuários designados (Gestor de Operações e Assistente de Back Office, respectivamente).

Essas regras, combinadas com as configurações de OWD e os conjuntos de permissões, garantem que a segurança e a integridade dos dados sejam mantidas, permitindo que cada usuário tenha exatamente o acesso necessário para desempenhar suas funções.

_Boa sorte na implementação – e lembre-se de sempre testar e documentar cada mudança!_
