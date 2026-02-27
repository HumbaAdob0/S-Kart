/*
 * S-Kart ESP32 LCD Display Firmware
 * ==================================
 * Works with the S-Kart React Native POS app.
 * Receives scanned item data and receipt content via WebSocket,
 * then displays them on a 20×4 I2C LCD.
 *
 * Hardware:
 *   - ESP32 Dev Board (any variant)
 *   - 20×4 I2C LCD with PCF8574 backpack (address 0x27 or 0x3F)
 *
 * Libraries required (install via Arduino Library Manager):
 *   1. LiquidCrystal_I2C  by Frank de Brabander
 *   2. ArduinoJson         by Benoit Blanchon (v7+)
 *   3. WebSockets          by Markus Sattler
 *   4. WiFiManager         by tzapu (search "WiFiManager" in Library Manager)
 *   5. WiFi                (built-in with ESP32 board package)
 *
 * WiFi Setup:
 *   On first boot (or when saved WiFi is unavailable), the ESP32 creates
 *   a hotspot named "S-Kart-Setup". Connect to it from your phone/laptop
 *   and a captive portal will open where you can select a WiFi network
 *   and enter the password. Credentials are saved to flash and persist
 *   across reboots.
 *
 *   To reset saved WiFi: press and hold the BOOT button for 5+ seconds
 *   while the ESP32 is running — it will erase credentials and restart
 *   the setup portal.
 *
 * Protocol (JSON over WebSocket):
 *   Phone → ESP32:
 *     { "type": "item",    "name": "...", "price": 12.50, "qty": 2 }
 *     { "type": "receipt",  "lines": ["Line 1", "Line 2", ...] }
 *     { "type": "clear" }
 *     { "type": "ping" }
 *
 *   ESP32 → Phone:
 *     { "type": "pong" }
 *     { "type": "ready" }
 */

#include <WiFi.h>
#include <WiFiManager.h>        // tzapu WiFiManager
#include <WebSocketsServer.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <Preferences.h>        // ESP32 NVS for first-boot flag

/* ──────────────────────────────────────────────
 *  USER CONFIG
 * ────────────────────────────────────────────── */

// WiFiManager AP name (the hotspot users connect to for setup)
#define WM_AP_NAME   "S-Kart-Setup"

// I2C LCD address – most modules use 0x27; some use 0x3F
#define LCD_ADDR  0x27
#define LCD_COLS  20
#define LCD_ROWS  4

// WebSocket server port (must match the app's config)
#define WS_PORT   81

// BOOT button pin for WiFi reset (GPIO 0 on most ESP32 boards)
#define RESET_BTN_PIN  0
#define RESET_HOLD_MS  5000  // hold 5 seconds to reset WiFi
/* ────────────────────────────────────────────── */

LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
WebSocketsServer  ws = WebSocketsServer(WS_PORT);
WiFiManager       wm;

/* ──────── Custom characters (peso sign ₱) ──────── */
byte pesoChar[8] = {
  0b01110,
  0b10001,
  0b11111,
  0b10000,
  0b11111,
  0b10001,
  0b01110,
  0b00000
};

/* ──────── State ──────── */
enum DisplayMode { MODE_IDLE, MODE_ITEM, MODE_RECEIPT, MODE_AP };
DisplayMode currentMode = MODE_IDLE;

String receiptLines[200];   // up to 200 receipt lines
int    receiptLineCount = 0;
int    receiptScrollPos  = 0;
unsigned long lastScrollTime = 0;
const unsigned long SCROLL_INTERVAL_MS = 1500;

int connectedClients = 0;

/* ──────── WiFi reconnect ──────── */
unsigned long lastWifiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL_MS = 5000;
int wifiRetryCount = 0;
const int MAX_RETRY_BEFORE_PORTAL = 12; // ~60s of retries, then open portal

/* ──────── Reset button ──────── */
unsigned long btnPressStart = 0;
bool btnWasPressed = false;

/* ================================================================== */
/*  LCD helpers                                                        */
/* ================================================================== */

String padRight(const String& s, int len) {
  String out = s;
  while ((int)out.length() < len) out += ' ';
  return out.substring(0, len);
}

void lcdClear() {
  lcd.clear();
}

void lcdPrintLine(int row, const String& text) {
  lcd.setCursor(0, row);
  lcd.print(padRight(text, LCD_COLS));
}

void showIdle() {
  currentMode = MODE_IDLE;
  lcdClear();
  lcdPrintLine(0, "   === S-Kart ===   ");
  lcdPrintLine(1, " Grocery POS System ");
  lcdPrintLine(2, padRight("IP:" + WiFi.localIP().toString(), LCD_COLS));
  lcdPrintLine(3, connectedClients > 0 ? "Phone: Connected" : "Waiting for phone...");
}

