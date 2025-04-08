trigger LeadTrigger on Lead(before insert, before update, before delete) {
  if (Trigger.isBefore) {
    if (Trigger.isDelete) {
      LeadTriggerHandler.handleBeforeDelete(Trigger.old);
    } else if (Trigger.isInsert) {
      LeadTriggerHandler.handleBeforeInsert(Trigger.new);
    } else if (Trigger.isUpdate) {
      LeadTriggerHandler.handleBeforeUpdate(Trigger.new, Trigger.oldMap);
    }
  }
}
