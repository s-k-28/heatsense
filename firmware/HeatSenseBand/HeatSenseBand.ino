#include <Adafruit_SSD1306.h>
#include <splash.h>
#include <Adafruit_GFX.h>
#include <Adafruit_GrayOLED.h>
#include <Adafruit_SPITFT.h>
#include <Adafruit_SPITFT_Macros.h>
#include <gfxfont.h>

#include <Wire.h>

#include <ArduinoBLE.h>   // Arduino's official Bluetooth library (supports the Nano ESP32)

// HeatSense Band: heart rate + SpO2 (MAX30102) and steps + movement (MPU6050), sent over Bluetooth.
// Both sensors are read directly over I2C with no sensor libraries. Arduino Cloud has several
// MAX3010x libraries that share file names and doesn't always pick the same one, which broke builds.
// Wiring (all on the same I2C wires): VIN/VCC -> 3V3, GND -> GND, SDA -> A4, SCL -> A5. MPU6050 AD0 -> GND.

#define SERVICE_UUID "7c2daac7-c17d-4d78-bb0a-d6af909b166c"
#define DATA_UUID    "a69c8da6-232c-4de9-8185-c767023d0af0"

BLEService heatSenseService(SERVICE_UUID);
BLECharacteristic dataChar(DATA_UUID, BLERead | BLENotify, 20);   // the phone subscribes to this
bool phoneConnected = false;
uint16_t sequence = 0;

// ---- Motion: MPU6050 accelerometer + gyroscope ----
const uint8_t MPU_ADDR = 0x68;           // 0x69 if the board's AD0 pin is tied high
const float ACCEL_LSB_PER_G = 8192.0;    // +/-4 g range
const float GYRO_LSB_PER_DPS = 65.5;     // +/-500 deg/s range
const char* ACTIVITY_NAMES[] = {"still", "active", "walking", "running"};
bool imuReady = false;
float gyroBias[3] = {0, 0, 0};
unsigned long lastImuRead = 0;

// Step counting
float gravity = 1.0, stepSignal = 0, stepEnvelope = 0;
bool stepArmed = true;
bool walking = false;            // true once 4 steps in a row have been seen
uint8_t pendingSteps = 0;        // steps waiting to be confirmed as real walking
unsigned long lastStepMs = 0;
uint32_t stepCount = 0;          // total steps since the band turned on

// Once-a-second summary, sent to the phone
float enmoSum = 0, gyroSum = 0;  // movement beyond gravity (g) and rotation speed (deg/s), added up
uint16_t imuSamples = 0;
uint8_t stepsPerSecond[10];      // steps in each of the last 10 seconds, for cadence
uint8_t stepsThisSecond = 0, secondSlot = 0;
uint16_t motionMg = 0;           // average movement in the last second, milli-g with gravity removed
uint8_t cadence = 0;             // steps per minute
uint8_t activity = 0;            // 0 still, 1 active (drills, stretching), 2 walking, 3 running

void imuWrite(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

// Reads accel x/y/z, temperature, gyro x/y/z in one go.
bool imuReadRaw(int16_t* v) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)14) != 14) return false;
  for (int i = 0; i < 7; i++) {
    uint8_t hi = Wire.read();     // read one byte at a time so the order is guaranteed
    uint8_t lo = Wire.read();
    v[i] = (int16_t)((hi << 8) | lo);
  }
  return true;
}

bool startImu() {
  Wire.beginTransmission(MPU_ADDR);
  if (Wire.endTransmission() != 0) return false;   // nothing answered
  imuWrite(0x6B, 0x80);   // reset
  delay(100);
  imuWrite(0x6B, 0x01);   // wake up, clock from the gyro
  imuWrite(0x1A, 0x03);   // built-in low-pass filter (~44 Hz)
  imuWrite(0x19, 19);     // 1000 / (1 + 19) = 50 samples a second
  imuWrite(0x1B, 0x08);   // gyro +/-500 deg/s
  imuWrite(0x1C, 0x08);   // accel +/-4 g
  delay(50);

  // Gyro bias: average one second while the band sits still.
  long sum[3] = {0, 0, 0};
  int16_t v[7];
  int n = 0;
  for (int i = 0; i < 50; i++) {
    if (imuReadRaw(v)) { sum[0] += v[4]; sum[1] += v[5]; sum[2] += v[6]; n++; }
    delay(20);
  }
  if (n == 0) return false;
  for (int i = 0; i < 3; i++) gyroBias[i] = sum[i] / (float)n / GYRO_LSB_PER_DPS;
  return true;
}

