/**
 * @description Componente Kanban para visualização e gerenciamento de registros do BackOffice
 * com navegação por abas no estilo Pipeline do Salesforce
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
  activeTabIndex = 0; // Índice da aba ativa

  // Mapeamento de status para ícones
  statusIconMap = {
    Recebidas: "utility:inbox",
    "Em Análise": "utility:preview",
    "Pendências Internas": "utility:pause",
    "Pendências Externas": "utility:warning",
    "Em Validação": "utility:check",
    Finalizadas: "utility:success",
    Canceladas: "utility:error"
  };

  /**
   * @description Wire adapter para buscar registros do Apex
   */
  @wire(getRecords)
  wiredRecords(result) {
    this.wiredRecordsResult = result;
    if (result.data) {
      this.error = undefined;
      this.formatData(result.data);
    } else if (result.error) {
      this.error = result.error;
      this.showToast("Error", "Error loading records", "error");
    }
  }

  /**
   * @description Formata os dados para exibição no Pipeline
   * Adiciona propriedades para controle da UI de abas
   */
  formatData(records) {
    const statuses = [
      "Recebidas",
      "Em Análise",
      "Pendências Internas",
      "Pendências Externas",
      "Em Validação",
      "Finalizadas",
      "Canceladas"
    ];

    this.columns = statuses.map((status, index) => {
      // Filtrar registros por status
      const statusRecords = records.filter(
        (record) => record.EtapaBO__c === status
      );

      // Adicionar ícone a cada registro
      const recordsWithIcons = statusRecords.map((record) => ({
        ...record,
        iconName: this.statusIconMap[record.EtapaBO__c] || "utility:record"
      }));

      // Propriedades para o sistema de abas
      const isActive = index === this.activeTabIndex;
      const tabId = `tab-${status.toLowerCase().replace(/ /g, "-")}`;
      const tabPanelId = `tabPanel-${status.toLowerCase().replace(/ /g, "-")}`;

      return {
        label: status,
        value: status,
        records: recordsWithIcons,
        recordCount: statusRecords.length,
        isEmpty: statusRecords.length === 0,
        // Propriedades para CSS dinâmico das abas
        tabClass: `slds-tabs_default__item ${isActive ? "slds-is-active" : ""}`,
        tabPanelClass: `slds-tabs_default__content ${isActive ? "slds-show" : "slds-hide"}`,
        tabIndex: isActive ? 0 : -1,
        isActive: isActive,
        tabId: tabId,
        tabPanelId: tabPanelId
      };
    });
  }

  /**
   * @description Handler para clique em aba
   * Atualiza a aba ativa e reformata os dados
   */
  handleTabClick(event) {
    // Evitar comportamento padrão
    event.preventDefault();

    // Obter índice da aba clicada
    const clickedTabIndex = parseInt(event.currentTarget.dataset.index, 10);

    // Atualizar aba ativa
    this.activeTabIndex = clickedTabIndex;

    // Reformatar dados com nova aba ativa
    if (this.wiredRecordsResult.data) {
      this.formatData(this.wiredRecordsResult.data);
    }
  }

  /**
   * @description Handler para início do drag de um card
   */
  handleDrag(event) {
    this.draggedRecordId = event.target.dataset.id;

    // Adicionar classe para estilo durante drag
    event.target.classList.add("dragging");
  }

  /**
   * @description Handler para permitir o drop
   */
  allowDrop(event) {
    event.preventDefault();
  }

  /**
   * @description Handler para quando um card é solto em uma coluna
   */
  handleDrop(event) {
    event.preventDefault();
    const newStatus = event.currentTarget.dataset.status;

    // Remover classe de drag de todos os elementos
    this.template.querySelectorAll(".kanban-card").forEach((card) => {
      card.classList.remove("dragging");
    });

    updateRecordStatus({ recordId: this.draggedRecordId, newStatus: newStatus })
      .then(() => {
        this.showToast("Sucesso", "Registro atualizado com sucesso", "success");
        return refreshApex(this.wiredRecordsResult);
      })
      .catch((error) => {
        this.showToast("Erro", error.body.message, "error");
      });
  }

  /**
   * @description Utility para mostrar mensagens toast ao usuário
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
