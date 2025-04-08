public class LeadTriggerHandler {
  public static void handleBeforeDelete(List<Lead> oldLeads) {
    if (Trigger.isDelete) {
      Map<Id, Lead> leadsWithCreator = new Map<Id, Lead>(
        [
          SELECT Id, CreatedById, IsConverted
          FROM Lead
          WHERE Id IN :oldLeads
        ]
      );

      for (Lead lead : oldLeads) {
        Lead leadWithCreator = leadsWithCreator.get(lead.Id);
        if (leadWithCreator.CreatedById != UserInfo.getUserId()) {
          lead.addError(
            'Você só pode excluir Leads que foram criados por você.'
          );
        }
        if (leadWithCreator.IsConverted) {
          lead.addError('Lead já convertido não pode ser excluído.');
        }
      }
    }
  }

  public static void handleBeforeInsert(List<Lead> newLeads) {
    for (Lead lead : newLeads) {
      validateEmailFormat(lead);
      validatePhoneFormat(lead);
    }
  }

  public static void handleBeforeUpdate(
    List<Lead> newLeads,
    Map<Id, Lead> oldLeadsMap
  ) {
    for (Lead lead : newLeads) {
      Lead oldLead = oldLeadsMap.get(lead.Id);
      validateEmailFormat(lead);
      validatePhoneFormat(lead);

      if (
        oldLead.Status != lead.Status &&
        lead.Status == 'Fechado' &&
        String.isBlank(lead.Rating)
      ) {
        lead.addError('Rating é obrigatório para Leads com status Fechado.');
      }
    }
  }

  private static void validateEmailFormat(Lead lead) {
    if (String.isNotBlank(lead.Email) && !lead.Email.contains('@')) {
      lead.Email.addError('Email inválido. Deve conter @.');
    }
  }

  private static void validatePhoneFormat(Lead lead) {
    if (String.isNotBlank(lead.Phone) && !lead.Phone.isNumeric()) {
      lead.Phone.addError('Telefone deve conter apenas números.');
    }
  }
}