void countStep(unsigned long now) {
  unsigned long gap = now - lastStepMs;
  lastStepMs = now;
  if (walking) {
    stepCount++;
    stepsThisSecond++;
    return;
  }
  // Not walking yet: only start counting after 4 steps in a row, so one arm wave or bump isn't a step.
  if (gap > 2000) pendingSteps = 0;
  pendingSteps++;
  if (pendingSteps >= 4) {
    walking = true;
    stepCount += pendingSteps;
    stepsThisSecond += pendingSteps;
    pendingSteps = 0;
  }
}

// Called 50 times a second.
void handleImuSample(unsigned long now) {
  int16_t v[7];
  if (!imuReadRaw(v)) return;
  float ax = v[0] / ACCEL_LSB_PER_G, ay = v[1] / ACCEL_LSB_PER_G, az = v[2] / ACCEL_LSB_PER_G;
  float gx = v[4] / GYRO_LSB_PER_DPS - gyroBias[0];
  float gy = v[5] / GYRO_LSB_PER_DPS - gyroBias[1];
  float gz = v[6] / GYRO_LSB_PER_DPS - gyroBias[2];
  float accel = sqrtf(ax * ax + ay * ay + az * az);      // total acceleration in g (1.0 at rest)
  float rotation = sqrtf(gx * gx + gy * gy + gz * gz);   // how fast the wrist is turning, deg/s

  enmoSum += max(0.0f, accel - 1.0f);   // movement beyond gravity
  gyroSum += rotation;
  imuSamples++;

  // Steps: remove the slow gravity part, smooth, then count each peak.
  gravity += (accel - gravity) * 0.02f;
  float dynamic = accel - gravity;
  stepSignal += (dynamic - stepSignal) * 0.35f;
  stepEnvelope = max(stepEnvelope * 0.99f, fabsf(stepSignal));
  float threshold = max(0.08f, stepEnvelope * 0.45f);

  if (stepArmed && stepSignal > threshold && now - lastStepMs > 250) {   // at most 4 steps a second
    countStep(now);
    stepArmed = false;
  }
  if (stepSignal < 0) stepArmed = true;           // wait for the signal to fall back before the next step
  if (now - lastStepMs > 2000) {                  // stopped moving
    walking = false;
    pendingSteps = 0;
  }
}

// Called once a second: turns the last second of samples into what the phone gets.
void summarizeMotion() {
  if (!imuReady) return;
  float enmo = imuSamples ? enmoSum / imuSamples : 0;   // g
  float spin = imuSamples ? gyroSum / imuSamples : 0;   // deg/s
  motionMg = (uint16_t)min(65535.0f, enmo * 1000.0f);
  enmoSum = 0;
  gyroSum = 0;
  imuSamples = 0;

  stepsPerSecond[secondSlot] = stepsThisSecond;
  secondSlot = (secondSlot + 1) % 10;
  stepsThisSecond = 0;
  int recent = 0;
  for (int i = 0; i < 10; i++) recent += stepsPerSecond[i];
  cadence = (uint8_t)min(255, recent * 6);   // steps in the last 10 s -> steps per minute

  if (cadence >= 140 || (cadence >= 100 && motionMg > 300)) activity = 3;   // running
  else if (cadence >= 50) activity = 2;                                     // walking
  else if (motionMg > 40 || spin > 40) activity = 1;                        // moving without steps
  else activity = 0;                                                        // still
}

// 20 bytes: version 3, sequence(2), seconds(4), heart rate, motion(2), gsr(2), battery, SpO2,
// steps(4), cadence, activity. Little-endian. 20 bytes fits one Bluetooth notification.
void sendPacket(uint8_t hr, uint8_t spo2Value) {
  uint8_t p[20];
  uint32_t s = millis() / 1000;
  p[0] = 3;
  p[1] = sequence & 0xFF; p[2] = sequence >> 8;
  p[3] = s; p[4] = s >> 8; p[5] = s >> 16; p[6] = s >> 24;
  p[7] = hr;                              // 0 = no valid reading
  p[8] = motionMg & 0xFF; p[9] = motionMg >> 8;   // movement, milli-g
  p[10] = 0; p[11] = 0;                   // gsr (not wired yet)
  p[12] = 255;                            // battery unknown
  p[13] = spo2Value;                      // 0 = no valid reading
  p[14] = stepCount; p[15] = stepCount >> 8; p[16] = stepCount >> 16; p[17] = stepCount >> 24;
  p[18] = cadence;
  p[19] = activity;
  dataChar.writeValue(p, sizeof(p));      // sends it to the phone if it has subscribed
  sequence++;
}

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire);