void showAPMode() {
  currentMode = MODE_AP;
  lcdClear();
  lcdPrintLine(0, "   === S-Kart ===   ");
  lcdPrintLine(1, " WiFi Setup Mode    ");
  lcdPrintLine(2, "Connect to WiFi:    ");
  lcdPrintLine(3, WM_AP_NAME);
}

/* ================================================================== */
/*  Display a newly scanned item                                       */
/* ================================================================== */

void showItem(const String& name, float price, int qty) {
  currentMode = MODE_ITEM;
  lcdClear();
  lcdPrintLine(0, ">> Item Added <<");
  lcdPrintLine(1, name.substring(0, LCD_COLS));
  String priceStr = "Price: P" + String(price, 2);
  lcdPrintLine(2, priceStr);
  String qtyStr = "Qty:" + String(qty) + "  Tot:P" + String(price * qty, 2);
  lcdPrintLine(3, qtyStr);
}

/* ================================================================== */
/*  Display scrolling receipt                                          */
/* ================================================================== */

void startReceiptDisplay(JsonArray& lines) {
  receiptLineCount = 0;
  for (JsonVariant v : lines) {
    if (receiptLineCount < 200) {
      receiptLines[receiptLineCount++] = v.as<String>();
    }
  }
  receiptScrollPos = 0;
  lastScrollTime = millis();
  currentMode = MODE_RECEIPT;
  renderReceiptPage();
}

void renderReceiptPage() {
  lcdClear();
  for (int r = 0; r < LCD_ROWS; r++) {
    int idx = receiptScrollPos + r;
    if (idx < receiptLineCount) {
      lcdPrintLine(r, receiptLines[idx]);
    } else {
      lcdPrintLine(r, "");
    }
  }
}

void tickReceiptScroll() {
  if (currentMode != MODE_RECEIPT) return;
  if (millis() - lastScrollTime < SCROLL_INTERVAL_MS) return;
  lastScrollTime = millis();

  if (receiptScrollPos + LCD_ROWS < receiptLineCount) {
    receiptScrollPos++;
    renderReceiptPage();
  } else {
    delay(3000);
    showIdle();
  }
}

/* ================================================================== */
/*  WebSocket event handler                                            */
/* ================================================================== */

void onWebSocketEvent(uint8_t clientNum, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {

    case WStype_CONNECTED: {
      connectedClients++;
      Serial.printf("[WS] Client #%u connected\n", clientNum);
      ws.sendTXT(clientNum, "{\"type\":\"ready\"}");
      if (currentMode == MODE_IDLE) showIdle();
      break;
    }

    case WStype_DISCONNECTED: {
      connectedClients = max(0, connectedClients - 1);
      Serial.printf("[WS] Client #%u disconnected\n", clientNum);
      if (currentMode == MODE_IDLE) showIdle();
      break;
    }

    case WStype_TEXT: {
      Serial.printf("[WS] Received: %s\n", payload);

      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, payload, length);
      if (err) {
        Serial.printf("[WS] JSON parse error: %s\n", err.c_str());
        return;
      }

      const char* msgType = doc["type"];
      if (!msgType) return;

      if (strcmp(msgType, "item") == 0) {
        String name  = doc["name"].as<String>();
        float  price = doc["price"] | 0.0f;
        int    qty   = doc["qty"]   | 1;
        showItem(name, price, qty);
      }
      else if (strcmp(msgType, "receipt") == 0) {
        JsonArray lines = doc["lines"].as<JsonArray>();
        if (lines) {
          startReceiptDisplay(lines);
        }
      }
      else if (strcmp(msgType, "clear") == 0) {
        showIdle();
      }
      else if (strcmp(msgType, "ping") == 0) {
        ws.sendTXT(clientNum, "{\"type\":\"pong\"}");
      }

      break;
    }

    default:
      break;
  }
}

/* ================================================================== */
/*  WiFiManager callbacks                                              */
/* ================================================================== */

void onAPStarted(WiFiManager* mgr) {
  Serial.println("[WiFiManager] Config portal started");
  showAPMode();
}

/* ================================================================== */
/*  Setup                                                              */
/* ================================================================== */

