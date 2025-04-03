import { createElement } from "lwc";
import { registerApexTestWireAdapter } from "@salesforce/sfdx-lwc-jest";
import KanbanPerson from "c/kanbanPerson";
import getRecords from "@salesforce/apex/KanbanDataController.getRecords";
import updateRecordStatus from "@salesforce/apex/KanbanDataController.updateRecordStatus";
import deleteRecord from "@salesforce/apex/KanbanDataController.deleteRecord";
import cloneRecord from "@salesforce/apex/KanbanDataController.cloneRecord";
import deleteRecordsInBulk from "@salesforce/apex/KanbanDataController.deleteRecordsInBulk";
import { ShowToastEventName } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

jest.mock(
    '@salesforce/apex',
    () => {
        return {
            refreshApex: jest.fn()
        };
    },
    { virtual: true }
);

// Register wire adapter
const getRecordsAdapter = registerApexTestWireAdapter(getRecords);

// Mock dos outros métodos Apex
jest.mock(
    "@salesforce/apex/KanbanDataController.updateRecordStatus",
    () => ({ default: jest.fn() }),
    { virtual: true }
);

jest.mock(
    "@salesforce/apex/KanbanDataController.deleteRecord",
    () => ({ default: jest.fn() }),
    { virtual: true }
);

jest.mock(
    "@salesforce/apex/KanbanDataController.cloneRecord",
    () => ({ default: jest.fn() }),
    { virtual: true }
);

jest.mock(
    "@salesforce/apex/KanbanDataController.deleteRecordsInBulk",
    () => ({ default: jest.fn() }),
    { virtual: true }
);

// Dados mockados para testes
const mockOpportunities = [
    {
        Id: "0065g00000DvGj1AAF",
        Name: "Oportunidade Teste 1",
        StageName: "Sem contato",
        Amount: 10000,
        CloseDate: "2025-12-31",
        Account: { Name: "Conta Teste 1" },
        Probabilidade_da_Oportunidade__c: "Alta"
    },
    {
        Id: "0065g00000DvGj2AAF",
        Name: "Oportunidade Teste 2",
        StageName: "Em Negociação",
        Amount: 20000,
        CloseDate: "2025-12-31",
        Account: { Name: "Conta Teste 2" },
        Probabilidade_da_Oportunidade__c: "Média"
    }
];

describe("c-kanban-person", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock do dataTransfer para eventos de drag and drop
        global.DataTransfer = function() {
            return {
                setData: jest.fn(),
                getData: jest.fn(() => "0065g00000DvGj1AAF")
            };
        };
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    // Função auxiliar para esperar renderização
    async function flushPromises() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    // 1. Teste de carregamento inicial
    it("deve carregar oportunidades na inicialização", async () => {
        const element = createElement("c-kanban-person", {
    expect(cards.length).toBe(2);
  });

  // 2. Teste da funcionalidade de pesquisa
  it("deve filtrar oportunidades baseado no termo de pesquisa", async () => {
    const element = createElement("c-kanban-person", {
      is: KanbanPerson
    });
    document.body.appendChild(element);

    // Emitir dados através do wire adapter
    getRecordsAdapter.emit(mockOpportunities);
    await flushPromises();

    // Simular pesquisa
    const searchInput = element.shadowRoot.querySelector(
      'lightning-input[data-id="searchFilter"]'
    );
    searchInput.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: "Teste 1" }
      })
    );

    await flushPromises();

    // Verificar filtragem - deve mostrar apenas cards que correspondem à pesquisa
    const records = element.shadowRoot.querySelectorAll(".record-item");
    let visibleCount = 0;
    records.forEach((record) => {
      if (
        record.style.display !== "none" &&
        record.textContent.includes("Teste 1")
      ) {
        visibleCount++;
      }
    });
    expect(visibleCount).toBe(1);
  });

  // 3. Teste de drag and drop
  it("deve atualizar o status da oportunidade após drag and drop", async () => {
    updateRecordStatus.mockResolvedValue();

    const element = createElement("c-kanban-person", {
      is: KanbanPerson
    });
    document.body.appendChild(element);

    // Emitir dados através do wire adapter
    getRecordsAdapter.emit(mockOpportunities);
    await flushPromises();

    // Simular drag start com dataTransfer mockado
    const dataTransfer = new DataTransfer();
    const dragStartEvent = new CustomEvent("dragstart", {
      detail: { dataTransfer }
    });
    Object.defineProperty(dragStartEvent, "dataTransfer", {
      value: dataTransfer
    });

    const card = element.shadowRoot.querySelector(".record-item");
    card.dispatchEvent(dragStartEvent);

    // Simular drop
    const dropEvent = new CustomEvent("drop", {
      detail: { dataTransfer }
    });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: dataTransfer
    });

    const dropZone = element.shadowRoot.querySelector(
      '[data-status="Em Negociação"]'
    );
    dropZone.dispatchEvent(dropEvent);

    await flushPromises();

    expect(updateRecordStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: "0065g00000DvGj1AAF",
        newStatus: "Em Negociação"
      })
    );
  });

  // 4. Teste de exclusão de registro
  it("deve excluir uma oportunidade", async () => {
    deleteRecord.mockResolvedValue();

    const element = createElement("c-kanban-person", {
      is: KanbanPerson
    });
    document.body.appendChild(element);

    // Emitir dados através do wire adapter
    getRecordsAdapter.emit(mockOpportunities);
    await flushPromises();

    // Disparar evento de delete diretamente
    element.handleDelete({
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: {
        dataset: {
          id: "0065g00000DvGj1AAF"
        }
      }
    });

    // Simular confirmação
    element.dispatchEvent(
      new CustomEvent("show", {
        detail: {
          actionCallback: () => Promise.resolve("confirm")
        }
      })
    );

    await flushPromises();

    expect(deleteRecord).toHaveBeenCalledWith({
      recordId: "0065g00000DvGj1AAF"
    });
  });

  // 5. Teste de ordenação
  it("deve ordenar oportunidades", async () => {
    const element = createElement("c-kanban-person", {
      is: KanbanPerson
    });
    document.body.appendChild(element);

    // Emitir dados através do wire adapter
    getRecordsAdapter.emit(mockOpportunities);
    await flushPromises();

    // Simular clique no cabeçalho de ordenação
    const sortHeader = element.shadowRoot.querySelector(
      '[data-field="Amount"]'
    );
    const sortEvent = new CustomEvent("click", {
      currentTarget: {
        dataset: {
          field: "Amount"
        }
      }
    });
    sortHeader.dispatchEvent(sortEvent);

    await flushPromises();

    // Verificar ordem dos valores
    const amounts = Array.from(
      element.shadowRoot.querySelectorAll(".col-amount")
    )
      .map((col) => parseFloat(col.textContent.replace(/[^0-9.-]+/g, "")))
      .filter((amount) => !isNaN(amount));

    expect(amounts[0]).toBeLessThan(amounts[1]);
  });

  // 6. Teste de atualização via refresh
  it("deve atualizar os dados ao clicar em refresh", async () => {
    const element = createElement("c-kanban-person", {
      is: KanbanPerson
    });
    document.body.appendChild(element);

    // Emitir dados através do wire adapter
    getRecordsAdapter.emit(mockOpportunities);
    await flushPromises();

    // Mock do refreshApex
    const refreshApexMock = jest.fn();
    element.refreshApex = refreshApexMock;

    // Simular clique no botão de refresh
    await element.handleRefresh();

    expect(refreshApexMock).toHaveBeenCalled();
  });
});
