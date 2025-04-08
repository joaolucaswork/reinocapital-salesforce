import { LightningElement, track } from "lwc";

export default class UserDashboardList extends LightningElement {
  @track isExpanded = false;

  // Computed class for the expandable content
  get expandableContentClass() {
    return `slds-is-relative ${this.isExpanded ? "slds-show" : "slds-hide"}`;
  }

  // Computed class for the dropdown icon
  get dropdownIconClass() {
    return `slds-button__icon slds-button__icon_right ${this.isExpanded ? "rotate-icon" : ""}`;
  }

  // Toggle expand/collapse
  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }
}
