public with sharing class KanbanDataController {
  @AuraEnabled(cacheable=true)
  public static List<Opportunity> getRecords() {
    return [
      SELECT
        Id,
        Name,
        StageName,
        Amount,
        CloseDate,
        Account.Name,
        Probability,
        Probabilidade_da_Oportunidade__c
      FROM Opportunity
      ORDER BY CreatedDate DESC
      LIMIT 1000
    ];
  }

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

    // Lista de status válidos
    Set<String> validStatuses = new Set<String>{
      'Sem contato',
      'Primeiro Contato',
      'Primeira Reunião',
      'Em Negociação',
      'Análise Contratual',
      'Convertido',
      'Perdido'
    };

    // Verificar se o status é válido
    if (!validStatuses.contains(newStatus)) {
      throw new AuraHandledException('Status inválido: ' + newStatus);
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

  @AuraEnabled
  public static void deleteRecord(Id recordId) {
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

  @AuraEnabled
  public static Id cloneRecord(Id recordId) {
    if (!Schema.sObjectType.Opportunity.isCreateable()) {
      throw new AuraHandledException(
        'Você não tem permissão para criar oportunidades.'
      );
    }

    try {
      Opportunity originalOpp = [
        SELECT Name, StageName, Amount, CloseDate, AccountId
        FROM Opportunity
        WHERE Id = :recordId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      Opportunity clonedOpp = new Opportunity(
        Name = originalOpp.Name + ' - Cópia',
        StageName = 'Sem contato',
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

  @AuraEnabled
  public static void deleteRecordsInBulk(List<Id> recordIds) {
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
