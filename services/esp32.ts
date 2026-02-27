/**
 * ESP32 WebSocket service
 * Manages connection to ESP32's WebSocket server and sends
 * scanned-item / receipt data to the 20×4 LCD display.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Receipt } from "@/types/grocery";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

type Listener = (status: ConnectionStatus) => void;

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const STORAGE_KEY = "@skart/esp32_ip";
const DEFAULT_PORT = 81;
const RECONNECT_DELAY_MS = 3000;
const PING_INTERVAL_MS = 10000;

/* ================================================================== */
/*  Singleton service                                                  */
/* ================================================================== */

class Esp32Service {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "disconnected";
  private listeners = new Set<Listener>();
  private espIp: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private manualDisconnect = false;

  /* ---------- public getters ---------- */

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getIp(): string | null {
    return this.espIp;
  }

  /* ---------- listeners ---------- */

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.status));
  }

  private setStatus(s: ConnectionStatus) {
    if (this.status !== s) {
      this.status = s;
      this.notify();
    }
  }

  /* ---------- persistence ---------- */

  async loadSavedIp(): Promise<string | null> {
    try {
      const ip = await AsyncStorage.getItem(STORAGE_KEY);
      if (ip) this.espIp = ip;
      return ip;
    } catch {
      return null;
    }
  }

  async saveIp(ip: string): Promise<void> {
    this.espIp = ip;
    await AsyncStorage.setItem(STORAGE_KEY, ip);
  }

  async clearIp(): Promise<void> {
    this.espIp = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  /* ---------- connect / disconnect ---------- */

  connect(ip?: string) {
    const target = ip ?? this.espIp;
    if (!target) return;

    this.manualDisconnect = false;
    this.cleanup();
    this.espIp = target;

    const url = `ws://${target}:${DEFAULT_PORT}`;
    console.log(`[ESP32] Connecting to ${url}…`);
    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("[ESP32] Connected");
        this.setStatus("connected");
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ready") {
            console.log("[ESP32] LCD ready");
          }
        } catch {
          // ignore non-JSON
        }
      };

      this.ws.onerror = (event) => {
        console.log("[ESP32] WebSocket error", event);
      };

      this.ws.onclose = () => {
        console.log("[ESP32] Disconnected");
        this.setStatus("disconnected");
        this.stopPing();
        if (!this.manualDisconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.error("[ESP32] Failed to create WebSocket:", err);
      this.setStatus("disconnected");
    }
  }

  disconnect() {
    this.manualDisconnect = true;
    this.cleanup();
    this.setStatus("disconnected");
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try {
        this.ws.close();
      } catch {
        // already closed
      }
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.espIp && !this.manualDisconnect) {
        console.log("[ESP32] Attempting reconnect…");
        this.connect();
      }
    }, RECONNECT_DELAY_MS);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, PING_INTERVAL_MS);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /* ---------- send helpers ---------- */

  private send(data: object): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const json = JSON.stringify(data);
      console.log(`[ESP32] Sending: ${json}`);
      this.ws.send(json);
      return true;
    }
    console.log(
      `[ESP32] Cannot send — WebSocket state: ${
        this.ws ? this.ws.readyState : "null"
      }, status: ${this.status}`,
    );
    return false;
  }

  /** Send a scanned item to display on the LCD */
  sendItem(product: { name: string; price: number }, quantity: number) {
    this.send({
      type: "item",
      name: product.name,
      price: product.price,
      qty: quantity,
    });
  }

  /** Send the full receipt to scroll on the LCD */
  sendReceipt(receipt: Receipt) {
    const lines: string[] = [];

    // Header
    lines.push("====================");
    lines.push("      S-KART        ");
    lines.push("   GROCERY  STORE   ");
    lines.push("====================");
    lines.push("");

    // Items
    for (const item of receipt.items) {
      const name = item.product.name.substring(0, 20);
      lines.push(name);
      const detail = ` ${item.quantity}x P${item.product.price.toFixed(2)}`;
      const lineTotal = `P${(item.product.price * item.quantity).toFixed(2)}`;
      // Right-align total
      const padLen = 20 - detail.length - lineTotal.length;
      const padding = padLen > 0 ? " ".repeat(padLen) : " ";
      lines.push(detail + padding + lineTotal);
    }

    lines.push("--------------------");

    // Totals
    const sub = `Subtotal: P${receipt.subtotal.toFixed(2)}`;
    lines.push(sub);
    const tax = `Tax (12%): P${receipt.tax.toFixed(2)}`;
    lines.push(tax);
    lines.push("--------------------");
    const total = `TOTAL:  P${receipt.total.toFixed(2)}`;
    lines.push(total);
    lines.push("====================");

    // Footer
    lines.push("");
    lines.push("  Thank you for     ");
    lines.push("  shopping at       ");
    lines.push("  S-Kart!           ");
    lines.push("");
    lines.push(`Receipt: ${receipt.id}`);
    lines.push(new Date(receipt.date).toLocaleString());
    lines.push("====================");

    this.send({ type: "receipt", lines });
  }

  /** Tell the ESP32 to clear and show idle */
  sendClear() {
    this.send({ type: "clear" });
  }
}

/* ================================================================== */
/*  Export singleton                                                    */
/* ================================================================== */

export const esp32 = new Esp32Service();
