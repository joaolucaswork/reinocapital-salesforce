import { LightningElement, track } from "lwc";

export default class UserDashboardList extends LightningElement {
  @track expandedStates = [false, false, false, false, false];

  // Getters para o estado de cada card
  get isCard0Expanded() {
    return this.expandedStates[0];
  }
  get isCard1Expanded() {
    return this.expandedStates[1];
  }
  get isCard2Expanded() {
    return this.expandedStates[2];
  }
  get isCard3Expanded() {
    return this.expandedStates[3];
  }
  get isCard4Expanded() {
    return this.expandedStates[4];
  }

  // Getters para classes CSS do conteúdo expansível de cada card
  get expandableContentClass0() {
    return `slds-is-relative ${this.expandedStates[0] ? "slds-show" : "slds-hide"}`;
  }
  get expandableContentClass1() {
    return `slds-is-relative ${this.expandedStates[1] ? "slds-show" : "slds-hide"}`;
  }
  get expandableContentClass2() {
    return `slds-is-relative ${this.expandedStates[2] ? "slds-show" : "slds-hide"}`;
  }
  get expandableContentClass3() {
    return `slds-is-relative ${this.expandedStates[3] ? "slds-show" : "slds-hide"}`;
  }
  get expandableContentClass4() {
    return `slds-is-relative ${this.expandedStates[4] ? "slds-show" : "slds-hide"}`;
  }

  // Getters para classes CSS do ícone de dropdown de cada card
  get dropdownIconClass0() {
    return `slds-button__icon slds-button__icon_right ${this.expandedStates[0] ? "rotate-icon" : ""}`;
  }
  get dropdownIconClass1() {
    return `slds-button__icon slds-button__icon_right ${this.expandedStates[1] ? "rotate-icon" : ""}`;
  }
  get dropdownIconClass2() {
    return `slds-button__icon slds-button__icon_right ${this.expandedStates[2] ? "rotate-icon" : ""}`;
  }
  get dropdownIconClass3() {
    return `slds-button__icon slds-button__icon_right ${this.expandedStates[3] ? "rotate-icon" : ""}`;
  }
  get dropdownIconClass4() {
    return `slds-button__icon slds-button__icon_right ${this.expandedStates[4] ? "rotate-icon" : ""}`;
  }

  // Toggle expand/collapse
  toggleExpand(event) {
    const cardIndex = parseInt(event.currentTarget.dataset.index, 10);
    this.expandedStates = [...this.expandedStates];
    this.expandedStates[cardIndex] = !this.expandedStates[cardIndex];
  }
}
