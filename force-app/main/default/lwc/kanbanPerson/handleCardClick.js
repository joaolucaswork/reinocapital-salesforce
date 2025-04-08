/**
 * Handles card click events in the Kanban component
 * @param {Object} event - The click event object
 * @return {void}
 */
export function handleCardClick(event) {
  const recordId = event.currentTarget.dataset.id;

  // If the click was on a control element (checkbox, button, link), don't select the card
  if (
    event.target.tagName === "BUTTON" ||
    event.target.tagName === "INPUT" ||
    event.target.tagName === "A" ||
    event.target.closest("lightning-icon") ||
    event.target.closest("lightning-input") ||
    event.target.closest("lightning-combobox")
  ) {
    return;
  }

  // Toggle selection for this record
  const selectedRecords = [...this.selectedRecords];
  const index = selectedRecords.indexOf(recordId);

  if (index === -1) {
    // Add to selection
    selectedRecords.push(recordId);
  } else {
    // Remove from selection
    selectedRecords.splice(index, 1);
  }

  this.selectedRecords = selectedRecords;
  this.updateRecordSelection();
}
