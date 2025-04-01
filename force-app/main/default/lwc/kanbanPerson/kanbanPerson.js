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
    "Sem contato": "utility:multi_picklist", // Indica múltiplas possibilidades iniciais
    "Primeiro Contato": "utility:filter", // Filtragem/qualificação do lead
    "Primeira Reunião": "utility:file", // Documento/proposta
    "Em Negociação": "utility:adjust_value", // Relacionado a valores/orçamento
    "Análise Contratual": "utility:contract", // Ícone específico para contratos
    Convertido: "utility:success", // Indica sucesso
    Perdido: "utility:error" // Indica que não foi adiante
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
      this.showToast("Erro", "Erro ao carregar registros", "error");
    }
  }

  /**
   * @description Formata os dados para exibição no Pipeline
   * Adiciona propriedades para controle da UI de abas
   */
  formatData(records) {
    const statuses = [
      "Sem contato",
      "Primeiro Contato",
      "Primeira Reunião",
      "Em Negociação",
      "Análise Contratual",
      "Convertido",
      "Perdido"
    ];

    this.columns = statuses.map((status, index) => {
      // Filtrar registros por status
      const statusRecords = records.filter(
        (record) => record.StageName === status
      );

      // Adicionar ícone a cada registro
      const recordsWithIcons = statusRecords.map((record) => ({
        ...record,
        iconName: this.statusIconMap[record.StageName] || "utility:record"
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
        iconName: this.statusIconMap[status],
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

    // Configurar o efeito de arrastar
    event.dataTransfer.effectAllowed = "move";
  }

  /**
   * @description Handler para permitir o drop
   */
  allowDrop(event) {
    event.preventDefault();

    // Adicionar feedback visual durante o drag
    const dropTarget = event.currentTarget;

    // Remover classe drag-over de todos os elementos
    this.template
      .querySelectorAll(".slds-tabs_default__item, .records-container")
      .forEach((el) => el.classList.remove("drag-over"));

    // Adicionar classe drag-over ao elemento atual
    dropTarget.classList.add("drag-over");
  }

  /**
   * @description Handler para quando um card é solto em uma coluna
   */
  handleDrop(event) {
    event.preventDefault();
    const newStatus = event.currentTarget.dataset.status;

    // Remover todas as classes de feedback visual
    this.template
      .querySelectorAll(".slds-tabs_default__item, .records-container")
      .forEach((el) => el.classList.remove("drag-over"));

    this.template
      .querySelectorAll(".kanban-card")
      .forEach((card) => card.classList.remove("dragging"));

    if (this.draggedRecordId && newStatus) {
      updateRecordStatus({
        recordId: this.draggedRecordId,
        newStatus: newStatus
      })
        .then(() => {
          this.showToast(
            "Sucesso",
            "Registro atualizado com sucesso",
            "success"
          );
          return refreshApex(this.wiredRecordsResult);
        })
        .catch((error) => {
          this.showToast("Erro", error.body.message, "error");
        });
    }
  }

  // Adicionar evento para remover feedback visual quando o drag termina
  handleDragEnd(event) {
    event.preventDefault();
    this.template
      .querySelectorAll(".slds-tabs_default__item, .records-container")
      .forEach((el) => el.classList.remove("drag-over"));

    event.target.classList.remove("dragging");
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
