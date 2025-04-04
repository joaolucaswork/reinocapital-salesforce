@isTest
private class KanbanDataControllerTest {
  @TestSetup
  static void makeData() {
    Account testAccount = new Account(Name = 'Conta Teste');
    insert testAccount;

    List<Opportunity> testOpps = new List<Opportunity>();
    testOpps.add(
      new Opportunity(
        Name = 'Oportunidade Teste 1',
        AccountId = testAccount.Id,
        StageName = 'Sem contato',
        CloseDate = Date.today().addDays(30),
        Amount = 10000,
        Probabilidade_da_Oportunidade__c = '89%'
      )
    );
    testOpps.add(
      new Opportunity(
        Name = 'Oportunidade Teste 2',
        AccountId = testAccount.Id,
        StageName = 'Em Negociação',
        CloseDate = Date.today().addDays(30),
        Amount = 20000,
        Probabilidade_da_Oportunidade__c = '34%'
      )
    );
    insert testOpps;
  }

  @isTest
  static void testGetRecords() {
    Test.startTest();
    List<Opportunity> records = KanbanDataController.getRecords();
    Test.stopTest();

    System.assertEquals(2, records.size(), 'Deveria retornar 2 oportunidades');
    System.assertEquals(
      'Conta Teste',
      records[0].Account.Name,
      'Nome da conta incorreto'
    );
    System.assert(
      records[0].Probabilidade_da_Oportunidade__c != null,
      'Probabilidade não deve ser nula'
    );
  }

  @isTest
  static void testUpdateRecordStatus() {
    Opportunity opp = [
      SELECT Id
      FROM Opportunity
      WHERE Name = 'Oportunidade Teste 1'
      LIMIT 1
    ];

    Test.startTest();
    KanbanDataController.updateRecordStatus(opp.Id, 'Primeiro Contato');
    Test.stopTest();

    Opportunity updatedOpp = [
      SELECT StageName
      FROM Opportunity
      WHERE Id = :opp.Id
    ];
    System.assertEquals(
      'Primeiro Contato',
      updatedOpp.StageName,
      'Status não foi atualizado corretamente'
    );
  }

  @isTest
  static void testUpdateRecordStatusToValidStage() {
    Opportunity opp = [
      SELECT Id
      FROM Opportunity
      WHERE Name = 'Oportunidade Teste 1'
      LIMIT 1
    ];

    Test.startTest();
    KanbanDataController.updateRecordStatus(opp.Id, 'Em Negociação');
    Test.stopTest();

    Opportunity updatedOpp = [
      SELECT StageName
      FROM Opportunity
      WHERE Id = :opp.Id
    ];
    System.assertEquals(
      'Em Negociação',
      updatedOpp.StageName,
      'Status não foi atualizado corretamente para Em Negociação'
    );
  }

  @isTest
  static void testDeleteRecord() {
    Opportunity opp = [
      SELECT Id
      FROM Opportunity
      WHERE Name = 'Oportunidade Teste 1'
      LIMIT 1
    ];

    Test.startTest();
    KanbanDataController.deleteRecord(opp.Id);
    Test.stopTest();

    List<Opportunity> remainingOpps = [
      SELECT Id
      FROM Opportunity
      WHERE Id = :opp.Id
    ];
    System.assertEquals(
      0,
      remainingOpps.size(),
      'Oportunidade não foi deletada'
    );
  }

  @isTest
  static void testCloneRecord() {
    Opportunity opp = [
      SELECT Id
      FROM Opportunity
      WHERE Name = 'Oportunidade Teste 1'
      LIMIT 1
    ];

    Test.startTest();
    Id clonedId = KanbanDataController.cloneRecord(opp.Id);
    Test.stopTest();

    Opportunity clonedOpp = [
      SELECT Name, StageName
      FROM Opportunity
      WHERE Id = :clonedId
    ];
    System.assert(
      clonedOpp.Name.contains('Cópia'),
      'Nome da oportunidade clonada incorreto'
    );
    System.assertEquals(
      'Sem contato',
      clonedOpp.StageName,
      'Status inicial incorreto'
    );
  }

