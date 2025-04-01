/**
 * @description Componente Kanban para visualização e gerenciamento de registros do BackOffice
 * com navegação por abas no estilo Pipeline do Salesforce
 */
import { LightningElement, wire, track } from "lwc";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { NavigationMixin } from "lightning/navigation";
import getRecords from "@salesforce/apex/KanbanDataController.getRecords";
import updateRecordStatus from "@salesforce/apex/KanbanDataController.updateRecordStatus";
import deleteRecord from "@salesforce/apex/KanbanDataController.deleteRecord";
import cloneRecord from "@salesforce/apex/KanbanDataController.cloneRecord";

export default class KanbanPerson extends NavigationMixin(LightningElement) {
  // Propriedades reativas do componente
  @track columns = []; // Array de colunas do Kanban
  @track error; // Armazena erros para exibição
  wiredRecordsResult; // Armazena resultado do wire para refresh
  draggedRecordId; // ID do registro sendo arrastado
  activeTabIndex = 0; // Índice da aba ativa

  activeActionButton = null;

  // Mapeamento de status para ícones com os estágios corretos de Oportunidade
  statusIconMap = {
    "Sem contato": "utility:multi_picklist", // Prospecção inicial
    "Primeiro Contato": "utility:filter", // Qualificação inicial
    "Primeira Reunião": "utility:file", // Proposta/Apresentação
    "Em Negociação": "utility:adjust_value", // Negociação/Revisão
    "Análise Contratual": "utility:contract", // Contrato/Negociação final
    Convertido: "utility:success", // Fechado/Ganho
    Perdido: "utility:error" // Fechado/Perdido
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

      // Adicionar ícone e tratar campos undefined
      const recordsWithIcons = statusRecords.map((record) => ({
        ...record,
        iconName: this.statusIconMap[record.StageName] || "utility:record",
        Name: record.Name || "N/A",
        Amount: record.Amount || 0,
        CloseDate: record.CloseDate || null,
        AccountName: record.Account?.Name || "N/A"
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

  handleActionClick(event) {
    event.preventDefault();
    event.stopPropagation();

    // Fecha o menu anterior se existir
    if (
      this.activeActionButton &&
      this.activeActionButton !== event.currentTarget
    ) {
      this.activeActionButton.parentElement.classList.remove("slds-is-open");
    }

    // Toggle do menu atual
    const dropdownTrigger = event.currentTarget.parentElement;
    dropdownTrigger.classList.toggle("slds-is-open");

    // Atualiza o botão ativo
    this.activeActionButton = event.currentTarget;
  }

  // Fecha o dropdown quando clicar fora
  handleClickOutside = (event) => {
    if (
      this.activeActionButton &&
      !this.activeActionButton.contains(event.target)
    ) {
      this.activeActionButton.parentElement.classList.remove("slds-is-open");
      this.activeActionButton = null;
    }
  };

  connectedCallback() {
    // Adiciona listener para fechar o dropdown quando clicar fora
    document.addEventListener("click", this.handleClickOutside);
  }

  disconnectedCallback() {
    // Remove o listener quando o componente for destruído
    document.removeEventListener("click", this.handleClickOutside);
  }

  handleEdit(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.currentTarget.dataset.id;

    // Navega para a página de edição da oportunidade
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: recordId,
        objectApiName: "Opportunity",
        actionName: "edit"
      }
    });
  }

  handleChangeOwner(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.currentTarget.dataset.id;

    // Navega para a página de alteração de proprietário
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: recordId,
        objectApiName: "Opportunity",
        actionName: "changeOwner"
      }
    });
  }

  handleDelete(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.currentTarget.dataset.id;

    // Confirma antes de deletar
    if (confirm("Tem certeza que deseja excluir este registro?")) {
      deleteRecord({ recordId: recordId })
        .then(() => {
          this.showToast("Sucesso", "Registro excluído com sucesso", "success");
          return refreshApex(this.wiredRecordsResult);
        })
        .catch((error) => {
          this.showToast("Erro", error.body.message, "error");
        });
    }
  }

  handleClone(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.currentTarget.dataset.id;

    cloneRecord({ recordId })
      .then((newRecordId) => {
        this.showToast(
          "Sucesso",
          "Oportunidade duplicada com sucesso",
          "success"
        );
        return refreshApex(this.wiredRecordsResult);
      })
      .catch((error) => {
        this.showToast("Erro", error.body.message, "error");
      });
  }

  handleRefresh() {
    return refreshApex(this.wiredRecordsResult);
  }

  handleNavigateToRecord(event) {
    event.preventDefault();
    event.stopPropagation();

    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: event.currentTarget.dataset.id,
        objectApiName: "Opportunity",
        actionName: "view"
      }
    });
  }
}