// ---- MAX30102, read directly ----
const uint8_t MAX_ADDR = 0x57;
const uint8_t REG_FIFO_WR_PTR = 0x04;
const uint8_t REG_OVF_COUNTER = 0x05;
const uint8_t REG_FIFO_RD_PTR = 0x06;
const uint8_t REG_FIFO_DATA   = 0x07;
const uint8_t REG_FIFO_CONFIG = 0x08;
const uint8_t REG_MODE_CONFIG = 0x09;
const uint8_t REG_SPO2_CONFIG = 0x0A;
const uint8_t REG_LED_RED     = 0x0C;
const uint8_t REG_LED_IR      = 0x0D;
const uint8_t REG_PART_ID     = 0xFF;   // always 0x15 on a MAX30102

void maxWrite(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(MAX_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

uint8_t maxRead(uint8_t reg) {
  Wire.beginTransmission(MAX_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MAX_ADDR, (uint8_t)1);
  return Wire.available() ? Wire.read() : 0;
}

// Same settings as before: LED ~6 mA, average 4, red + IR, 400 samples/s (100/s after averaging),
// 411 us pulses, 4096 nA range.
bool startMax30102() {
  if (maxRead(REG_PART_ID) != 0x15) return false;
  maxWrite(REG_MODE_CONFIG, 0x40);   // reset
  unsigned long start = millis();
  while ((maxRead(REG_MODE_CONFIG) & 0x40) && millis() - start < 100) delay(1);
  maxWrite(REG_FIFO_CONFIG, 0x50);   // average 4 samples, FIFO rollover on
  maxWrite(REG_SPO2_CONFIG, 0x2F);   // 4096 nA range, 400 samples/s, 411 us pulses (18-bit)
  maxWrite(REG_LED_RED, 0x1F);
  maxWrite(REG_LED_IR, 0x1F);
  maxWrite(REG_MODE_CONFIG, 0x03);   // SpO2 mode: red and IR
  maxWrite(REG_FIFO_WR_PTR, 0);
  maxWrite(REG_OVF_COUNTER, 0);
  maxWrite(REG_FIFO_RD_PTR, 0);
  return true;
}

const long FINGER_THRESHOLD = 50000;   // IR above this means a finger is on the sensor
const float SAMPLE_RATE = 100.0;       // 400 samples/s averaged 4 at a time

// ---- Heart rate: our own beat detector, adapts to any signal strength ----
float baseline = 0, pulse = 0, envelope = 0;
bool armed = true;
unsigned long sampleCount = 0, lastBeatSample = 0;
const byte RATE_SIZE = 4;              // average the last 4 beats
byte rates[RATE_SIZE];
byte rateSpot = 0;
byte ratesFilled = 0;
int beatAvg = 0;

// ---- SpO2: 4-second window at 25 samples/s ----
// We sample at 100/s, so every 4th sample goes into these buffers.
const int SPO2_LEN = 100;
uint32_t irBuffer[SPO2_LEN];
uint32_t redBuffer[SPO2_LEN];
int spo2Count = 0;
int sinceLastCalc = 0;
int decimate = 0;
int32_t spo2 = 0;
int8_t validSpo2 = 0;

long lastIr = 0;
unsigned long lastDisplay = 0;

void resetReadings() {
  ratesFilled = 0;
  rateSpot = 0;
  beatAvg = 0;
  lastBeatSample = 0;
  envelope = 0;
  pulse = 0;
  armed = true;
  spo2Count = 0;
  sinceLastCalc = 0;
  validSpo2 = 0;
}

void addBeat(float bpm) {
  rates[rateSpot] = (byte)(bpm + 0.5);
  rateSpot = (rateSpot + 1) % RATE_SIZE;
  if (ratesFilled < RATE_SIZE) ratesFilled++;
  int sum = 0;
  for (byte i = 0; i < ratesFilled; i++) sum += rates[i];
  beatAvg = (sum + ratesFilled / 2) / ratesFilled;
}

void detectBeat(uint32_t ir) {
  baseline += (ir - baseline) * 0.05;  // slow average: the steady part of the signal
  float ac = ir - baseline;            // what's left is the pulse
  pulse += (ac - pulse) * 0.3;         // smooth out noise
  float beatSignal = -pulse;           // IR dips with each heartbeat, so flip it

  envelope = max(envelope * 0.995f, fabsf(pulse));
  float threshold = envelope * 0.5;
  unsigned long sinceLastBeat = sampleCount - lastBeatSample;

  // A beat: the signal rises through the threshold, at least 0.3 s after the last beat.
  if (armed && beatSignal > threshold && envelope > 10 && sinceLastBeat > 30) {
    if (lastBeatSample > 0) {
      float bpm = 60.0 * SAMPLE_RATE / sinceLastBeat;
      if (bpm > 35 && bpm < 210) addBeat(bpm);
    }
    lastBeatSample = sampleCount;
    armed = false;
  }
  if (beatSignal < 0) armed = true;    // wait for the signal to fall back before the next beat
}

// How much a signal pulses: the RMS left after removing its straight-line drift over the window.
void pulseAndLevel(const uint32_t* x, float& ac, float& dc) {
  float meanI = (SPO2_LEN - 1) / 2.0, mean = 0;
  for (int i = 0; i < SPO2_LEN; i++) mean += x[i];
  mean /= SPO2_LEN;
  float num = 0, den = 0;
  for (int i = 0; i < SPO2_LEN; i++) { num += (i - meanI) * (x[i] - mean); den += (i - meanI) * (i - meanI); }
  float slope = num / den, sq = 0;
  for (int i = 0; i < SPO2_LEN; i++) {
    float r = x[i] - (mean + slope * (i - meanI));
    sq += r * r;
  }
  ac = sqrtf(sq / SPO2_LEN);
  dc = mean;
}

// SpO2 from the "ratio of ratios": oxygen-rich blood absorbs red and infrared light differently.
// The curve is Maxim's calibration for the MAX30102.
void calcSpo2() {
  float redAc, redDc, irAc, irDc;
  pulseAndLevel(redBuffer, redAc, redDc);
  pulseAndLevel(irBuffer, irAc, irDc);
  if (irAc < 20 || redDc <= 0 || irDc <= 0) { validSpo2 = 0; return; }   // too weak to trust
  float ratio = (redAc / redDc) / (irAc / irDc);
  if (ratio < 0.2 || ratio > 1.2) { validSpo2 = 0; return; }
  float value = -45.060 * ratio * ratio + 30.354 * ratio + 94.845;
  spo2 = (int32_t)(min(100.0f, value) + 0.5);
  validSpo2 = 1;
}

void handleSample(uint32_t red, uint32_t ir) {
  sampleCount++;
  lastIr = ir;
  if (ir < FINGER_THRESHOLD) {         // no finger: start over
    baseline = ir;
    resetReadings();
    return;
  }

  detectBeat(ir);

  // SpO2: keep every 4th sample (100/s -> 25/s).
  if (++decimate < 4) return;
  decimate = 0;

  if (spo2Count < SPO2_LEN) {
    redBuffer[spo2Count] = red;
    irBuffer[spo2Count] = ir;
    spo2Count++;
  } else {
    for (int i = 1; i < SPO2_LEN; i++) {
      redBuffer[i - 1] = redBuffer[i];
      irBuffer[i - 1] = irBuffer[i];
    }
    redBuffer[SPO2_LEN - 1] = red;
    irBuffer[SPO2_LEN - 1] = ir;
  }

  sinceLastCalc++;
  if (spo2Count == SPO2_LEN && sinceLastCalc >= 25) {   // every second, once 4 s are in
    sinceLastCalc = 0;
    calcSpo2();
  }
}

// Reads every sample waiting in the MAX30102's buffer.
void readMax30102() {
  uint8_t writePtr = maxRead(REG_FIFO_WR_PTR);
  uint8_t readPtr = maxRead(REG_FIFO_RD_PTR);
  int waiting = (writePtr - readPtr) & 0x1F;
  if (waiting == 0 && maxRead(REG_OVF_COUNTER) > 0) waiting = 32;   // buffer filled up completely
  for (int i = 0; i < waiting; i++) {
    Wire.beginTransmission(MAX_ADDR);
    Wire.write(REG_FIFO_DATA);
    Wire.endTransmission(false);
    if (Wire.requestFrom((uint8_t)MAX_ADDR, (uint8_t)6) != 6) return;
    uint8_t b[6];
    for (int j = 0; j < 6; j++) b[j] = Wire.read();   // one at a time, in order
    uint32_t red = (((uint32_t)b[0] << 16) | ((uint32_t)b[1] << 8) | b[2]) & 0x3FFFF;
    uint32_t ir  = (((uint32_t)b[3] << 16) | ((uint32_t)b[4] << 8) | b[5]) & 0x3FFFF;
    handleSample(red, ir);
  }
}

void updateDisplay() {
  summarizeMotion();
  bool finger = lastIr >= FINGER_THRESHOLD;
  bool spo2Ready = validSpo2 && spo2 > 70 && spo2 <= 100;
  int heartRate = ratesFilled >= RATE_SIZE ? beatAvg : 0;
  if (phoneConnected) sendPacket(finger ? heartRate : 0, (finger && spo2Ready) ? spo2 : 0);   // send to the phone once a second

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(F("HeatSense"));
  if (imuReady) { display.print(F("  ")); display.print(stepCount); display.print(F(" st")); }
  display.println();

  if (!finger) {
    display.setCursor(0, 24);
    display.println(F("Place finger on"));
    display.println(F("the sensor"));
  } else {
    display.setTextSize(2);
    display.setCursor(0, 16);
    if (heartRate > 0) { display.print(heartRate); display.println(F(" BPM")); }
    else display.println(F("-- BPM"));

    display.setCursor(0, 40);
    display.print(F("SpO2 "));
    if (spo2Ready) { display.print(spo2); display.println(F("%")); }
    else display.println(F("--"));
  }
  display.display();

  if (imuReady) {
    Serial.print("steps="); Serial.print(stepCount);
    Serial.print(" cadence="); Serial.print(cadence);
    Serial.print(" motion="); Serial.print(motionMg); Serial.print("mg ");
    Serial.print(ACTIVITY_NAMES[activity]);
    Serial.print("  |  ");
  }
  Serial.print("IR=");
  Serial.print(lastIr);
  if (!finger) {
    Serial.println("  | No finger detected");
    return;
  }
  Serial.print("  pulse size=");
  Serial.print((int)envelope);          // how strong the heartbeat signal is (useful for tuning)
  Serial.print("  beats=");
  Serial.print(ratesFilled);
  Serial.print("  | HR=");
  if (heartRate > 0) { Serial.print(heartRate); Serial.print(" BPM"); }
  else Serial.print("--");
  Serial.print("  SpO2=");
  if (spo2Ready) { Serial.print(spo2); Serial.println("%"); }
  else Serial.println(spo2Count < SPO2_LEN ? "measuring..." : "--");
}

void setup() {
  Serial.begin(115200);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    while (true);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("Initializing..."));
  display.display();

  Wire.begin();
  Wire.setClock(400000);
  if (!startMax30102()) {
    Serial.println("MAX30102 not found. Check wiring/power.");
    display.println("Sensor not found.");
    display.display();
    while (1);
  }
  display.println("MAX30102 Ready.");

  imuReady = startImu();   // keep the band still for a second while it calibrates
  Serial.println(imuReady ? "MPU6050 ready." : "MPU6050 not found: steps and motion will read 0. Check VCC->3V3, SDA->A4, SCL->A5.");
  display.println(imuReady ? "Motion Ready." : "No motion sensor.");

  display.println("Place finger...");
  display.display();
  Serial.println("Sensor ready. Rest a fingertip lightly on it and hold still.");

  if (!BLE.begin()) {
    Serial.println("Bluetooth failed to start.");
  } else {
    BLE.setLocalName("HeatSense Band");
    BLE.setDeviceName("HeatSense Band");
    BLE.setAdvertisedService(heatSenseService);
    heatSenseService.addCharacteristic(dataChar);
    BLE.addService(heatSenseService);
    BLE.advertise();
    Serial.println("Bluetooth on: \"HeatSense Band\"");
  }
}

void loop() {
  BLE.poll();                          // keep Bluetooth running
  phoneConnected = BLE.connected();
  readMax30102();

  if (imuReady && millis() - lastImuRead >= 20) {   // 50 motion samples a second
    lastImuRead = millis();
    handleImuSample(lastImuRead);
  }

  if (millis() - lastDisplay >= 1000) {
    lastDisplay = millis();
    updateDisplay();
  }
}
