import { createElement } from "lwc";
import UserDashboardList from "c/userDashboardList";

describe("c-user-dashboard-list", () => {
  let element;

  beforeEach(() => {
    element = createElement("c-user-dashboard-list", {
      is: UserDashboardList
    });
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it("should initialize with isExpanded as false", () => {
    expect(element.isExpanded).toBeFalsy();
  });

  it("should toggle expandable content when button is clicked", () => {
    // Get initial state
    const expandableContent =
      element.shadowRoot.querySelector(".slds-is-relative");
    expect(expandableContent.classList.contains("slds-hide")).toBeTruthy();
    expect(expandableContent.classList.contains("slds-show")).toBeFalsy();

    // Find and click the expand button
    const expandButton = element.shadowRoot.querySelector("button");
    expandButton.click();

    // Return a promise to wait for any asynchronous DOM updates
    return Promise.resolve().then(() => {
      // Check if content is now expanded
      const updatedContent =
        element.shadowRoot.querySelector(".slds-is-relative");
      expect(updatedContent.classList.contains("slds-show")).toBeTruthy();
      expect(updatedContent.classList.contains("slds-hide")).toBeFalsy();

      // Check if icon rotation class is applied
      const icon = element.shadowRoot.querySelector("lightning-icon");
      expect(icon.classList.contains("rotate-icon")).toBeTruthy();
    });
  });

  it("should render all static elements correctly", () => {
    // Verify main card elements
    const cardHeader = element.shadowRoot.querySelector(".slds-card__header");
    expect(cardHeader).not.toBeNull();
    expect(cardHeader.textContent).toContain("Team Dashboard");

    // Verify stats boxes
    const statBoxes = element.shadowRoot.querySelectorAll(".stat-box");
    expect(statBoxes.length).toBe(2);

    // Verify secondary stats
    const secondaryStats =
      element.shadowRoot.querySelectorAll(".secondary-stat");
    expect(secondaryStats.length).toBeGreaterThan(0);

    // Verify expand button exists
    const expandButton = element.shadowRoot.querySelector("button");
    expect(expandButton).not.toBeNull();
    expect(expandButton.textContent).toContain("Ver todas oportunidades");
  });

  it("should toggle icon rotation class when expanded", () => {
    // Get the icon element
    const icon = element.shadowRoot.querySelector(
      'lightning-icon[icon-name="utility:chevrondown"]'
    );
    expect(icon.classList.contains("rotate-icon")).toBeFalsy();

    // Click the expand button
    const expandButton = element.shadowRoot.querySelector("button");
    expandButton.click();

    return Promise.resolve()
      .then(() => {
        expect(icon.classList.contains("rotate-icon")).toBeTruthy();

        // Click again to collapse
        expandButton.click();
        return Promise.resolve();
      })
      .then(() => {
        expect(icon.classList.contains("rotate-icon")).toBeFalsy();
      });
  });
});
