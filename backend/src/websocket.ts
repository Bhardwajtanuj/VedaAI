import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

const clients = new Map<string, Set<WebSocket>>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const assignmentId = url.searchParams.get("assignmentId");

    if (!assignmentId) {
      ws.close(1008, "Missing assignmentId");
      return;
    }

    if (!clients.has(assignmentId)) {
      clients.set(assignmentId, new Set());
    }
    clients.get(assignmentId)!.add(ws);

    ws.on("close", () => {
      clients.get(assignmentId)?.delete(ws);
      if (clients.get(assignmentId)?.size === 0) {
        clients.delete(assignmentId);
      }
    });

    ws.send(JSON.stringify({ type: "connected", assignmentId }));
  });

  return wss;
}

export function notifyClients(assignmentId: string, payload: object) {
  const sockets = clients.get(assignmentId);
  if (!sockets) return;
  const message = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}
