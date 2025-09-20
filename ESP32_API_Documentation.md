# ESP32 Water Level Monitor - API Documentation

This document describes the expected ESP32 endpoints that the Ionic app will communicate with.

## Base Configuration

- **Default IP**: `192.168.1.100` (configurable in the app)
- **Protocol**: HTTP
- **Port**: 80 (default)

## API Endpoints

### 1. Wake Up Endpoint
**POST** `/wakeup`

Wakes up the ESP32 from low power mode and initializes the water level sensor.

**Request Body:**
```json
{
  "command": "wake",
  "timestamp": 1694976000000
}
```

**Response:**
```json
{
  "connected": true,
  "lastSeen": 1694976000000,
  "signal": -45
}
```

**Response Codes:**
- `200`: Successfully woken up
- `408`: Timeout (device in deep sleep)
- `500`: Hardware error

---

### 2. Status Check Endpoint
**GET** `/status`

Check the current connection status and basic device information.

**Response:**
```json
{
  "connected": true,
  "lastSeen": 1694976000000,
  "signal": -45,
  "uptime": 3600,
  "freeMemory": 245760
}
```

**Response Codes:**
- `200`: Device is responsive
- `404`: Endpoint not found
- `500`: Device error

---

### 3. Water Level Endpoint
**GET** `/waterlevel`

Get the current water level reading from the ultrasonic or other sensor.

**Response:**
```json
{
  "level": 75,
  "timestamp": 1694976000000,
  "voltage": 3.2,
  "sensorType": "ultrasonic",
  "distance": 5.2,
  "tankHeight": 20.0
}
```

**Fields:**
- `level`: Water level percentage (0-100)
- `timestamp`: Unix timestamp of the reading
- `voltage`: Sensor supply voltage (optional)
- `sensorType`: Type of sensor used (optional)
- `distance`: Distance to water surface in cm (optional)
- `tankHeight`: Total tank height in cm (optional)

**Response Codes:**
- `200`: Successful reading
- `500`: Sensor error
- `503`: Sensor not ready

---

## Error Handling

All endpoints may return these common error responses:

### Network Errors
- **Connection Timeout**: Device is in deep sleep or powered off
- **404 Not Found**: Endpoint doesn't exist, check firmware version
- **500 Internal Server Error**: Hardware fault or sensor disconnected

### Example Error Response:
```json
{
  "error": "Sensor disconnected",
  "code": 500,
  "timestamp": 1694976000000
}
```

---

## ESP32 Arduino Code Example

Here's a complete Arduino sketch with power saving features:

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <esp_sleep.h>
#include <esp_wifi.h>

// WiFi credentials
const char* ssid = "your_wifi_ssid";
const char* password = "your_wifi_password";

// Hardware pins
const int TRIGGER_PIN = 5;
const int ECHO_PIN = 18;
const int LED_PIN = 2;
const int WAKEUP_PIN = 0; // GPIO0 for external wake-up

// Tank specifications (adjust for your tank)
const float TANK_HEIGHT = 100.0; // cm
const float EMPTY_DISTANCE = 95.0; // cm from sensor to empty tank
const float FULL_DISTANCE = 5.0;  // cm from sensor to full tank

// Power management
const unsigned long SLEEP_TIMEOUT = 180000; // 3 minutes in milliseconds
unsigned long lastActivityTime = 0;
bool isAwake = false;

WebServer server(80);

