/**
 * @description Componente de Visualização de Registros em formato Kanban
 * Este componente implementa uma visualização em estilo quadro Kanban para qualquer objeto do Salesforce
 * que possua um campo de status/estágio.
 *
 * Para adaptar para outro objeto:
 * 1. Modifique o objeto no Apex (KanbanDataController.cls)
 * 2. Configure as propriedades abaixo conforme seu objeto
 * 3. Atualize o statusIconMap com seus status e ícones
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

  // Campos fixos para o Kanban de Oportunidades
  titleField = "Name";
  subtitleField = "Account.Name";
  ownerField = "Owner.Name"; // Add owner field
  valueField = "Amount";
  dateField = "CloseDate";
  newButtonLabel = "Nova Oportunidade";
  searchPlaceholder = "Pesquisar oportunidades...";
  recordLimit = 1000;

  // Propriedades internas do componente
  @track columns = [];
  @track error;
  @track searchTerm = "";
  @track sortBy = "Name";
  @track sortDirection = "asc";
  @track selectedRecords = new Set();
  @track showBulkActions = false;
  @track showDeleteModal = false;
  @track availableFields = [];
  @track picklistValues = [];
  @track _validStatuses = [];
  @track isConfiguring = false;

  // Variáveis para gerenciar a seleção múltipla
  lastSelectedId = null;
  isShiftKeyPressed = false;

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
   * Retorna a contagem de registros selecionados
   * @returns {number}
   */
  get selectedCount() {
    return this.selectedRecords.size;
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
   * Map para armazenar os labels dos status
   * @type {Map}
   */
  statusLabelMap = new Map();

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

      // Criar o mapa de value -> label para os status
      this.statusLabelMap.clear();
      data.forEach((item) => {
        this.statusLabelMap.set(item.value, item.label);
      });

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

      const recordsWithIcons = statusRecords.map((record) => {
        const isSelected = this.selectedRecords.has(record.Id);
        return {
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
          hasLeadName: !!record.Nome_do_Lead__c,
          OwnerName: record.Owner?.Name || "N/A",
          selected: isSelected,
          cardClass: `slds-item record-item ${isSelected ? "selected" : ""}`
        };
      });

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
          // Mostrar mensagem de sucesso com o label do status em vez do value
          const record = this.findRecordById(this.draggedRecordId);
          const statusLabel = this.statusLabelMap.get(newStatus) || newStatus;
          this.showToastMessage(
            "Sucesso",
            `${record.Name} foi movido para ${statusLabel}`,
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

    // Fechar todos os outros dropdowns antes de abrir o atual
    const currentTrigger = event.currentTarget.parentElement;
    this.template
      .querySelectorAll(".slds-dropdown-trigger.slds-is-open")
      .forEach((dropdown) => {
        if (dropdown !== currentTrigger) {
          dropdown.classList.remove("slds-is-open");
        }
      });

    // Toggle do menu atual
    const dropdownTrigger = event.currentTarget.parentElement;
    dropdownTrigger.classList.toggle("slds-is-open");

    // Se o dropdown está sendo aberto, posicione-o corretamente
    if (dropdownTrigger.classList.contains("slds-is-open")) {
      // Obter a posição do botão
      const button = event.currentTarget;
      const buttonRect = button.getBoundingClientRect();

      // Obter o dropdown
      const dropdown = dropdownTrigger.querySelector(".slds-dropdown");

      // Definir a posição do dropdown em relação à viewport, não ao documento
      dropdown.style.left = buttonRect.right - 300 + "px";
      dropdown.style.top = buttonRect.bottom + "px";
    }
  }

  // Fecha os dropdowns quando clicar fora
  handleClickOutside = (event) => {
    const clickedOnDropdown = event.target.closest(".slds-dropdown-trigger");

    // Se não clicou em um dropdown, fecha todos
    if (!clickedOnDropdown) {
      this.template
        .querySelectorAll(".slds-dropdown-trigger.slds-is-open")
        .forEach((dropdown) => {
          dropdown.classList.remove("slds-is-open");
        });
    }
  };

  // Fecha todos os dropdowns
  closeAllDropdowns() {
    this.template
      .querySelectorAll(".slds-dropdown-trigger.slds-is-open")
      .forEach((dropdown) => {
        dropdown.classList.remove("slds-is-open");
      });
  }

  // Handler para fechar dropdowns ao rolar a página
  handleScroll = () => {
    this.closeAllDropdowns();
  };

  // Monitora as teclas para a seleção múltipla
  handleKeyDown = (event) => {
    if (event.key === "Shift") {
      this.isShiftKeyPressed = true;
    }
  };

  handleKeyUp = (event) => {
    if (event.key === "Shift") {
      this.isShiftKeyPressed = false;
    }
  };

  connectedCallback() {
    // Adiciona listener para fechar o dropdown quando clicar fora
    document.addEventListener("click", this.handleClickOutside);
    // Adiciona listener para fechar o dropdown quando rolar a página
    document.addEventListener("scroll", this.handleScroll, true);

    // Adiciona listeners para as teclas (para seleção múltipla)
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
  }

  disconnectedCallback() {
    // Remove os listeners quando o componente for destruído
    document.removeEventListener("click", this.handleClickOutside);
    document.removeEventListener("scroll", this.handleScroll, true);
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
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
    const record = this.findRecordById(recordId);
    const recordName = record ? record.Name : "Registro";

    // Primeiro fechamos qualquer dropdown que esteja aberto
    this.template
      .querySelectorAll(".slds-dropdown-trigger.slds-is-open")
      .forEach((dropdown) => {
        dropdown.classList.remove("slds-is-open");
      });

    // Confirmar exclusão
    if (confirm(`Tem certeza que deseja excluir "${recordName}"?`)) {
      deleteRecord({ recordId })
        .then(() => {
          this.showToastMessage(
            "Sucesso",
            `${recordName} foi excluído com sucesso.`,
            "success"
          );
          return refreshApex(this.wiredRecordsResult);
        })
        .catch((error) => {
          this.showToastMessage(
            "Erro",
            error.body?.message || "Erro ao excluir registro",
            "error"
          );
          console.error("Erro ao excluir registro:", error);
        });
    }
  }

  handleClone(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.currentTarget.dataset.id;
    const record = this.findRecordById(recordId);
    const recordName = record ? record.Name : "Registro";

    // Primeiro fechamos qualquer dropdown que esteja aberto
    this.template
      .querySelectorAll(".slds-dropdown-trigger.slds-is-open")
      .forEach((dropdown) => {
        dropdown.classList.remove("slds-is-open");
      });

    cloneRecord({ recordId })
      .then((result) => {
        this.showToastMessage(
          "Sucesso",
          `${recordName} foi duplicado com sucesso e está na aba "Sem contato".`,
          "success"
        );

        // Ativar aba "Sem contato" para mostrar o registro duplicado
        const semContatoIndex = this.columns.findIndex(
          (column) => column.value === "Sem contato"
        );

        if (semContatoIndex !== -1) {
          this.activeTabIndex = semContatoIndex;
          this.formatData(this.wiredRecordsResult.data);
        }

        return refreshApex(this.wiredRecordsResult);
      })
      .catch((error) => {
        this.showToastMessage(
          "Erro",
          error.body?.message || "Erro ao duplicar registro",
          "error"
        );
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

  /**
   * Manipula a seleção de registros através do checkbox
   */
  handleRecordSelection(event) {
    const recordId = event.target.dataset.id;
    const isSelected = event.target.checked;

    // Verifica se a tecla shift está pressionada para seleção múltipla
    if (
      this.isShiftKeyPressed &&
      this.lastSelectedId &&
      recordId !== this.lastSelectedId
    ) {
      this.selectRecordsBetween(this.lastSelectedId, recordId, isSelected);
    } else {
      // Seleção normal de um único registro
      if (isSelected) {
        this.selectedRecords.add(recordId);
      } else {
        this.selectedRecords.delete(recordId);
      }

      // Atualiza o último registro selecionado
      this.lastSelectedId = isSelected ? recordId : null;
    }

    // Atualiza a interface
    this.updateRecordsSelection();
  }

  /**
   * Manipula clique em qualquer parte do card para seleção
   */
  handleCardClick(event) {
    // Ignora se o clique foi em um botão, link ou no checkbox
    if (
      event.target.tagName === "BUTTON" ||
      event.target.tagName === "A" ||
      event.target.tagName === "INPUT" ||
      event.target.closest(".slds-dropdown-trigger") ||
      event.target.closest("lightning-icon")
    ) {
      return;
    }

    // Obtém o ID do registro
    const recordId = event.currentTarget.dataset.id;
    const isSelected = this.selectedRecords.has(recordId);

    // Inverte a seleção
    if (isSelected) {
      this.selectedRecords.delete(recordId);
      this.lastSelectedId = null;
    } else {
      // Verifica se a tecla shift está pressionada para seleção múltipla
      if (
        this.isShiftKeyPressed &&
        this.lastSelectedId &&
        recordId !== this.lastSelectedId
      ) {
        this.selectRecordsBetween(this.lastSelectedId, recordId, true);
      } else {
        this.selectedRecords.add(recordId);
        this.lastSelectedId = recordId;
      }
    }

    // Atualiza a interface
    this.updateRecordsSelection();
  }

  /**
   * Seleciona todos os registros entre dois IDs
   */
  selectRecordsBetween(startId, endId, isSelected) {
    // Encontrar os índices dos registros
    let startIndex = -1;
    let endIndex = -1;
    let allRecords = [];

    // Coletar todos os registros de todas as colunas
    this.columns.forEach((column) => {
      column.records.forEach((record) => {
        allRecords.push(record);
        if (record.Id === startId) startIndex = allRecords.length - 1;
        if (record.Id === endId) endIndex = allRecords.length - 1;
      });
    });

    // Garantir que startIndex seja menor que endIndex
    if (startIndex > endIndex) {
      [startIndex, endIndex] = [endIndex, startIndex];
    }

    // Selecionar ou desselecionar todos os registros entre os índices
    for (let i = startIndex; i <= endIndex; i++) {
      const recordId = allRecords[i].Id;
      if (isSelected) {
        this.selectedRecords.add(recordId);
      } else {
        this.selectedRecords.delete(recordId);
      }
    }

    this.lastSelectedId = endId;
  }

  /**
   * Atualiza a interface para refletir os registros selecionados
   */
  updateRecordsSelection() {
    // Atualiza as classes CSS e estados dos registros
    this.formatData(this.wiredRecordsResult.data);
  }

  /**
   * Limpa a seleção de todos os registros
   */
  handleClearSelection() {
    this.selectedRecords.clear();
    this.lastSelectedId = null;
    this.updateRecordsSelection();
  }

  /**
   * Excluir registros selecionados em massa
   */
  handleBulkDelete() {
    if (this.selectedRecords.size === 0) return;

    // Confirmar exclusão
    if (
      confirm(
        `Tem certeza que deseja excluir ${this.selectedRecords.size} registro(s) selecionado(s)?`
      )
    ) {
      deleteRecordsInBulk({
        recordIds: Array.from(this.selectedRecords)
      })
        .then(() => {
          this.showToastMessage(
            "Sucesso",
            `${this.selectedRecords.size} registro(s) excluído(s) com sucesso.`,
            "success"
          );
          this.selectedRecords.clear();
          this.lastSelectedId = null;
          return refreshApex(this.wiredRecordsResult);
        })
        .catch((error) => {
          this.showToastMessage(
            "Erro",
            error.body?.message || "Erro ao excluir registros em massa",
            "error"
          );
          console.error("Erro ao excluir registros em massa:", error);
        });
    }
  }

  /**
   * Exportar registros selecionados
   */
  handleBulkExport() {
    if (this.selectedRecords.size === 0) return;

    // Coletar dados dos registros selecionados
    const selectedIds = Array.from(this.selectedRecords);
    const selectedRecordsData = [];

    this.columns.forEach((column) => {
      column.records.forEach((record) => {
        if (this.selectedRecords.has(record.Id)) {
          selectedRecordsData.push({
            Id: record.Id,
            Nome: record.Name,
            Conta: record.AccountName,
            Valor: record.Amount,
            Probabilidade: record.Probabilidade_da_Oportunidade__c,
            DataFechamento: record.CloseDate,
            Proprietario: record.OwnerName,
            Estagio: record.StageName
          });
        }
      });
    });

    // Converter para CSV
    let csvContent = "data:text/csv;charset=utf-8,";

    // Cabeçalhos
    const headers = [
      "Id",
      "Nome",
      "Conta",
      "Valor",
      "Probabilidade",
      "Data de Fechamento",
      "Proprietário",
      "Estágio"
    ];
    csvContent += headers.join(",") + "\\n";

    // Dados
    selectedRecordsData.forEach((record) => {
      const row = [
        record.Id,
        `"${record.Nome}"`,
        `"${record.Conta}"`,
        record.Valor,
        record.Probabilidade,
        record.DataFechamento,
        `"${record.Proprietario}"`,
        `"${record.Estagio}"`
      ];
      csvContent += row.join(",") + "\\n";
    });

    // Download do arquivo
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "oportunidades_exportadas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToastMessage(
      "Sucesso",
      `${selectedRecordsData.length} registro(s) exportado(s) com sucesso.`,
      "success"
    );
  }

  /**
   * Mover registros selecionados para um novo estágio
   */
  handleBulkMove() {
    if (this.selectedRecords.size === 0) return;

    // Criar um modal personalizado para selecionar o novo estágio
    const modal = document.createElement("div");
    modal.className = "slds-modal slds-fade-in-open";
    modal.innerHTML = `
      <div class="slds-modal__container">
        <div class="slds-modal__header">
          <h2 class="slds-text-heading_medium">Mover ${this.selectedRecords.size} registro(s)</h2>
          <button class="slds-button slds-button_icon slds-modal__close">
            <svg class="slds-button__icon" aria-hidden="true">
              <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#close"></use>
            </svg>
            <span class="slds-assistive-text">Fechar</span>
          </button>
        </div>
        <div class="slds-modal__content slds-p-around_medium">
          <div class="slds-form-element">
            <label class="slds-form-element__label">Novo estágio:</label>
            <div class="slds-form-element__control">
              <div class="slds-select_container">
                <select class="slds-select" id="bulk-move-stage-select">
                  ${this.validStatuses.map((status) => `<option value="${status}">${status}</option>`).join("")}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div class="slds-modal__footer">
          <button class="slds-button slds-button_neutral cancel-button">Cancelar</button>
          <button class="slds-button slds-button_brand confirm-button">Mover</button>
        </div>
      </div>
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "slds-backdrop slds-backdrop_open";

    // Adicionar ao DOM
    document.body.appendChild(modal);
    document.body.appendChild(backdrop);

    // Configurar listeners
    const closeModal = () => {
      document.body.removeChild(modal);
      document.body.removeChild(backdrop);
    };

    modal
      .querySelector(".slds-modal__close")
      .addEventListener("click", closeModal);
    modal.querySelector(".cancel-button").addEventListener("click", closeModal);

    modal.querySelector(".confirm-button").addEventListener("click", () => {
      const newStage = modal.querySelector("#bulk-move-stage-select").value;

      // Fechar modal primeiro
      closeModal();

      // Array para armazenar as promessas de atualização
      const updatePromises = [];

      // Atualizar cada registro
      this.selectedRecords.forEach((recordId) => {
        updatePromises.push(
          updateRecordStatus({
            recordId: recordId,
            newStatus: newStage
          })
        );
      });

      // Aguardar todas as atualizações
      Promise.all(updatePromises)
        .then(() => {
          this.showToastMessage(
            "Sucesso",
            `${this.selectedRecords.size} registro(s) movido(s) para "${newStage}" com sucesso.`,
            "success"
          );
          this.selectedRecords.clear();
          this.lastSelectedId = null;
          return refreshApex(this.wiredRecordsResult);
        })
        .catch((error) => {
          this.showToastMessage(
            "Erro",
            error.body?.message || "Erro ao mover registros em massa",
            "error"
          );
          console.error("Erro ao mover registros em massa:", error);
        });
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

      // Mostrar mensagem de sucesso com o label do status em vez do value
      const record = this.findRecordById(recordId);
      const statusLabel = this.statusLabelMap.get(newStatus) || newStatus;
      this.showToastMessage(
        "Sucesso",
        `${record.Name} foi movido para ${statusLabel}`,
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
    // Adicionando um atraso pequeno para garantir que o toast seja exibido após o refresh
    setTimeout(() => {
      const evt = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant,
        mode: "dismissable" // Garantindo que o toast seja dismissível
      });
      this.dispatchEvent(evt);
      console.log("Toast disparado:", title, message, variant);
    }, 100);
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

  handleViewDetails(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.currentTarget.dataset.id;

    // Navega para a página de detalhes da oportunidade
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: recordId,
        objectApiName: this.objectApiName,
        actionName: "view"
      }
    });
  }

  handleAssignOwner(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.currentTarget.dataset.id;
    const record = this.findRecordById(recordId);

    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: recordId,
        objectApiName: this.objectApiName,
        actionName: "edit"
      },
      state: {
        defaultFieldValues: "OwnerId=",
        navigationLocation: "LOOKUP",
        focusedFieldName: "OwnerId"
      }
    });
  }

  handleAddTask(event) {
    event.preventDefault();
    event.stopPropagation();

    const recordId = event.currentTarget.dataset.id;
    const record = this.findRecordById(recordId);

    // Cria uma nova tarefa relacionada ao registro
    this[NavigationMixin.Navigate]({
      type: "standard__objectPage",
      attributes: {
        objectApiName: "Task",
        actionName: "new"
      },
      state: {
        defaultFieldValues: `WhatId=${recordId}`,
        navigationLocation: "LOOKUP"
      }
    });
  }
}
