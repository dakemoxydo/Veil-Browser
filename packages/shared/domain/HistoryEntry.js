import { randomUUID } from 'crypto';
export class HistoryEntry {
    id;
    url;
    title;
    favicon;
    timestamp;
    constructor(props) {
        this.id = props.id;
        this.url = props.url;
        this.title = props.title;
        this.favicon = props.favicon;
        this.timestamp = props.timestamp;
    }
    static create(url, title) {
        return new HistoryEntry({
            id: randomUUID(),
            url,
            title,
            timestamp: Date.now(),
        });
    }
    static fromJSON(props) {
        return new HistoryEntry(props);
    }
    updateTitle(title) {
        this.title = title;
    }
    refresh() {
        this.timestamp = Date.now();
    }
    toJSON() {
        return {
            id: this.id,
            url: this.url,
            title: this.title,
            favicon: this.favicon,
            timestamp: this.timestamp,
        };
    }
}