void setup() {
  Serial.begin(115200);
  
  // Check if we're waking up from deep sleep
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  
  switch(wakeup_reason) {
    case ESP_SLEEP_WAKEUP_EXT0:
      Serial.println("Wakeup caused by external signal using RTC_IO");
      break;
    case ESP_SLEEP_WAKEUP_EXT1:
      Serial.println("Wakeup caused by external signal using RTC_CNTL");
      break;
    case ESP_SLEEP_WAKEUP_TIMER:
      Serial.println("Wakeup caused by timer");
      break;
    case ESP_SLEEP_WAKEUP_TOUCHPAD:
      Serial.println("Wakeup caused by touchpad");
      break;
    case ESP_SLEEP_WAKEUP_ULP:
      Serial.println("Wakeup caused by ULP program");
      break;
    default:
      Serial.printf("Wakeup was not caused by deep sleep: %d\n", wakeup_reason);
      break;
  }
  
  // Initialize pins
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(WAKEUP_PIN, INPUT_PULLUP);
  
  // Configure wake-up source
  esp_sleep_enable_ext0_wakeup(GPIO_NUM_0, 0); // Wake on LOW signal
  
  // Initially go to light sleep to save power during WiFi connection
  setCpuFrequencyMhz(80); // Reduce CPU frequency to save power
  
  // Connect to WiFi with timeout
  connectToWiFi();
  
  // Setup web server routes
  setupRoutes();
  
  // Enable CORS for web app
  server.enableCORS(true);
  
  server.begin();
  Serial.println("HTTP server started");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Mark as awake and record activity time
  isAwake = true;
  lastActivityTime = millis();
  
  // Blink LED to indicate wake-up
  blinkLED(3);
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi connection failed, going to sleep...");
    goToDeepSleep();
  }
}

void setupRoutes() {
  // Wake up endpoint
  server.on("/wakeup", HTTP_POST, []() {
    Serial.println("Wake-up request received");
    lastActivityTime = millis(); // Reset activity timer
    isAwake = true;
    
    digitalWrite(LED_PIN, HIGH);
    
    // Initialize sensors if needed
    initializeSensors();
    
    DynamicJsonDocument response(300);
    response["connected"] = true;
    response["lastSeen"] = millis();
    response["signal"] = WiFi.RSSI();
    response["status"] = "awake";
    response["uptime"] = millis() / 1000;
    response["batteryVoltage"] = getBatteryVoltage();
    response["batteryPercent"] = getBatteryPercentage();
    response["lowBattery"] = isLowBattery();
    
    String jsonString;
    serializeJson(response, jsonString);
    
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(200, "application/json", jsonString);
    
    digitalWrite(LED_PIN, LOW);
    
    Serial.println("Wake-up response sent");
  });
  
  // Status endpoint
  server.on("/status", HTTP_GET, []() {
    Serial.println("Status request received");
    lastActivityTime = millis(); // Reset activity timer
    
    DynamicJsonDocument response(400);
    response["connected"] = true;
    response["lastSeen"] = millis();
    response["signal"] = WiFi.RSSI();
    response["uptime"] = millis() / 1000;
    response["freeMemory"] = ESP.getFreeHeap();
    response["isAwake"] = isAwake;
    response["timeUntilSleep"] = (SLEEP_TIMEOUT - (millis() - lastActivityTime)) / 1000;
    response["cpuFreq"] = getCpuFrequencyMhz();
    response["batteryVoltage"] = getBatteryVoltage();
    response["batteryPercent"] = getBatteryPercentage();
    response["lowBattery"] = isLowBattery();
    
    String jsonString;
    serializeJson(response, jsonString);
    
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", jsonString);
  });
  
  // Water level endpoint
  server.on("/waterlevel", HTTP_GET, []() {
    Serial.println("Water level request received");
    lastActivityTime = millis(); // Reset activity timer
    
    if (!isAwake) {
      // Device is in low power mode, send error
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(503, "application/json", "{\"error\":\"Device in sleep mode\",\"code\":503}");
      return;
    }
    
    digitalWrite(LED_PIN, HIGH);
    
    // Read water level
    float distance = getUltrasonicDistance();
    float waterLevel = calculateWaterLevel(distance);
    
    DynamicJsonDocument response(400);
    response["level"] = round(waterLevel);
    response["timestamp"] = millis();
    response["voltage"] = getBatteryVoltage(); // Changed from sensor voltage to battery voltage
    response["distance"] = distance;
    response["tankHeight"] = TANK_HEIGHT;
    response["sensorType"] = "ultrasonic";
    response["readings"] = getAverageReading(); // Multiple readings for accuracy
    response["batteryPercent"] = getBatteryPercentage();
    response["lowBattery"] = isLowBattery();
    
    String jsonString;
    serializeJson(response, jsonString);
    
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", jsonString);
    
    digitalWrite(LED_PIN, LOW);
    
    Serial.println("Water level response sent: " + String(waterLevel) + "%");
    
    // Check battery after each request
    checkBatteryAndSleep();
  });
  
  // Health endpoint with battery info
  server.on("/health", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    
    StaticJsonDocument<300> health;
    health["status"] = "online";
    health["uptime"] = millis();
    health["freeHeap"] = ESP.getFreeHeap();
    health["batteryVoltage"] = getBatteryVoltage();
    health["batteryPercent"] = getBatteryPercentage();
    health["lowBattery"] = isLowBattery();
    health["wakeupCount"] = bootCount;
    health["powerMode"] = "battery";
    
    String jsonString;
    serializeJson(health, jsonString);
    server.send(200, "application/json", jsonString);
    
    checkBatteryAndSleep();
  });
  
  // Handle CORS preflight requests
  server.on("/wakeup", HTTP_OPTIONS, handleCORS);
  server.on("/status", HTTP_OPTIONS, handleCORS);
  server.on("/waterlevel", HTTP_OPTIONS, handleCORS);
  server.on("/health", HTTP_OPTIONS, handleCORS);
}

void handleCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200);
}

void initializeSensors() {
  // Initialize or re-initialize sensors after wake-up
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Warm up sensors (some sensors need time to stabilize)
  delay(100);
  
  // Take a dummy reading to ensure sensor is working
  getUltrasonicDistance();
  
  Serial.println("Sensors initialized");
}

float getUltrasonicDistance() {
  // Take multiple readings for accuracy
  float totalDistance = 0;
  int validReadings = 0;
  
  for (int i = 0; i < 5; i++) {
    // Clear the trigger pin
    digitalWrite(TRIGGER_PIN, LOW);
    delayMicroseconds(2);
    
    // Send ultrasonic pulse
    digitalWrite(TRIGGER_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIGGER_PIN, LOW);
    
    // Read echo pin with timeout
    long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
    
    if (duration > 0) {
      float distance = (duration * 0.034) / 2;
      
      // Filter out obviously wrong readings
      if (distance > 2 && distance < 400) {
        totalDistance += distance;
        validReadings++;
      }
    }
    
    delay(50); // Small delay between readings
  }
  
  if (validReadings > 0) {
    return totalDistance / validReadings;
  } else {
    Serial.println("Error: No valid ultrasonic readings");
    return -1; // Error indicator
  }
}

float calculateWaterLevel(float distance) {
  if (distance < 0) return -1; // Error from sensor
  
  // Ensure distance is within valid range
  if (distance < FULL_DISTANCE) distance = FULL_DISTANCE;
  if (distance > EMPTY_DISTANCE) distance = EMPTY_DISTANCE;
  
  // Calculate percentage (0-100%)
  float percentage = ((EMPTY_DISTANCE - distance) / (EMPTY_DISTANCE - FULL_DISTANCE)) * 100.0;
  
  // Ensure percentage is within 0-100%
  if (percentage < 0) percentage = 0;
  if (percentage > 100) percentage = 100;
  
  return percentage;
}

float getAverageReading() {
  // Take multiple readings for more accurate results
  float total = 0;
  int count = 3;
  
  for (int i = 0; i < count; i++) {
    float distance = getUltrasonicDistance();
    if (distance > 0) {
      total += calculateWaterLevel(distance);
    }
    delay(100);
  }
  
  return total / count;
}

float getBatteryVoltage() {
  // Read battery voltage through voltage divider
  int rawValue = analogRead(BATTERY_PIN);
  float voltage = (rawValue * 3.3 / 4095.0) * 3.09; // Compensate for voltage divider
  return voltage;
}

int getBatteryPercentage() {
  float voltage = getBatteryVoltage();
  
  // Convert voltage to percentage (6.8V = 0%, 9.6V = 100%)
  float percentage = ((voltage - BATTERY_MIN_VOLTAGE) / (BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE)) * 100.0;
  
  if (percentage < 0) percentage = 0;
  if (percentage > 100) percentage = 100;
  
  return (int)percentage;
}

