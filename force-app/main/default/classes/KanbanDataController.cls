/**
 * @description Controlador para o componente Kanban
 * Este controlador pode ser adaptado para qualquer objeto do Salesforce
 * Para adaptar:
 * 1. Altere o tipo de retorno da função getRecords
 * 2. Modifique a query SOQL para selecionar os campos necessários
 * 3. Ajuste os parâmetros das funções conforme necessário
 */
public with sharing class KanbanDataController {
  /**
   * @description Retorna a lista de registros para exibição no Kanban
   * @return List<Opportunity> Lista de oportunidades
   * Para adaptar para outro objeto:
   * 1. Altere o tipo de retorno
   * 2. Modifique os campos na query
   * 3. Ajuste as condições WHERE conforme necessário
   */
  @AuraEnabled(cacheable=true)
  public static List<Opportunity> getRecords() {
    return [
      SELECT
        Id,
        Name,
        StageName, // Campo que define as colunas do Kanban
        Amount, // Campo de valor
        CloseDate, // Campo de data
        Account.Name, // Campo de relacionamento
        Probability, // Campo de probabilidade
        Probabilidade_da_Oportunidade__c // Campo customizado
      FROM Opportunity
      ORDER BY CreatedDate DESC
      LIMIT 1000
    ];
  }

  /**
   * @description Atualiza o status de um registro
   * @param recordId Id do registro
   * @param newStatus Novo status
   * Para adaptar:
   * 1. Altere o tipo do objeto
   * 2. Modifique o campo de status
   */
  @AuraEnabled
  public static void updateRecordStatus(Id recordId, String newStatus) {
    // Verificar permissões CRUD
    if (
      !Schema.sObjectType.Opportunity.isUpdateable() ||
      !Schema.sObjectType.Opportunity.fields.StageName.isUpdateable()
    ) {
      throw new AuraHandledException(
        'Você não tem permissão para atualizar oportunidades.'
      );
    }

    // Verificação de registros ativos para o usuário atual
    List<Opportunity> activeOpps = [
      SELECT Id
      FROM Opportunity
      WHERE
        OwnerId = :UserInfo.getUserId()
        AND StageName = 'Em Negociação'
        AND Id != :recordId
      WITH SECURITY_ENFORCED
      LIMIT 1
    ];

    // Validação de regra de negócio: uma oportunidade em negociação por vez
    if (!activeOpps.isEmpty() && newStatus == 'Em Negociação') {
      throw new AuraHandledException(
        'Você já possui uma oportunidade em negociação. Finalize-a antes de mover outra.'
      );
    }

    // Atualização do registro após validação
    Opportunity opp = new Opportunity(Id = recordId, StageName = newStatus);

    try {
      update opp;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Exclui um registro
   * @param recordId Id do registro
   */
  @AuraEnabled
  public static void deleteRecord(Id recordId) {
    // Verificar permissões CRUD
    if (!Schema.sObjectType.Opportunity.isDeletable()) {
      throw new AuraHandledException(
        'Você não tem permissão para excluir oportunidades.'
      );
    }

    try {
      Opportunity opp = new Opportunity(Id = recordId);
      delete opp;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Clona um registro
   * @param recordId Id do registro
   */
  @AuraEnabled
  public static Id cloneRecord(Id recordId) {
    // Verificar permissões CRUD
    if (!Schema.sObjectType.Opportunity.isCreateable()) {
      throw new AuraHandledException(
        'Você não tem permissão para criar oportunidades.'
      );
    }

    try {
      // Buscar a oportunidade original com todos os campos necessários
      Opportunity originalOpp = [
        SELECT Name, StageName, Amount, CloseDate, AccountId
        FROM Opportunity
        WHERE Id = :recordId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      // Criar nova oportunidade com os mesmos dados
      Opportunity clonedOpp = new Opportunity(
        Name = originalOpp.Name + ' - Cópia',
        StageName = 'Sem contato', // Sempre começa como sem contato
        Amount = originalOpp.Amount,
        CloseDate = originalOpp.CloseDate,
        AccountId = originalOpp.AccountId
      );

      insert clonedOpp;
      return clonedOpp.Id;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Exclui múltiplos registros
   * @param recordIds Lista de Ids dos registros
   */
  @AuraEnabled
  public static void deleteRecordsInBulk(List<Id> recordIds) {
    // Verificar permissões CRUD
    if (!Schema.sObjectType.Opportunity.isDeletable()) {
      throw new AuraHandledException(
        'Você não tem permissão para excluir oportunidades.'
      );
    }

    try {
      List<Opportunity> oppsToDelete = [
        SELECT Id
        FROM Opportunity
        WHERE Id IN :recordIds
        WITH SECURITY_ENFORCED
      ];
      delete oppsToDelete;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}
