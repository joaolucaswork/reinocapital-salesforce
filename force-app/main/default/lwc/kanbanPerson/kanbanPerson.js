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
import deleteRecordsInBulk from "@salesforce/apex/KanbanDataController.deleteRecordsInBulk";

export default class KanbanPerson extends NavigationMixin(LightningElement) {
  @track columns = [];
  @track error;
  @track searchTerm = "";
  @track sortBy = "Name";
  @track sortDirection = "asc";
  @track selectedRecords = new Set();
  @track showBulkActions = false;

  wiredRecordsResult;
  originalRecordsData;
  draggedRecordId;
  activeTabIndex = 0;
  activeActionButton = null;

  get hasSelectedRecords() {
    return this.selectedRecords.size > 0;
  }

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
      this.originalRecordsData = result.data;
      this.processData();
    } else if (result.error) {
      this.error = result.error;
      this.showToast("Erro", "Erro ao carregar registros", "error");
    }
  }

  // Novo método para processar os dados com todas as transformações necessárias
  processData() {
    if (!this.originalRecordsData) return;

    // 1. Aplicar filtro de pesquisa
    let processedData = this.filterRecords(this.originalRecordsData);

    // 2. Aplicar ordenação
    processedData = this.sortRecords(processedData);

    // 3. Formatar dados para o kanban
    this.formatData(processedData);
  }

  filterRecords(records) {
    if (!this.searchTerm) return records;

    const searchTermLower = this.searchTerm.toLowerCase();
    return records.filter(
      (record) =>
        record.Name?.toLowerCase().includes(searchTermLower) ||
        record.Account?.Name?.toLowerCase().includes(searchTermLower) ||
        record.StageName?.toLowerCase().includes(searchTermLower)
    );
  }

  handleSearch(event) {
    this.searchTerm = event.target.value;
    this.processData();
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
      let statusRecords = records.filter(
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
    const item = event.currentTarget;

    // Adicionar classe para estilo durante drag
    item.classList.add("dragging");

    // Configurar o efeito de arrastar
    event.dataTransfer.effectAllowed = "move";

    // Adicionar dica visual
    const dropTargets = this.template.querySelectorAll(".records-container");
    dropTargets.forEach((target) => {
      if (!target.classList.contains("drag-over")) {
        target.classList.add("potential-drop");
      }
    });
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
      // Encontrar o registro atual para comparar o estágio
      const currentRecord = this.findRecordById(this.draggedRecordId);
      if (currentRecord && currentRecord.StageName === newStatus) {
        // Se o estágio é o mesmo, apenas atualiza a UI sem mostrar mensagem
        return;
      }

      // Se chegou aqui, o estágio é diferente, então atualiza
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

  handleDelete(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.currentTarget.dataset.id;

    // Usando ShowToastEvent para confirmação
    this.dispatchEvent(
      new ShowToastEvent({
        title: "Confirmar exclusão",
        message: "Tem certeza que deseja excluir este registro?",
        variant: "warning",
        mode: "sticky",
        actions: [
          { label: "Sim", name: "confirm" },
          { label: "Não", name: "cancel" }
        ]
      })
    ).then((response) => {
      if (response === "confirm") {
        deleteRecord({ recordId: recordId })
          .then(() => {
            this.showToast(
              "Sucesso",
              "Registro excluído com sucesso",
              "success"
            );
            return refreshApex(this.wiredRecordsResult);
          })
          .catch((error) => {
            this.showToast("Erro", error.body.message, "error");
          });
      }
    });
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

  handleRecordSelection(event) {
    const recordId = event.target.dataset.id;
    if (event.target.checked) {
      this.selectedRecords.add(recordId);
    } else {
      this.selectedRecords.delete(recordId);
    }
    this.showBulkActions = this.selectedRecords.size > 0;
  }

  handleBulkDelete() {
    // Usando ShowToastEvent para confirmação em massa
    this.dispatchEvent(
      new ShowToastEvent({
        title: "Confirmar exclusão em massa",
        message:
          "Tem certeza que deseja excluir todos os registros selecionados?",
        variant: "warning",
        mode: "sticky",
        actions: [
          { label: "Sim", name: "confirm" },
          { label: "Não", name: "cancel" }
        ]
      })
    ).then((response) => {
      if (response === "confirm") {
        deleteRecordsInBulk({
          recordIds: Array.from(this.selectedRecords)
        })
          .then(() => {
            this.showToast(
              "Sucesso",
              "Registros excluídos com sucesso",
              "success"
            );
            this.selectedRecords.clear();
            this.showBulkActions = false;
            refreshApex(this.wiredRecordsResult);
          })
          .catch((error) => {
            this.showToast("Erro", error.body.message, "error");
          });
      }
    });
  }

  get stageOptions() {
    return [
      { label: "Sem contato", value: "Sem contato" },
      { label: "Primeiro Contato", value: "Primeiro Contato" },
      { label: "Primeira Reunião", value: "Primeira Reunião" },
      { label: "Em Negociação", value: "Em Negociação" },
      { label: "Análise Contratual", value: "Análise Contratual" },
      { label: "Convertido", value: "Convertido" },
      { label: "Perdido", value: "Perdido" }
    ];
  }

  handleStageChange(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.target.dataset.id;
    const newStatus = event.target.value;
    const element = event.target.closest(".stage-selector");

    // Encontrar o registro atual para comparar o estágio
    const currentRecord = this.findRecordById(recordId);
    if (currentRecord && currentRecord.StageName === newStatus) {
      // Se o estágio é o mesmo, apenas atualiza a UI sem mostrar mensagem
      return;
    }

    // Atualizar atributo para mudança visual imediata
    if (element) {
      element.dataset.stage = newStatus;
    }

    // Adicionar classe de loading
    if (element) {
      element.classList.add("stage-updating");
    }

    updateRecordStatus({
      recordId: recordId,
      newStatus: newStatus
    })
      .then(() => {
        this.showToast("Sucesso", "Estágio atualizado com sucesso", "success");
        // Remover classe de loading
        if (element) {
          element.classList.remove("stage-updating");
        }
        return refreshApex(this.wiredRecordsResult);
      })
      .catch((error) => {
        // Em caso de erro, reverter a mudança visual
        if (element && currentRecord) {
          element.dataset.stage = currentRecord.StageName;
        }
        if (element) {
          element.classList.remove("stage-updating");
        }
        this.showToast("Erro", error.body.message, "error");
      });
  }

  // Método auxiliar para encontrar um registro pelo Id
  findRecordById(recordId) {
    for (const column of this.columns) {
      const record = column.records.find((rec) => rec.Id === recordId);
      if (record) {
        return record;
      }
    }
    return null;
  }

  handleSort(event) {
    const field = event.currentTarget.dataset.field;
    const currentSortDir = this.sortDirection;

    // Toggle sort direction
    this.sortDirection =
      field === this.sortBy && currentSortDir === "asc" ? "desc" : "asc";
    this.sortBy = field;

    // Atualizar ícone de ordenação
    this.template.querySelectorAll(".sortable-header").forEach((header) => {
      header.setAttribute(
        "data-sort",
        header.dataset.field === field ? this.sortDirection : ""
      );
    });

    this.processData();
  }

  sortRecords(records) {
    const isReverse = this.sortDirection === "desc";
    const field = this.sortBy;

    return [...records].sort((a, b) => {
      let valueA = this.getFieldValue(a, field);
      let valueB = this.getFieldValue(b, field);

      // Tratar valores nulos/undefined
      if (valueA === null || valueA === undefined) return isReverse ? -1 : 1;
      if (valueB === null || valueB === undefined) return isReverse ? 1 : -1;

      // Converter para string para comparação de texto
      if (typeof valueA === "string") {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      return isReverse ? (valueA < valueB ? 1 : -1) : valueA < valueB ? -1 : 1;
    });
  }

  getFieldValue(record, field) {
    // Tratar campos aninhados (ex: Account.Name)
    if (field === "AccountName") {
      return record.Account?.Name;
    }
    return record[field];
  }
}
