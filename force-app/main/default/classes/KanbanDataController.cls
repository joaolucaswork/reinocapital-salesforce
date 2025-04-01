/**
 * @description Controlador Apex para o componente Kanban LWC
 * Gerencia as operações de busca e atualização dos registros do BackOffice
 *
 * Boas Práticas implementadas:
 * - Usa "with sharing" para respeitar regras de compartilhamento
 * - Implementa WITH SECURITY_ENFORCED para segurança em nível de objeto/campo
 * - Utiliza controle de erros e validações de negócio
 */
public with sharing class KanbanDataController {
  /**
   * @description Busca registros do objeto Opportunity para exibição no Kanban
   * @return List<Opportunity> Lista de registros do BackOffice
   *
   * Anotações importantes:
   * - @AuraEnabled(cacheable=true): Permite caching dos resultados para melhor performance
   * - WITH SECURITY_ENFORCED: Garante verificação de permissões FLS/CRUD
   * - LIMIT 1000: Boa prática para evitar problemas de performance e limites do Salesforce
   */
  @AuraEnabled(cacheable=true)
  public static List<Opportunity> getRecords() {
    return [
      SELECT 
        Id,
        Name,
        StageName,
        Amount,
        CloseDate,
        AccountId,
        Account.Name,
        OwnerId,
        CreatedDate,
        LastModifiedDate
      FROM Opportunity
      WITH SECURITY_ENFORCED
      ORDER BY CreatedDate DESC
      LIMIT 1000
    ];
  }

  /**
   * @description Atualiza o status de um registro com validação de regra de negócio
   * @param recordId ID do registro a ser atualizado
   * @param newStatus Novo status para o registro
   *
   * Regra de Negócio:
   * - Um usuário só pode ter uma tarefa em andamento por vez
   * - Exceção: Registros podem ser movidos para 'Finalizadas' ou 'Canceladas'
   *
   * Dicas de implementação:
   * 1. Usa SOQL parametrizado para evitar SOQL injection
   * 2. Implementa tratamento de exceções
   * 3. Valida regras de negócio antes da atualização
   */
  @AuraEnabled
  public static void updateRecordStatus(Id recordId, String newStatus) {
    // Verificar permissões CRUD
    if (!Schema.sObjectType.Opportunity.isUpdateable() ||
        !Schema.sObjectType.Opportunity.fields.StageName.isUpdateable()) {
      throw new AuraHandledException('Você não tem permissão para atualizar oportunidades.');
    }

    // Verificação de registros ativos para o usuário atual
    List<Opportunity> activeOpps = [
      SELECT Id
      FROM Opportunity
      WHERE 
        OwnerId = :UserInfo.getUserId()
        AND StageName = 'Negociação'
        AND Id != :recordId
      WITH SECURITY_ENFORCED
      LIMIT 1
    ];

    // Validação de regra de negócio: uma oportunidade em negociação por vez
    if (!activeOpps.isEmpty() && newStatus == 'Negociação') {
      throw new AuraHandledException(
        'Você já possui uma oportunidade em negociação. Finalize-a antes de mover outra.'
      );
    }

    // Atualização do registro após validação
    Opportunity opp = new Opportunity(
      Id = recordId,
      StageName = newStatus
    );

    try {
      update opp;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}
