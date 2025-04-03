/**
 * @description Componente de Visualização de Registros em formato Kanban
 * Este componente implementa uma visualização em estilo quadro Kanban para qualquer objeto do Salesforce
 * que possua um campo de status/estágio.
 *
 * Para adaptar para outro objeto:
 * 1. Modifique o objeto no Apex (KanbanDataController.cls)
 * 2. Configure as propriedades abaixo conforme seu objeto
 * 3. Atualize o statusIconMap com seus status e ícones
 * 4. Atualize o array de status no método formatData
 *
 * @example
 * // Para usar com Contas:
 * <c-kanban-person
 *   object-api-name="Account"
 *   status-field="Status__c"
 *   title-field="Name"
 *   subtitle-field="Type"
 *   value-field="AnnualRevenue"
 *   date-field="CreatedDate">
 * </c-kanban-person>
 */
import { LightningElement, wire, track, api } from "lwc";
import { refreshApex } from "@salesforce/apex";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getRecords from "@salesforce/apex/KanbanDataController.getRecords";
import updateRecordStatus from "@salesforce/apex/KanbanDataController.updateRecordStatus";
import deleteRecord from "@salesforce/apex/KanbanDataController.deleteRecord";
import cloneRecord from "@salesforce/apex/KanbanDataController.cloneRecord";
import deleteRecordsInBulk from "@salesforce/apex/KanbanDataController.deleteRecordsInBulk";
import getAvailableObjects from "@salesforce/apex/KanbanDataController.getAvailableObjects";
import getAvailableFields from "@salesforce/apex/KanbanDataController.getAvailableFields";
import getPicklistValues from "@salesforce/apex/KanbanDataController.getPicklistValues";

export default class KanbanPerson extends NavigationMixin(LightningElement) {
  /**
   * Nome da API do objeto (ex: "Opportunity", "Account", "Custom_Object__c")
   * @type {string}
   */
  @api objectApiName = "Opportunity";

  /**
   * Campo que contém o status/estágio para as colunas do Kanban
   * @type {string}
   */
  @api statusField = "StageName";

  /**
   * Campo para exibir como título do card
   * @type {string}
   */
  @api titleField = "Name";

  /**
   * Campo para exibir como subtítulo do card (pode ser um campo relacionado usando notação de ponto)
   * @type {string}
   */
  @api subtitleField = "Account.Name";

  /**
   * Campo numérico para exibir como valor no card
   * @type {string}
   */
  @api valueField = "Amount";

  /**
   * Campo de data para exibir no card
   * @type {string}
   */
  @api dateField = "CloseDate";

  /**
   * Texto a ser exibido no botão de novo registro
   * @type {string}
   */
  @api newButtonLabel = "Nova Oportunidade";

  /**
   * Texto do campo de pesquisa
   * @type {string}
   */
  @api searchPlaceholder = "Pesquisar oportunidades...";

  /**
   * Limite de registros a serem carregados
   * @type {number}
   */
  @api recordLimit = 1000;

  // Propriedades internas do componente
  @track columns = [];
  @track error;
  @track searchTerm = "";
  @track sortBy = "Name";
  @track sortDirection = "asc";
  @track selectedRecords = new Set();
  @track showBulkActions = false;
  @track showDeleteModal = false;
  @track availableObjects = [];
  @track availableFields = [];
  @track picklistValues = [];
  @track _validStatuses = [];
  @track isConfiguring = false;
  @track selectedObject;

  recordIdToDelete;
  wiredRecordsResult;
  originalRecordsData;
  draggedRecordId;
  activeTabIndex = 0;
  activeActionButton = null;

  /**
   * Indica se há registros selecionados
   * @returns {boolean}
   */
  get hasSelectedRecords() {
    return this.selectedRecords.size > 0;
  }

  /**
   * Mapeamento de status para ícones
   * Personalize este objeto para seus status específicos
   * @type {Object.<string, string>}
   */
  statusIconMap = {
    "Sem contato": "utility:multi_picklist",
    "Primeiro Contato": "utility:filter",
    "Primeira Reunião": "utility:file",
    "Em Negociação": "utility:adjust_value",
    "Análise Contratual": "utility:contract",
    Convertido: "utility:success",
    Perdido: "utility:error"
  };

