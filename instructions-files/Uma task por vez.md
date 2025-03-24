# Uma task por vez

No sales force tenho um kanban de um objeto que está sendo agrupado pelo campo lista de opções com o nome de API Etapa onde tenho um registro. Quero fazer uma opção (regra de validação ou Flow builder) para um usuario conseguir mover somente uma task (um registro) por vez.

as opções são

Recebidas (Todas chegam com essa por padrão)

Em análise

Pendências internas

Pendências externas

Em validação

Finalizadas

Canceladas

O que eu pensei: usar o campo lista de opções, e quando um card estiver com uma opção selecionada bloquear outros cards. mas está muito vago na minha mente, me ajude a figurar como fazer da melhor forma.

## Reposta

### Abordagem com Flow Builder

1. **Disparo do Fluxo:**
   Crie um fluxo disparado por registro (Record-Triggered Flow) no objeto em questão. Configure-o para disparar tanto na criação quanto na atualização, se necessário.
2. **Identificação do Usuário e Status:**
   No fluxo, use um elemento “Get Records” para buscar outros registros da task que:
   - Pertencem ao mesmo usuário (ou estejam associados à mesma “responsabilidade”);
   - Já tenham sido movidos de “Recebidas” para algum dos outros status (por exemplo, “Em análise”, “Pendências internas”, etc.), dependendo da lógica de negócio.
3. **Lógica de Decisão:**
   Após a consulta, insira um elemento “Decision” para verificar se existe algum registro que atenda a esses critérios.
   - **Se houver um registro ativo em um status diferente de “Recebidas”:**
     O fluxo deve impedir que o usuário mova outro card.
   - **Se não houver:**
     Permita que a atualização prossiga.
4. **Mensagem de Erro:**
   Caso a condição de “uma task por vez” seja violada, o fluxo pode interromper a operação e retornar uma mensagem de erro personalizada, informando o usuário que ele já possui uma task ativa e que deverá finalizá-la ou cancelá-la antes de mover outra.

### Pontos a Considerar

- **Limitações da Regra de Validação:**
  Como mencionado, a regra de validação não pode acessar outros registros, logo não é possível usá-la para essa verificação de “unicidade” no contexto do usuário.
- **Cenários Específicos:**
  Pense bem nos status que deverão ser considerados “ativos” (por exemplo, pode ser que apenas os status “Em análise”, “Pendências internas/externas” e “Em validação” sejam contados, deixando “Finalizadas” e “Canceladas” de fora).
- **Testes:**
  Após configurar o fluxo, faça testes com diferentes cenários para garantir que a lógica está bloqueando corretamente a movimentação de múltiplos cards pelo mesmo usuário.