void setup() {
  Serial.begin(115200);
  Serial.println("\n[S-Kart] Starting ESP32 LCD Display...");

  // ── Reset button ──
  pinMode(RESET_BTN_PIN, INPUT_PULLUP);

  // ── LCD init ──
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, pesoChar);
  lcdClear();
  lcdPrintLine(0, "   === S-Kart ===   ");
  lcdPrintLine(1, "Connecting WiFi...");

  // ── WiFiManager setup ──
  wm.setAPCallback(onAPStarted);
  wm.setConnectTimeout(20);          // 20s per connection attempt
  wm.setConfigPortalTimeout(180);    // portal stays open 3 min then retries saved creds
  wm.setMinimumSignalQuality(15);    // hide very weak networks

  // ── First-boot detection ──
  // On fresh upload, erase old WiFi credentials so the portal opens.
  // After the first successful setup the flag is set and this won't run again.
  Preferences prefs;
  prefs.begin("skart", false);
  bool alreadySetup = prefs.getBool("wm_init", false);
  if (!alreadySetup) {
    Serial.println("[Setup] First boot after flash — erasing old WiFi creds...");
    lcdPrintLine(1, "First-time setup...");
    wm.resetSettings();              // clear any leftover credentials
    prefs.putBool("wm_init", true);  // mark as initialized
  }
  prefs.end();

  // autoConnect: tries saved credentials first.
  // If no saved creds or connection fails → opens AP portal.
  bool connected = wm.autoConnect(WM_AP_NAME);

  if (connected) {
    Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    lcdPrintLine(2, "IP:" + WiFi.localIP().toString());
    lcdPrintLine(3, "Port:" + String(WS_PORT));
  } else {
    Serial.println("[WiFi] Portal timed out, will retry in loop...");
    lcdPrintLine(2, "WiFi: Retrying...");
    lcdPrintLine(3, "Hold BOOT to reset");
  }

  // ── WebSocket server ──
  ws.begin();
  ws.onEvent(onWebSocketEvent);
  Serial.printf("[WS] Server started on port %d\n", WS_PORT);

  delay(2000);
  if (WiFi.status() == WL_CONNECTED) {
    showIdle();
  }
}

/* ================================================================== */
/*  WiFi auto-reconnect                                                */
/* ================================================================== */

void checkWifi() {
  if (millis() - lastWifiCheck < WIFI_CHECK_INTERVAL_MS) return;
  lastWifiCheck = millis();

  if (WiFi.status() == WL_CONNECTED) {
    if (wifiRetryCount > 0) {
      Serial.println("[WiFi] Reconnected!");
      wifiRetryCount = 0;
      lcdClear();
      lcdPrintLine(0, "   === S-Kart ===   ");
      lcdPrintLine(1, " WiFi Reconnected!  ");
      lcdPrintLine(2, "IP:" + WiFi.localIP().toString());
      lcdPrintLine(3, "Port:" + String(WS_PORT));
      delay(2000);
      showIdle();
    }
    return;
  }

  wifiRetryCount++;
  Serial.printf("[WiFi] Disconnected. Retry #%d...\n", wifiRetryCount);

  // If too many retries, reopen the config portal
  if (wifiRetryCount >= MAX_RETRY_BEFORE_PORTAL) {
    Serial.println("[WiFi] Too many retries — opening setup portal...");
    wifiRetryCount = 0;
    showAPMode();
    wm.setConfigPortalTimeout(180);
    wm.startConfigPortal(WM_AP_NAME);
    // After portal closes (success or timeout), continue loop
    if (WiFi.status() == WL_CONNECTED) {
      showIdle();
    }
    return;
  }

  lcdClear();
  lcdPrintLine(0, "   === S-Kart ===   ");
  lcdPrintLine(1, "WiFi Disconnected!");
  lcdPrintLine(2, "Reconnecting...");
  lcdPrintLine(3, "Retry #" + String(wifiRetryCount));

  WiFi.disconnect();
  delay(500);
  WiFi.reconnect();
}

/* ================================================================== */
/*  BOOT button: hold 5s to erase WiFi creds & restart portal          */
/* ================================================================== */

void checkResetButton() {
  bool pressed = (digitalRead(RESET_BTN_PIN) == LOW);

  if (pressed && !btnWasPressed) {
    // Just pressed
    btnPressStart = millis();
    btnWasPressed = true;
  }
  else if (pressed && btnWasPressed) {
    // Still held
    if (millis() - btnPressStart >= RESET_HOLD_MS) {
      Serial.println("[Reset] BOOT held 5s — erasing WiFi credentials...");
      lcdClear();
      lcdPrintLine(0, "   === S-Kart ===   ");
      lcdPrintLine(1, "Resetting WiFi...");
      lcdPrintLine(2, "Erasing saved creds");
      lcdPrintLine(3, "Restarting...");
      delay(1500);
      wm.resetSettings();   // erase saved SSID/password
      // Also reset the first-boot flag so portal opens on restart
      Preferences p;
      p.begin("skart", false);
      p.putBool("wm_init", false);
      p.end();
      ESP.restart();         // reboot → will open portal on next boot
    }
  }
  else {
    btnWasPressed = false;
  }
}

/* ================================================================== */
/*  Loop                                                               */
/* ================================================================== */

void loop() {
  checkResetButton();
  checkWifi();
  ws.loop();
  tickReceiptScroll();
}
