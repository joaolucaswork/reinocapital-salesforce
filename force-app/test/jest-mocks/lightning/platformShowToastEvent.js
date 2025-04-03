export class ShowToastEvent {
  constructor(params) {
    this.title = params.title;
    this.message = params.message;
    this.variant = params.variant;
  }
}
