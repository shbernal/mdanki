import { sanitizeString } from "../utils.js";

class Card {
  front: string;

  back: string;

  tags: string[];

  constructor(front: string, back: string, tags: string[] = []) {
    this.front = front;
    this.back = back;
    this.tags = tags;
  }

  addTag(dirtyTag: string): void {
    const tag = sanitizeString(dirtyTag);
    if (tag) {
      this.tags.push(tag);
    }
  }
}

export default Card;
