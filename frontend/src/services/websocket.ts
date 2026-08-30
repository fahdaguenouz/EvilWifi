type EventHandler = (event: any) => void;

class WebSocketService {
    private socket: WebSocket | null = null;
    private handlers: EventHandler[] = [];
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    connect() {
        if (this.socket) {
            return;
        }
        
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
        };

        this.socket.onmessage = (message) => {
            try {
                const data = JSON.parse(message.data);
                this.handlers.forEach(handler => handler(data));
            } catch (e) {
                console.error('Error parsing WebSocket message', e);
            }
        };

        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            this.socket = null;
            // Reconnect after 2 seconds
            setTimeout(() => this.connect(), 2000);
        };
    }

    subscribe(handler: EventHandler) {
        this.handlers.push(handler);
        return () => {
            this.handlers = this.handlers.filter(h => h !== handler);
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/events';
export const wsService = new WebSocketService(WS_URL);
