// Testes para o componente de Visualização de Registros - Oportunidade
import { createElement } from "lwc";
import { registerApexTestWireAdapter } from "@salesforce/sfdx-lwc-jest";
import KanbanPerson from "c/kanbanPerson";
import getRecords from "@salesforce/apex/KanbanDataController.getRecords";
import updateRecordStatus from "@salesforce/apex/KanbanDataController.updateRecordStatus";
import deleteRecord from "@salesforce/apex/KanbanDataController.deleteRecord";
import { refreshApex } from "@salesforce/apex";

jest.mock(
  "@salesforce/apex",
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

describe("Visualização de Registros - Oportunidade", () => {
  let element;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock do dataTransfer para eventos de drag and drop
    global.DataTransfer = function () {
      return {
        setData: jest.fn(),
        getData: jest.fn(() => "0065g00000DvGj1AAF")
      };
    };

    element = createElement("c-kanban-person", {
      is: KanbanPerson
    });
    document.body.appendChild(element);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  // 1. Teste de carregamento inicial
  it("deve carregar oportunidades na inicialização", () => {
    // Emitir dados através do wire adapter
    getRecordsAdapter.emit(mockOpportunities);

    const cards = element.shadowRoot.querySelectorAll(".record-item");
    expect(cards.length).toBe(2);
  });

  // 2. Teste da funcionalidade de pesquisa
  it("deve filtrar oportunidades baseado no termo de pesquisa", () => {
    // Emitir dados através do wire adapter
    getRecordsAdapter.emit(mockOpportunities);

    // Simular pesquisa
    const searchInput = element.shadowRoot.querySelector("lightning-input");
    searchInput.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: "Teste 1" }
      })
    );

    return Promise.resolve().then(() => {
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
  });

  // 3. Teste de drag and drop
  it("deve atualizar o status da oportunidade após drag and drop", () => {
    updateRecordStatus.mockResolvedValue();
    getRecordsAdapter.emit(mockOpportunities);

    const dataTransfer = new DataTransfer();
    const card = element.shadowRoot.querySelector(".record-item");

    card.dispatchEvent(
      new CustomEvent("dragstart", {
        detail: { dataTransfer }
      })
    );

    const dropZone = element.shadowRoot.querySelector(
      '[data-status="Em Negociação"]'
    );
    dropZone.dispatchEvent(
      new CustomEvent("drop", {
        detail: { dataTransfer }
      })
    );

    return Promise.resolve().then(() => {
      expect(updateRecordStatus).toHaveBeenCalledWith({
        recordId: "0065g00000DvGj1AAF",
        newStatus: "Em Negociação"
      });
    });
  });

  // 4. Teste de exclusão de registro
  it("deve excluir uma oportunidade", () => {
    deleteRecord.mockResolvedValue();
    getRecordsAdapter.emit(mockOpportunities);

    element.handleDelete({
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: {
        dataset: {
          id: "0065g00000DvGj1AAF"
        }
      }
    });

    return Promise.resolve().then(() => {
      expect(deleteRecord).toHaveBeenCalledWith({
        recordId: "0065g00000DvGj1AAF"
      });
    });
  });

  // 5. Teste de ordenação
  it("deve ordenar oportunidades", () => {
    getRecordsAdapter.emit(mockOpportunities);

    const sortHeader = element.shadowRoot.querySelector(
      '[data-field="Amount"]'
    );
    sortHeader.dispatchEvent(
      new CustomEvent("click", {
        currentTarget: {
          dataset: {
            field: "Amount"
          }
        }
      })
    );

    return Promise.resolve().then(() => {
      const amounts = Array.from(
        element.shadowRoot.querySelectorAll(".col-amount")
      )
        .map((col) => parseFloat(col.textContent.replace(/[^0-9.-]+/g, "")))
        .filter((amount) => !isNaN(amount));

      expect(amounts[0]).toBeLessThan(amounts[1]);
    });
  });
});
