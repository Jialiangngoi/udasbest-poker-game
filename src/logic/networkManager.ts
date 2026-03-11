import Peer, { type DataConnection } from 'peerjs';

export type NetworkMessage =
    | { type: 'STATE_UPDATE', state: any }
    | { type: 'ACTION', action: string, payload: any, ownerId: string }
    | { type: 'JOIN_REQUEST', name: string, avatarUrl?: string, ownerId: string };

export class NetworkManager {
    private peer: Peer | null = null;
    private connections: DataConnection[] = [];
    private onMessageCallback: (msg: NetworkMessage, conn?: DataConnection) => void;
    private onOpenCallback: (id: string) => void;

    constructor(onMessage: (msg: NetworkMessage, conn?: DataConnection) => void, onOpen: (id: string) => void) {
        this.onMessageCallback = onMessage;
        this.onOpenCallback = onOpen;
    }

    initialize(id?: string) {
        this.peer = new Peer(id!, {
            debug: 2
        });

        this.peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            this.onOpenCallback(id);
        });

        this.peer.on('connection', (conn) => {
            console.log('Incoming connection from ' + conn.peer);
            this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
        });
    }

    connect(targetId: string) {
        if (!this.peer) return;
        const conn = this.peer.connect(targetId);
        this.setupConnection(conn);
    }

    private setupConnection(conn: DataConnection) {
        conn.on('open', () => {
            console.log('Connected to ' + conn.peer);
            if (!this.connections.find(c => c.peer === conn.peer)) {
                this.connections.push(conn);
            }
        });

        conn.on('data', (data) => {
            console.log('Received data from ' + conn.peer, data);
            this.onMessageCallback(data as NetworkMessage, conn);
        });

        conn.on('close', () => {
            console.log('Connection closed with ' + conn.peer);
            this.connections = this.connections.filter(c => c.peer !== conn.peer);
        });
    }

    broadcast(message: NetworkMessage) {
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(message);
            }
        });
    }

    sendToHost(message: NetworkMessage) {
        if (this.connections.length > 0) {
            this.connections[0].send(message);
        }
    }

    get isHost() {
        // Simple heuristic: host has multiple connections or started first
        return this.connections.length > 0;
    }

    get peerId() {
        return this.peer?.id;
    }

    destroy() {
        this.connections.forEach(c => c.close());
        this.peer?.destroy();
    }
}
