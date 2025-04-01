/**
 * @description Componente Kanban para visualização e gerenciamento de registros do BackOffice
 *
 * Recursos utilizados:
 * - @wire: Para comunicação com o Apex e cache de dados
 * - @track: Para reatividade de arrays/objetos complexos
 * - Drag and Drop API: Para interação de arrastar/soltar cards
 * - Lightning Platform Show Toast Event: Para feedback ao usuário
 */
import { LightningElement, wire, track } from "lwc";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getRecords from "@salesforce/apex/KanbanDataController.getRecords";
import updateRecordStatus from "@salesforce/apex/KanbanDataController.updateRecordStatus";

export default class KanbanPerson extends LightningElement {
  // Propriedades reativas do componente
  @track columns = []; // Array de colunas do Kanban
  @track error; // Armazena erros para exibição
  wiredRecordsResult; // Armazena resultado do wire para refresh
  draggedRecordId; // ID do registro sendo arrastado

  /**
   * @description Wire adapter para buscar registros do Apex
   * Uso do wire service permite:
   * 1. Cache automático dos dados
   * 2. Reatividade quando os dados mudam
   * 3. Gerenciamento de estado de carregamento/erro
   */
  @wire(getRecords)
  wiredRecords(result) {
    this.wiredRecordsResult = result; // Armazena para refresh posterior
    if (result.data) {
      this.error = undefined;
      this.formatData(result.data);
    } else if (result.error) {
      this.error = result.error;
      this.showToast("Error", "Error loading records", "error");
    }
  }

  /**
   * @description Formata os dados para exibição no Kanban
   * @param {Array} records - Registros retornados do Apex
   *
   * Estrutura criada:
   * columns = [
   *   {
   *     label: "Nome do Status",
   *     value: "Status_API_Value",
   *     records: [...registros filtrados],
   *     recordCount: número de registros
   *   },
   *   ...
   * ]
   */
  formatData(records) {
    // Define os status possíveis e sua ordem
    const statuses = [
      "Recebidas",
      "Em Análise",
      "Pendências Internas",
      "Pendências Externas",
      "Em Validação",
      "Finalizadas",
      "Canceladas"
    ];

    // Cria as colunas com registros filtrados
    this.columns = statuses.map((status) => ({
      label: status,
      value: status,
      records: records.filter((record) => record.EtapaBO__c === status),
      recordCount: records.filter((record) => record.EtapaBO__c === status)
        .length
    }));
  }

  /**
   * @description Handler para início do drag de um card
   * Armazena o ID do registro sendo arrastado
   */
  handleDrag(event) {
    this.draggedRecordId = event.target.dataset.id;
  }

  /**
   * @description Handler para permitir o drop
   * Necessário para funcionamento do drag and drop HTML5
   */
  allowDrop(event) {
    event.preventDefault();
  }

  /**
   * @description Handler para quando um card é solto em uma coluna
   * 1. Previne comportamento padrão do navegador
   * 2. Obtém o novo status da coluna
   * 3. Chama o Apex para atualizar o registro
   * 4. Atualiza a UI com feedback
   */
  handleDrop(event) {
    event.preventDefault();
    const newStatus = event.currentTarget.dataset.status;

    updateRecordStatus({ recordId: this.draggedRecordId, newStatus: newStatus })
      .then(() => {
        this.showToast("Success", "Record updated successfully", "success");
        return refreshApex(this.wiredRecordsResult);
      })
      .catch((error) => {
        this.showToast("Error", error.body.message, "error");
      });
  }

  /**
   * @description Utility para mostrar mensagens toast ao usuário
   * @param {String} title - Título do toast
   * @param {String} message - Mensagem a ser exibida
   * @param {String} variant - Tipo do toast (success, error, warning, info)
   */
  showToast(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({
        title: title,
        message: message,
        variant: variant
      })
    );
  }
}