  /**
   * Lista de status válidos para o objeto
   * Personalize esta lista com seus status específicos
   * @type {Array.<string>}
   */
  get validStatuses() {
    return this._validStatuses;
  }

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
    }
  }

  @wire(getAvailableObjects)
  wiredObjects({ error, data }) {
    if (data) {
      this.availableObjects = data;
      this.error = undefined;
    } else if (error) {
      this.error = error;
    }
  }

  @wire(getAvailableFields, { objectName: "$objectApiName" })
  wiredFields({ error, data }) {
    if (data) {
      this.availableFields = data;
      this.error = undefined;
    } else if (error) {
      this.error = error;
    }
  }

  @wire(getPicklistValues, {
    objectName: "$objectApiName",
    fieldName: "$statusField"
  })
  wiredPicklistValues({ error, data }) {
    if (data) {
      this._validStatuses = data.map((item) => item.value);
      this.error = undefined;
      this.processData();
    } else if (error) {
      this.error = error;
      this._validStatuses = [
        "Sem contato",
        "Primeiro Contato",
        "Primeira Reunião",
        "Em Negociação",
        "Análise Contratual",
        "Convertido",
        "Perdido"
      ];
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
    this.columns = this.validStatuses.map((status, index) => {
      let statusRecords = records.filter(
        (record) => record[this.statusField] === status
      );

      const recordsWithIcons = statusRecords.map((record) => ({
        ...record,
        iconName:
          this.statusIconMap[record[this.statusField]] || "utility:record",
        Name: this.getFieldValue(record, this.titleField) || "N/A",
        Amount: this.getFieldValue(record, this.valueField) || 0,
        Probabilidade_da_Oportunidade__c:
          record.Probabilidade_da_Oportunidade__c
            ? record.Probabilidade_da_Oportunidade__c
            : "Não definido",
        CloseDate: this.getFieldValue(record, this.dateField) || null,
        AccountName: record.Nome_do_Lead__c || record.Account?.Name || "N/A",
        hasLeadName: !!record.Nome_do_Lead__c
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

      // Encontrar o índice da nova aba e ativá-la
      const newTabIndex = this.columns.findIndex(
        (col) => col.value === newStatus
      );
      if (newTabIndex !== -1) {
        this.activeTabIndex = newTabIndex;
        // Atualizar classes das abas
        this.columns = this.columns.map((column, index) => ({
          ...column,
          tabClass: `slds-tabs_default__item ${index === this.activeTabIndex ? "slds-is-active" : ""}`,
          isActive: index === this.activeTabIndex,
          tabIndex: index === this.activeTabIndex ? "0" : "-1"
        }));
      }

      // Se chegou aqui, o estágio é diferente, então atualiza
      updateRecordStatus({
        recordId: this.draggedRecordId,
        newStatus: newStatus
      })
        .then(() => {
          // Mostrar mensagem de sucesso
          const record = this.findRecordById(this.draggedRecordId);
          this.showToastMessage(
            "Sucesso",
            `${record.Name} foi movido para ${newStatus}`,
            "success"
          );
          return refreshApex(this.wiredRecordsResult);
        })
        .catch((error) => {
          this.showToastMessage(
            "Erro",
            error.body?.message || "Erro ao atualizar o status",
            "error"
          );
          console.error("Erro ao atualizar status:", error);
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

    deleteRecord({ recordId })
      .then(() => {
        return refreshApex(this.wiredRecordsResult);
      })
      .catch((error) => {
        console.error("Erro ao excluir registro:", error);
      });
  }

  handleClone(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.currentTarget.dataset.id;

    cloneRecord({ recordId })
      .then(() => {
        return refreshApex(this.wiredRecordsResult);
      })
      .catch((error) => {
        console.error("Erro ao clonar registro:", error);
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
      },
      state: {
        navigationLocation: "LOOKUP" // Isso faz abrir em popup
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
    deleteRecordsInBulk({
      recordIds: Array.from(this.selectedRecords)
    })
      .then(() => {
        this.selectedRecords.clear();
        this.showBulkActions = false;
        return refreshApex(this.wiredRecordsResult);
      })
      .catch((error) => {
        console.error("Erro ao excluir registros em massa:", error);
      });
  }

  get stageOptions() {
    return this.validStatuses.map((status) => ({
      label: status,
      value: status
    }));
  }

  async handleStageChange(event) {
    const recordId = event.target.dataset.id;
    const newStatus = event.detail.value;

    try {
      await updateRecordStatus({ recordId, newStatus });

      // Encontrar o índice da nova aba e atualizar
      const newTabIndex = this.columns.findIndex(
        (column) => column.value === newStatus
      );
      if (newTabIndex !== -1) {
        this.activeTabIndex = newTabIndex;
        // Atualizar classes das abas
        this.columns = this.columns.map((column, index) => ({
          ...column,
          tabClass: `slds-tabs_default__item ${index === this.activeTabIndex ? "slds-is-active" : ""}`,
          tabPanelClass: `slds-tabs_default__content ${index === this.activeTabIndex ? "slds-show" : "slds-hide"}`,
          isActive: index === this.activeTabIndex,
          tabIndex: index === this.activeTabIndex ? 0 : -1
        }));
      }

      // Mostrar mensagem de sucesso
      const record = this.findRecordById(recordId);
      this.showToastMessage(
        "Sucesso",
        `${record.Name} foi movido para ${newStatus}`,
        "success"
      );

      await refreshApex(this.wiredRecordsResult);
    } catch (error) {
      this.showToastMessage(
        "Erro",
        error.body?.message || "Erro ao atualizar o status",
        "error"
      );
      console.error("Erro ao atualizar status:", error);
    }
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

      // Tratamento especial para o campo de probabilidade
      if (field === "Probabilidade_da_Oportunidade__c") {
        const probabilityOrder = {
          "100%": 6,
          "89%": 5,
          "55%": 4,
          "34%": 3,
          "13%": 2,
          "0%": 1
        };
        valueA = probabilityOrder[valueA] || 0;
        valueB = probabilityOrder[valueB] || 0;
      }

      // Tratamento para valores nulos/undefined
      if (valueA === null || valueA === undefined) return isReverse ? -1 : 1;
      if (valueB === null || valueB === undefined) return isReverse ? 1 : -1;

      // Converter para string minúscula para comparação de texto
      if (typeof valueA === "string" && typeof valueB === "string") {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      // Comparação final
      return isReverse ? (valueA < valueB ? 1 : -1) : valueA < valueB ? -1 : 1;
    });
  }

  getFieldValue(record, field) {
    // Tratar campos aninhados (ex: Account.Name)
    if (field === "AccountName") {
      // Primeiro verifica o campo personalizado Nome_do_Lead__c
      if (record.Nome_do_Lead__c) {
        return record.Nome_do_Lead__c;
      }
      // Se não encontrar, usa o campo padrão Account.Name, mas acessa corretamente o objeto Account
      return record.Account?.Name || "N/A";
    }
    // Tratar campos aninhados com notação de ponto (ex: Account.Name)
    if (field.includes(".")) {
      return field.split(".").reduce((obj, key) => obj?.[key], record) || "N/A";
    }
    // Para outros campos, retorna o valor direto
    return record[field] || "";
  }

  /**
   * Abre o formulário de novo registro em um popup
   */
  handleCreateNew() {
    const defaults = encodeURIComponent(
      JSON.stringify({
        [this.statusField]: this.validStatuses[0] // Usa o primeiro status como padrão
      })
    );

    this[NavigationMixin.Navigate]({
      type: "standard__objectPage",
      attributes: {
        objectApiName: this.objectApiName,
        actionName: "new"
      },
      state: {
        navigationLocation: "LOOKUP",
        defaultFieldValues: defaults
      }
    });
  }

  handleProbabilityChange(event) {
    const recordId = event.target.dataset.recordId;
    const probability = event.detail.value;
    this.updateProbability(recordId, probability);
  }

  // Método auxiliar para mostrar mensagens toast
  showToastMessage(title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    });
    this.dispatchEvent(evt);
  }

  handleObjectChange(event) {
    const selectedObject = event.detail.value;
    this.objectApiName = selectedObject;
    this.selectedObject = selectedObject;
    return refreshApex(this.wiredRecordsResult);
  }

  handleFieldChange(event) {
    const fieldName = event.target.dataset.fieldname;
    const selectedValue = event.detail.value;
    this[fieldName] = selectedValue;
    return refreshApex(this.wiredRecordsResult);
  }

  toggleConfiguration() {
    this.isConfiguring = !this.isConfiguring;
    if (this.isConfiguring) {
      // Prevent scrolling of the background when modal is open
      document.body.style.overflow = "hidden";
    } else {
      // Restore scrolling when modal is closed
      document.body.style.overflow = "auto";
    }
  }

  handleSaveConfiguration() {
    this.toggleConfiguration();
    return refreshApex(this.wiredRecordsResult)
      .then(() => {
        this.showToastMessage(
          "Sucesso",
          "Configurações atualizadas com sucesso",
          "success"
        );
      })
      .catch((error) => {
        this.showToastMessage(
          "Erro",
          "Erro ao atualizar as configurações",
          "error"
        );
        console.error("Erro:", error);
      });
  }

  // Filtros para campos específicos
  get picklistFields() {
    return this.availableFields.filter((field) => field.type === "PICKLIST");
  }

  get textFields() {
    return this.availableFields.filter(
      (field) =>
        field.type === "STRING" ||
        field.type === "TEXTAREA" ||
        field.type === "REFERENCE"
    );
  }

  get numberFields() {
    return this.availableFields.filter(
      (field) =>
        field.type === "CURRENCY" ||
        field.type === "DOUBLE" ||
        field.type === "INTEGER"
    );
  }

  get dateFields() {
    return this.availableFields.filter(
      (field) => field.type === "DATE" || field.type === "DATETIME"
    );
  }
}