bool isLowBattery() {
  return getBatteryVoltage() < (BATTERY_MIN_VOLTAGE + 0.5); // Low battery warning at 7.3V
}

void checkBatteryAndSleep() {
  if (isLowBattery() && ENABLE_LOW_BATTERY_SLEEP) {
    Serial.println("Low battery detected, entering extended sleep...");
    
    // Flash LED to indicate low battery
    for (int i = 0; i < 10; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
    
    // Enter extended sleep (24 hours)
    esp_sleep_enable_timer_wakeup(24 * 60 * 60 * 1000000ULL);
    goToDeepSleep();
  }
}

void enterUltraPowerMode() {
  Serial.println("Entering ultra power saving mode...");
  
  // Disable ADC when not needed
  adc_power_off();
  
  // Disable WiFi completely in deep sleep
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  esp_wifi_stop();
  
  // Disable Bluetooth if enabled
  esp_bt_controller_disable();
  
  // Configure minimal power domains
  esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_PERIPH, ESP_PD_OPTION_OFF);
  esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_SLOW_MEM, ESP_PD_OPTION_OFF);
  esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_FAST_MEM, ESP_PD_OPTION_OFF);
  
  // Set all unused GPIO to input with pullup to reduce current
  for (int i = 2; i <= 39; i++) {
    if (i != TRIGGER_PIN && i != ECHO_PIN && i != LED_PIN && i != WAKEUP_PIN) {
      pinMode(i, INPUT_PULLUP);
    }
  }
}

void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
}

void goToDeepSleep() {
  Serial.println("Going to deep sleep...");
  Serial.flush();
  
  // Turn off LED
  digitalWrite(LED_PIN, LOW);
  
  // Enter ultra power saving mode
  enterUltraPowerMode();
  
  // Configure wake-up sources
  esp_sleep_enable_ext0_wakeup(GPIO_NUM_0, 0); // Wake on button press
  
  // Timer wake-up based on battery level
  unsigned long sleepTime;
  if (isLowBattery()) {
    sleepTime = 24 * 60 * 60 * 1000000ULL; // 24 hours for low battery
  } else {
    sleepTime = 12 * 60 * 60 * 1000000ULL; // 12 hours normal
  }
  
  esp_sleep_enable_timer_wakeup(sleepTime);
  
  // Enter deep sleep
  esp_deep_sleep_start();
}

void loop() {
  server.handleClient();
  
  // Check battery status every hour
  static unsigned long lastBatteryCheck = 0;
  if (millis() - lastBatteryCheck > BATTERY_CHECK_INTERVAL) {
    checkBatteryAndSleep();
    lastBatteryCheck = millis();
  }
  
  // Check for inactivity timeout (extended for battery saving)
  if (isAwake && (millis() - lastActivityTime > SLEEP_TIMEOUT)) {
    Serial.println("Inactivity timeout reached - going to deep sleep");
    goToDeepSleep();
  }
  
  // Reduce loop frequency to save power
  delay(50); // Increased from 10ms to reduce CPU usage
}
```

## Power Management Features

### 1. **Deep Sleep Mode**
- ESP32 enters deep sleep after 3 minutes of inactivity
- Wake-up via GPIO 0 (button press) or timer (30 minutes)
- Minimal power consumption (~10µA)
- WiFi connection lost, needs reconnection

### 2. **Light Sleep Mode** (Alternative)
- CPU frequency reduced to 40MHz
- WiFi kept in power-save mode
- Wake-up on HTTP request
- Faster response time

### 3. **Activity Monitoring**
- Tracks last request time
- Resets timeout on each API call
- LED indicators for status

### 4. **Wake-up Sequence**
1. External trigger or timer wakes ESP32
2. WiFi reconnection
3. Sensor initialization
4. HTTP server restart
5. Send wake confirmation
6. Ready for water level requests

---

## Testing Without ESP32

For development and testing, you can use a mock server or modify the service to simulate responses:

### Using JSON Server (Node.js)
1. Install: `npm install -g json-server`
2. Create `db.json`:
```json
{
  "status": {
    "connected": true,
    "lastSeen": 1694976000000,
    "signal": -45
  },
  "waterlevel": {
    "level": 75,
    "timestamp": 1694976000000,
    "voltage": 3.2
  }
}
```
3. Run: `json-server --watch db.json --port 3000`
4. Update app to use `http://localhost:3000`

