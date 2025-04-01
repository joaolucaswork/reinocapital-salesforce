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
   * @description Busca registros do objeto BackOffice__c para exibição no Kanban
   * @return List<BackOffice__c> Lista de registros do BackOffice
   *
   * Anotações importantes:
   * - @AuraEnabled(cacheable=true): Permite caching dos resultados para melhor performance
   * - WITH SECURITY_ENFORCED: Garante verificação de permissões FLS/CRUD
   * - LIMIT 1000: Boa prática para evitar problemas de performance e limites do Salesforce
   */
  @AuraEnabled(cacheable=true)
  public static List<BackOffice__c> getRecords() {
    return [
      SELECT
        Id,
        Name,
        EtapaBO__c,
        NomeClienteBO__c,
        OwnerId,
        CreatedDate,
        LastModifiedDate
      FROM BackOffice__c
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
    // Verificação de registros ativos do usuário atual
    List<BackOffice__c> activeRecords = [
      SELECT Id
      FROM BackOffice__c
      WHERE
        OwnerId = :UserInfo.getUserId()
        AND EtapaBO__c != 'Recebidas'
        AND EtapaBO__c != 'Em Análise'
        AND EtapaBO__c != 'Pendências Internas'
        AND EtapaBO__c != 'Pendências Externas'
        AND EtapaBO__c != 'Em Validação'
        AND EtapaBO__c != 'Finalizadas'
        AND EtapaBO__c != 'Canceladas'
        AND Id != :recordId
      WITH SECURITY_ENFORCED
      LIMIT 1
    ];

    // Validação de regra de negócio: uma tarefa por vez
    if (
      !activeRecords.isEmpty() &&
      newStatus != 'Finalizadas' &&
      newStatus != 'Canceladas'
    ) {
      throw new AuraHandledException(
        'Você já possui uma tarefa em andamento. Finalize-a antes de mover outra.'
      );
    }

    // Atualização do registro após validação
    BackOffice__c record = new BackOffice__c(
      Id = recordId,
      EtapaBO__c = newStatus
    );

    try {
      update record;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}
