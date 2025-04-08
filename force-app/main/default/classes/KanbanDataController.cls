/**
 * @description Controlador para o componente Kanban genérico
 * Este controlador pode ser adaptado para qualquer objeto do Salesforce
 *
 * Para adaptar para outro objeto:
 * 1. Altere o tipo de retorno do método getRecords para seu objeto
 * 2. Modifique a query SOQL com os campos do seu objeto
 * 3. Atualize os métodos de CRUD para usar seu objeto
 * 4. Ajuste as verificações de permissão para seu objeto
 */
public with sharing class KanbanDataController {
  /**
   * @description Retorna a lista de registros para o Kanban
   * Modifique esta query conforme necessário para seu objeto
   * @return List<SObject> Lista de registros do objeto
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
        Account.Name,
        Nome_do_Lead__c,
        Owner.Name,
        Probability,
        Probabilidade_da_Oportunidade__c
      FROM Opportunity
      WHERE Nome_do_Lead__c != NULL OR Account.Name != NULL
      ORDER BY CreatedDate DESC
      LIMIT 1000
    ];
  }

  /**
   * @description Atualiza o status de um registro
   * @param recordId Id do registro a ser atualizado
   * @param newStatus Novo valor do status
   */
  @AuraEnabled
  public static void updateRecordStatus(Id recordId, String newStatus) {
    // Verificar permissões CRUD
    validateCRUDPermission('update');

    // Lista de status válidos - Atualize conforme seu objeto
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

    try {
      // Para outros objetos, modifique esta parte
      Opportunity record = new Opportunity(
        Id = recordId,
        StageName = newStatus
      );
      update record;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Exclui um registro
   * @param recordId Id do registro a ser excluído
   */
  @AuraEnabled
  public static void deleteRecord(Id recordId) {
    validateCRUDPermission('delete');

    try {
      // Para outros objetos, modifique esta parte
      Opportunity record = new Opportunity(Id = recordId);
      delete record;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Clona um registro
   * @param recordId Id do registro a ser clonado
   * @return Id Id do novo registro clonado
   */
  @AuraEnabled
  public static Id cloneRecord(Id recordId) {
    validateCRUDPermission('create');

    try {
      // Para outros objetos, modifique esta parte
      Opportunity originalRecord = [
        SELECT Name, StageName, Amount, CloseDate, AccountId
        FROM Opportunity
        WHERE Id = :recordId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      Opportunity clonedRecord = new Opportunity(
        Name = originalRecord.Name + ' - Cópia',
        StageName = 'Sem contato', // Status inicial padrão
        Amount = originalRecord.Amount,
        CloseDate = originalRecord.CloseDate,
        AccountId = originalRecord.AccountId
      );

      insert clonedRecord;
      return clonedRecord.Id;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Exclui múltiplos registros
   * @param recordIds Lista de Ids dos registros a serem excluídos
   */
  @AuraEnabled
  public static void deleteRecordsInBulk(List<Id> recordIds) {
    validateCRUDPermission('delete');

    try {
      // Para outros objetos, modifique esta parte
      List<Opportunity> recordsToDelete = [
        SELECT Id
        FROM Opportunity
        WHERE Id IN :recordIds
        WITH SECURITY_ENFORCED
      ];
      delete recordsToDelete;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Valida permissões CRUD no objeto
   * @param operation Operação a ser validada (create, update, delete)
   */
  private static void validateCRUDPermission(String operation) {
    // Para outros objetos, modifique esta parte
    Schema.DescribeSObjectResult describeResult = Opportunity.getSObjectType()
      .getDescribe();

    if (operation == 'create' && !describeResult.isCreateable()) {
      throw new AuraHandledException(
        'Você não tem permissão para criar registros.'
      );
    }
    if (operation == 'update' && !describeResult.isUpdateable()) {
      throw new AuraHandledException(
        'Você não tem permissão para atualizar registros.'
      );
    }
    if (operation == 'delete' && !describeResult.isDeletable()) {
      throw new AuraHandledException(
        'Você não tem permissão para excluir registros.'
      );
    }
  }

  /**
   * @description Retorna uma lista de objetos disponíveis
   * @return List<Map<String,String>> Lista de objetos com label e api name
   */
  @AuraEnabled(cacheable=true)
  public static List<Map<String, String>> getAvailableObjects() {
    List<Map<String, String>> objects = new List<Map<String, String>>();

    for (Schema.SObjectType objType : Schema.getGlobalDescribe().values()) {
      Schema.DescribeSObjectResult describeResult = objType.getDescribe();
      if (describeResult.isAccessible() && describeResult.isQueryable()) {
        objects.add(
          new Map<String, String>{
            'label' => describeResult.getLabel(),
            'value' => describeResult.getName()
          }
        );
      }
    }

    return objects;
  }

  /**
   * @description Retorna campos disponíveis para um objeto específico
   * @param objectName Nome da API do objeto
   * @return List<Map<String,String>> Lista de campos com label e api name
   */
  @AuraEnabled(cacheable=true)
  public static List<Map<String, String>> getAvailableFields(
    String objectName
  ) {
    List<Map<String, String>> fields = new List<Map<String, String>>();

    Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectName);
    if (objectType != null) {
      Map<String, Schema.SObjectField> fieldMap = objectType.getDescribe()
        .fields.getMap();

      for (String fieldName : fieldMap.keySet()) {
        Schema.DescribeFieldResult field = fieldMap.get(fieldName)
          .getDescribe();
        if (field.isAccessible()) {
          fields.add(
            new Map<String, String>{
              'label' => field.getLabel(),
              'value' => field.getName(),
              'type' => String.valueOf(field.getType())
            }
          );
        }
      }
    }

    return fields;
  }

  /**
   * @description Retorna os valores válidos de uma picklist
   * @param objectName Nome da API do objeto
   * @param fieldName Nome da API do campo
   * @return List<Map<String,String>> Lista de valores da picklist
   */
  @AuraEnabled(cacheable=true)
  public static List<Map<String, String>> getPicklistValues(
    String objectName,
    String fieldName
  ) {
    List<Map<String, String>> picklistValues = new List<Map<String, String>>();

    try {
      Schema.SObjectType objectType = Schema.getGlobalDescribe()
        .get(objectName);
      if (objectType != null) {
        Schema.DescribeFieldResult field = objectType.getDescribe()
          .fields.getMap()
          .get(fieldName)
          .getDescribe();

        if (field.getType() == Schema.DisplayType.PICKLIST) {
          for (Schema.PicklistEntry entry : field.getPicklistValues()) {
            if (entry.isActive()) {
              picklistValues.add(
                new Map<String, String>{
                  'label' => entry.getLabel(),
                  'value' => entry.getValue()
                }
              );
            }
          }
        }
      }
      return picklistValues;
    } catch (Exception e) {
      // Return default values if there's an error
      return new List<Map<String, String>>{
        new Map<String, String>{
          'label' => 'Sem contato',
          'value' => 'Sem contato'
        },
        new Map<String, String>{
          'label' => 'Primeiro Contato',
          'value' => 'Primeiro Contato'
        },
        new Map<String, String>{
          'label' => 'Primeira Reunião',
          'value' => 'Primeira Reunião'
        },
        new Map<String, String>{
          'label' => 'Em Negociação',
          'value' => 'Em Negociação'
        },
        new Map<String, String>{
          'label' => 'Análise Contratual',
          'value' => 'Análise Contratual'
        },
        new Map<String, String>{
          'label' => 'Convertido',
          'value' => 'Convertido'
        },
        new Map<String, String>{ 'label' => 'Perdido', 'value' => 'Perdido' }
      };
    }
  }
}
