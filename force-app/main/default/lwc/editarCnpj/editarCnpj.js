import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord } from 'lightning/uiRecordApi';
// In this line insert first the object name and then the field name
import CNPJ_FIELD from '@salesforce/schema/OperacaoInvestimento__c.CNPJ_Formatado__c';
import ID_FIELD from '@salesforce/schema/OperacaoInvestimento__c.Id';

export default class EditarCnpj extends LightningElement {
    @api recordId; 
    @track formattedCnpj = '';

    handleInputChange(event) {
        let cnpj = event.target.value.replace(/\D/g, ''); // remove all non-digit characters

        if (cnpj.length > 14) cnpj = cnpj.slice(0, 14);
        if (cnpj.length > 2) cnpj = cnpj.replace(/^(\d{2})(\d)/, '$1.$2');
        if (cnpj.length > 5) cnpj = cnpj.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        if (cnpj.length > 8) cnpj = cnpj.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4');
        if (cnpj.length > 12) cnpj = cnpj.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');

        this.formattedCnpj = cnpj;
    }

    async handleSave() {
        const fields = {};
        fields[ID_FIELD.fieldApiName] = this.recordId;
        fields[CNPJ_FIELD.fieldApiName] = this.formattedCnpj;

        const recordInput = { fields };

        try {
            await updateRecord(recordInput);
            this.dispatchEvent(new ShowToastEvent({
                title: "Sucesso",
                message: "CNPJ atualizado com sucesso!",
                variant: "success"
            }));
            this.closeModal();
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: "Erro",
                message: "Erro ao atualizar o CNPJ",
                variant: "error"
            }));
        }
    }

    handleCancel() {
        this.closeModal();
    }

    closeModal() {
        this.dispatchEvent(new CustomEvent('close'));
    }
}