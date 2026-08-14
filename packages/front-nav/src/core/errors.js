export class FrontNavError extends Error {
  constructor(message, status, cause) {
    super(message);
    this.name = 'FrontNavError';
    this.status = status;
    this.cause = cause;
  }
}