### Mock Responses in Service
You can temporarily modify the `WaterLevelService` to return mock data for testing.

---

## Troubleshooting Power Management

### Common Issues

#### **ESP32 Won't Wake Up**
- Check GPIO 0 wiring and button connection
- Verify wake-up source configuration
- Test timer wake-up independently
- Check power supply stability during sleep

#### **High Power Consumption in Sleep**
- Disable unnecessary peripherals before sleep
- Check for floating GPIO pins
- Verify WiFi is properly disconnected
- Use multimeter to measure actual current

#### **WiFi Connection Issues After Wake**
- Increase WiFi connection timeout
- Add retry logic with exponential backoff
- Check router power-saving settings
- Consider static IP configuration

#### **App Timeout Errors**
- Increase app timeout values (10-15 seconds)
- Add retry mechanism in app
- Implement queue for multiple requests
- Show proper loading states

### Debug Commands

```cpp
// Check wake-up reason
esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
Serial.println("Wake-up reason: " + String(wakeup_reason));

// Monitor power consumption
Serial.println("Free heap: " + String(ESP.getFreeHeap()));
Serial.println("CPU frequency: " + String(getCpuFrequencyMhz()));

// Test sensors before sleep
float testReading = getUltrasonicDistance();
Serial.println("Sensor test: " + String(testReading));
```

### Performance Optimization

```cpp
// Faster WiFi connection
WiFi.setAutoReconnect(true);
WiFi.persistent(true);
WiFi.setTxPower(WIFI_POWER_19_5dBm);

// Sensor warm-up optimization
void quickSensorTest() {
  // Single quick reading to verify sensor
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 10000);
  return duration > 0; // Return true if sensor responds
}
```

---

## Power Management

### Sleep Modes Explained

#### **Deep Sleep Mode** (Recommended for Battery Operation)
- **Power Consumption**: ~10-15µA
- **Wake-up Time**: 2-3 seconds
- **WiFi**: Disconnected (needs reconnection)
- **Memory**: Only RTC memory preserved
- **Wake Sources**: GPIO, Timer, Touchpad

#### **Light Sleep Mode** (Recommended for Mains Power)
- **Power Consumption**: ~800µA-2mA
- **Wake-up Time**: <100ms
- **WiFi**: Maintained in power-save mode
- **Memory**: All RAM preserved
- **Wake Sources**: Any interrupt, timer

### Implementation Flow

```
[App Request] → [ESP32 Wake] → [WiFi Connect] → [Sensor Init] → [Response]
                     ↓
[3 min timer] → [Check Activity] → [Sleep Mode] → [Wait for Wake]
```

### Configuration Options

```cpp
// Timing Configuration - Optimized for 9V Battery
const unsigned long SLEEP_TIMEOUT = 300000;      // 5 minutes (extended for battery)
const unsigned long DEEP_SLEEP_TIME = 86400000;  // 24 hours timer wake (ultra power saving)
const unsigned long WIFI_TIMEOUT = 15000;        // 15 seconds WiFi connect timeout
const unsigned long SENSOR_WARMUP = 200;         // 200ms sensor warm-up

// Power Levels - Battery Optimized
const int ACTIVE_CPU_FREQ = 160;     // Reduced from 240MHz to save power
const int SLEEP_CPU_FREQ = 80;       // Higher sleep freq for faster wake

// Wake-up pins
const int WAKEUP_PIN = 0;            // GPIO 0 for button wake-up

// Battery monitoring
const int BATTERY_PIN = A0;          // ADC pin for battery voltage monitoring
const float BATTERY_MIN_VOLTAGE = 6.8;  // Minimum 9V battery voltage
const float BATTERY_MAX_VOLTAGE = 9.6;  // Maximum 9V battery voltage

// Ultra power saving features
const bool ENABLE_BATTERY_MONITOR = true;
const bool ENABLE_LOW_BATTERY_SLEEP = true;
const unsigned long BATTERY_CHECK_INTERVAL = 3600000; // Check every hour
```