  @isTest
  static void testDeleteRecordsInBulk() {
    List<Opportunity> opps = [SELECT Id FROM Opportunity];
    List<Id> oppIds = new List<Id>();
    for (Opportunity opp : opps) {
      oppIds.add(opp.Id);
    }

    Test.startTest();
    KanbanDataController.deleteRecordsInBulk(oppIds);
    Test.stopTest();

    List<Opportunity> remainingOpps = [SELECT Id FROM Opportunity];
    System.assertEquals(
      0,
      remainingOpps.size(),
      'Oportunidades não foram deletadas em massa'
    );
  }

  @isTest
  static void testInvalidStatusUpdate() {
    Opportunity opp = [
      SELECT Id
      FROM Opportunity
      WHERE Name = 'Oportunidade Teste 1'
      LIMIT 1
    ];

    Test.startTest();
    try {
      KanbanDataController.updateRecordStatus(opp.Id, 'Status Inválido');
      System.assert(
        false,
        'Deveria ter lançado uma exceção para status inválido'
      );
    } catch (Exception e) {
      System.assert(true, 'Exceção esperada foi lançada para status inválido');
    }
    Test.stopTest();
  }

  @isTest
  static void testDeleteNonExistentRecord() {
    Test.startTest();
    try {
      KanbanDataController.deleteRecord('006000000000000');
      System.assert(
        false,
        'Deveria ter lançado uma exceção ao tentar deletar registro inexistente'
      );
    } catch (Exception e) {
      System.assert(
        true,
        'Exceção esperada foi lançada ao tentar deletar registro inexistente'
      );
    }
    Test.stopTest();
  }

  // Teste para getAvailableObjects
  // Verifica se os objetos disponíveis estão sendo retornados corretamente
  @isTest
  static void testGetAvailableObjects() {
    Test.startTest();
    List<Map<String, String>> objects = KanbanDataController.getAvailableObjects();
    Test.stopTest();

    System.assert(
      objects.size() > 0,
      'Deveria retornar pelo menos um objeto acessível'
    );
    System.assert(
      objects[0].containsKey('label'),
      'Cada objeto deveria ter uma label'
    );
    System.assert(
      objects[0].containsKey('value'),
      'Cada objeto deveria ter um value'
    );
  }

  // Teste para getAvailableFields
  // Verifica se os campos disponíveis para o objeto Opportunity estão sendo retornados corretamente
  @isTest
  static void testGetAvailableFields() {
    Test.startTest();
    List<Map<String, String>> fields = KanbanDataController.getAvailableFields(
      'Opportunity'
    );
    Test.stopTest();

    System.assert(
      fields.size() > 0,
      'Deveria retornar pelo menos um campo da Opportunity'
    );
    System.assert(
      fields[0].containsKey('label'),
      'Cada campo deveria ter um label'
    );
    System.assert(
      fields[0].containsKey('value'),
      'Cada campo deveria ter um value'
    );
    System.assert(
      fields[0].containsKey('type'),
      'Cada campo deveria ter um tipo'
    );
  }

  // Teste para getPicklistValues
  // Verifica se os valores de picklist estão sendo retornados corretamente
  @isTest
  static void testGetPicklistValuesAndFallback() {
    Test.startTest();
    // Força erro passando um campo inexistente pra cair no bloco de fallback
    List<Map<String, String>> values = KanbanDataController.getPicklistValues(
      'Opportunity',
      'CampoInvalido__c'
    );
    Test.stopTest();

    System.assert(
      values.size() > 0,
      'Deveria retornar valores padrão mesmo com erro'
    );
    System.assertEquals(
      'Sem contato',
      values[0].get('value'),
      'Primeiro valor do fallback deveria ser "Sem contato"'
    );
  }
}
