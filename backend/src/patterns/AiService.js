export class AiService {
  async recommend() {
    throw new Error(`${this.constructor.name} must implement recommend`);
  }
}