### 9V Battery Specific Hardware Setup

#### **Voltage Regulation Circuit**
```
[9V Battery] → [AMS1117-3.3V] → [ESP32 3.3V]
     |              |
   [100µF]      [100µF + 10µF]
     |              |
   [GND]          [GND]

Optional: Low Dropout Regulator for better efficiency
[9V Battery] → [MCP1700-3.3V] → [ESP32 3.3V]
```

#### **Battery Monitoring Circuit**
```
[9V Battery] → [47kΩ] → [GPIO A0] → [22kΩ] → [GND]
                           |
                    [10nF capacitor]
                           |
                         [GND]

Voltage Divider Ratio: 9V → 2.87V (within ESP32 ADC range)
```

#### **Ultra Low Power Modifications**
```cpp
// Disable unnecessary peripherals
void enterUltraPowerMode() {
  // Disable ADC when not needed
  adc_power_off();
  
  // Disable WiFi radio completely
  esp_wifi_deinit();
  
  // Disable Bluetooth
  esp_bt_controller_disable();
  
  // Reduce RTC clock speed
  rtc_clk_slow_freq_set(RTC_SLOW_FREQ_32K_XTAL);
  
  // Disable RTC peripherals
  esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_PERIPH, ESP_PD_OPTION_OFF);
  esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_SLOW_MEM, ESP_PD_OPTION_OFF);
}
```

### Battery Life Estimation

**6F22 9V Battery (High Watt Brand) Analysis:**

**Battery Specifications:**
- **Voltage**: 9V (6.8V-9.6V range)
- **Capacity**: ~600mAh (typical for alkaline 6F22)
- **Chemistry**: Alkaline
- **Self-discharge**: ~2% per year
- **Operating temp**: -18°C to +55°C

**Power Consumption Analysis:**

#### **Deep Sleep Mode (Recommended for 9V Battery):**
- **ESP32 Deep Sleep**: ~10-15µA
- **Voltage Regulator Loss**: ~50-100µA (depending on regulator efficiency)
- **Total Sleep Current**: ~100µA average

**Battery Life Calculation:**
```
Capacity: 600mAh = 600,000µAh
Average Current: 100µA
Theoretical Life: 600,000µAh ÷ 100µA = 6,000 hours = 250 days

Real-world factors:
- Battery aging: -20%
- Temperature effects: -10%
- Voltage drop compensation: -15%
- Wake-up cycles (1x/day): -5%

Estimated Battery Life: ~150-180 days (5-6 months)
```

#### **With Frequent Monitoring (5x/day):**
- **Active time per check**: ~30 seconds
- **Active current**: ~150mA
- **Daily active energy**: 5 × 30s × 150mA = 0.625mAh/day
- **Sleep energy**: 23.99h × 0.1mA = 2.4mAh/day
- **Total daily consumption**: ~3mAh/day

**Battery Life with Regular Use: ~180-200 days (6-7 months)**

#### **Power-Critical Mode (Ultra Low Power):**
- **Check frequency**: 1x/day
- **Extended sleep**: 23+ hours
- **Daily consumption**: ~2.5mAh/day

**Ultra Power Mode Battery Life: ~220-240 days (7-8 months)**

### Hardware Wake-up Circuit

```
[3.3V] ----[10kΩ]---- [GPIO 0] ---- [Button] ---- [GND]
                            |
                       [ESP32 Wake]
```

**Button Press**: Pulls GPIO 0 to LOW → Wakes ESP32

### Alternative Wake-up Methods

#### **Timer Wake-up Only**
```cpp
// Wake every hour for status check
esp_sleep_enable_timer_wakeup(3600 * 1000000ULL);
esp_deep_sleep_start();
```

#### **External Interrupt Wake-up**
```cpp
// Wake on water level sensor trigger
esp_sleep_enable_ext1_wakeup(BIT(GPIO_NUM_4), ESP_EXT1_WAKEUP_ANY_HIGH);
```

#### **HTTP Server Auto-wake** (Advanced)
```cpp
// Keep minimal server running to detect wake-up requests
// Implementation requires custom UDP listener
```
