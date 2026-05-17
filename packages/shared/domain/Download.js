import { randomUUID } from 'crypto';
export class Download {
    id;
    filename;
    url;
    path;
    totalBytes;
    receivedBytes;
    state;
    startTime;
    constructor(props) {
        this.id = props.id;
        this.filename = props.filename;
        this.url = props.url;
        this.path = props.path;
        this.totalBytes = props.totalBytes;
        this.receivedBytes = props.receivedBytes;
        this.state = props.state;
        this.startTime = props.startTime;
    }
    static create(filename, url, downloadPath, totalBytes) {
        return new Download({
            id: randomUUID(),
            filename,
            url,
            path: downloadPath,
            totalBytes,
            receivedBytes: 0,
            state: 'progressing',
            startTime: Date.now(),
        });
    }
    static fromJSON(props) {
        return new Download(props);
    }
    updateProgress(receivedBytes) {
        this.receivedBytes = receivedBytes;
    }
    complete() {
        this.state = 'completed';
        this.receivedBytes = this.totalBytes;
    }
    cancel() {
        this.state = 'cancelled';
    }
    interrupt() {
        this.state = 'interrupted';
    }
    isActive() {
        return this.state === 'progressing';
    }
    getProgress() {
        if (this.totalBytes === 0)
            return 0;
        return Math.round((this.receivedBytes / this.totalBytes) * 100);
    }
    toJSON() {
        return {
            id: this.id,
            filename: this.filename,
            url: this.url,
            path: this.path,
            totalBytes: this.totalBytes,
            receivedBytes: this.receivedBytes,
            state: this.state,
            startTime: this.startTime,
        };
    }
}
