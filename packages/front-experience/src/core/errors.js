export class FrontExperienceError extends Error {
  /**
   * @param {string} message
   * @param {number} [status]
   * @param {unknown} [cause]
   */
  constructor(message, status, cause) {
    super(message);
    this.name = 'FrontExperienceError';
    this.status = status;
    this.cause = cause;
  }
}
