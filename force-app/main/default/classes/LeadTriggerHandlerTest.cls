@isTest
private class LeadTriggerHandlerTest {
  @TestSetup
  static void makeData() {
    Profile p = [
      SELECT Id
      FROM Profile
      WHERE Name = 'Minimum Access - API Only Integrations'
    ];

    User u1 = new User(
      Username = 'test.user1@reinocapital.com.test',
      LastName = 'Testing1',
      FirstName = 'Test1',
      Email = 'test.user1@reinocapital.com.test',
      Alias = 'test1',
      TimeZoneSidKey = 'America/Sao_Paulo',
      LocaleSidKey = 'pt_BR',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'pt_BR',
      ProfileId = p.Id
    );

    User u2 = new User(
      Username = 'test.user2@reinocapital.com.test',
      LastName = 'Testing2',
      FirstName = 'Test2',
      Email = 'test.user2@reinocapital.com.test',
      Alias = 'test2',
      TimeZoneSidKey = 'America/Sao_Paulo',
      LocaleSidKey = 'pt_BR',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'pt_BR',
      ProfileId = p.Id
    );

    insert new List<User>{ u1, u2 };
  }

  @isTest
  static void testCannotDeleteOthersLead() {
    List<User> users = [
      SELECT Id
      FROM User
      WHERE Email LIKE 'test.user%@reinocapital.com.test'
      ORDER BY Email
    ];
    User u1 = users[0];
    User u2 = users[1];

    System.runAs(u1) {
      Lead l = new Lead(LastName = 'Teste', Company = 'Empresa');
      insert l;

      System.runAs(u2) {
        Test.startTest();
        try {
          delete l;
          System.assert(
            false,
            'Deveria ter falhado ao deletar lead de outro usuário'
          );
        } catch (DmlException e) {
          String msg = e.getDmlMessage(0);
          System.assert(
            msg.contains(
              'Você só pode excluir Leads que foram criados por você.'
            ) || msg.contains('insufficient access rights'),
            'Mensagem de erro incorreta: ' + msg
          );
        }
        Test.stopTest();
      }
    }
  }

  @isTest
  static void testCanDeleteOwnLead() {
    User u = [
      SELECT Id
      FROM User
      WHERE Email LIKE 'test.user1@reinocapital.com.test'
      LIMIT 1
    ];

    System.runAs(u) {
      Lead l = new Lead(LastName = 'Meu Lead', Company = 'Empresa');
      insert l;

      Test.startTest();
      delete l;
      Test.stopTest();

      List<Lead> deletedLead = [SELECT Id FROM Lead WHERE Id = :l.Id];
      System.assertEquals(
        0,
        deletedLead.size(),
        'O lead deveria ter sido excluído com sucesso'
      );
    }
  }

  @IsTest
  static void testCannotDeleteConvertedLead() {
    User u = [
      SELECT Id
      FROM User
      WHERE Email LIKE 'test.user1@reinocapital.com.test'
      LIMIT 1
    ];

    System.runAs(u) {
      // Criar conta e contato necessários para conversão
      Account acc = new Account(Name = 'Teste Account');
      insert acc;

      Contact con = new Contact(LastName = 'Teste Contact', AccountId = acc.Id);
      insert con;

      // Consulta os valores válidos para o status de conversão
      LeadStatus convertStatus = [
        SELECT Id, MasterLabel
        FROM LeadStatus
        WHERE IsConverted = TRUE
        LIMIT 1
      ];

      Lead l = new Lead(
        LastName = 'Teste',
        Company = 'Empresa',
        Status = 'Qualificado' // Use um status válido que permita conversão
      );
      insert l;

      Database.LeadConvert lc = new Database.LeadConvert();
      lc.setLeadId(l.Id);
      lc.setAccountId(acc.Id);
      lc.setContactId(con.Id);
      lc.setConvertedStatus(convertStatus.MasterLabel); // Use um status válido de conversão

      Test.startTest();
      Database.LeadConvertResult lcr = Database.convertLead(lc);
      System.assert(
        lcr.isSuccess(),
        'A conversão do Lead deveria ter sido bem sucedida'
      );

      try {
        delete l;
        System.assert(
          false,
          'Deveria ter falhado ao tentar excluir lead convertido'
        );
      } catch (DmlException e) {
        System.assert(
          e.getMessage().contains('Lead já convertido não pode ser excluído.'),
          'Mensagem de erro esperada'
        );
      }
      Test.stopTest();
    }
  }

  @isTest
  static void testInvalidEmailFormat() {
    Lead l = new Lead(
      LastName = 'Teste',
      Company = 'Empresa',
      Email = 'emailinvalido'
    );

    Test.startTest();
    try {
      insert l;
      System.assert(false, 'Deveria ter falhado com email inválido');
    } catch (DmlException e) {
      System.assertEquals(
        'Email: endereço de email inválido: emailinvalido',
        e.getDmlMessage(0),
        'Mensagem de erro incorreta'
      );
    }
    Test.stopTest();
  }

  @isTest
  static void testInvalidPhoneFormat() {
    Lead l = new Lead(
      LastName = 'Teste',
      Company = 'Empresa',
      Phone = 'abc123'
    );

    Test.startTest();
    try {
      insert l;
      System.assert(false, 'Deveria ter falhado com telefone inválido');
    } catch (DmlException e) {
      System.assert(
        e.getMessage().contains('apenas números'),
        'Mensagem de erro esperada'
      );
    }
    Test.stopTest();
  }

  @isTest
  static void testRequiredRatingOnClosedStatus() {
    Lead l = new Lead(LastName = 'Teste', Company = 'Empresa');
    insert l;

    l.Status = 'Fechado';

    Test.startTest();
    try {
      update l;
      System.assert(false, 'Deveria ter falhado sem Rating');
    } catch (DmlException e) {
      System.assert(
        e.getMessage().contains('Rating é obrigatório'),
        'Mensagem de erro esperada'
      );
    }
    Test.stopTest();
  }

  @isTest
  static void testValidLeadUpdate() {
    Lead l = new Lead(
      LastName = 'Teste',
      Company = 'Empresa',
      Email = 'teste@email.com',
      Phone = '123456789'
    );
    insert l;

    l.Status = 'Fechado';
    l.Rating = 'Hot';

    Test.startTest();
    update l;
    Test.stopTest();

    Lead updatedLead = [SELECT Status, Rating FROM Lead WHERE Id = :l.Id];
    System.assertEquals('Fechado', updatedLead.Status);
    System.assertEquals('Hot', updatedLead.Rating);
  }
}
