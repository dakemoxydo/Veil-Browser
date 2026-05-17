import { randomUUID } from 'crypto';
export class Bookmark {
    id;
    url;
    title;
    favicon;
    dateAdded;
    folder;
    constructor(props) {
        this.id = props.id;
        this.url = props.url;
        this.title = props.title;
        this.favicon = props.favicon;
        this.dateAdded = props.dateAdded;
        this.folder = props.folder;
    }
    static create(url, title, folder, favicon) {
        return new Bookmark({
            id: randomUUID(),
            url,
            title,
            favicon,
            dateAdded: Date.now(),
            folder,
        });
    }
    static fromJSON(props) {
        return new Bookmark(props);
    }
    matchesUrl(url) {
        return this.url === url;
    }
    updateTitle(title) {
        this.title = title;
    }
    updateFavicon(favicon) {
        this.favicon = favicon;
    }
    toJSON() {
        return {
            id: this.id,
            url: this.url,
            title: this.title,
            favicon: this.favicon,
            dateAdded: this.dateAdded,
            folder: this.folder,
        };
    }
}
