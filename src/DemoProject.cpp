#include <DemoProject.h>

DemoProject::DemoProject(AsyncWebServer* server, FS* fs, SecurityManager* securityManager) :
    AdminSettingsService(server, fs, securityManager, DEMO_SETTINGS_PATH, DEMO_SETTINGS_FILE) {
  pinMode(BLINK_LED, OUTPUT);
  
  ledcSetup(0, 5000, 8);
  ledcAttachPin(BLINK_LED, 0);
    // configure LED PWM functionalitites
  
}

DemoProject::~DemoProject() {
}

void DemoProject::loop() {
  unsigned delay = MAX_DELAY / 255 * (255 - _settings.blinkSpeed);
  unsigned long currentMillis = millis();
  if (!_lastBlink || (unsigned long)(currentMillis - _lastBlink) >= delay) {
    _lastBlink = currentMillis;
    digitalWrite(BLINK_LED, !digitalRead(BLINK_LED));
  }
}

void DemoProject::readFromJsonObject(JsonObject& root) {
  _settings.blinkSpeed = root["blink_speed"] | DEFAULT_BLINK_SPEED;
  //ledcWrite(BLINK_LED, 100/_settings.blinkSpeed*255);
  //ledcWrite(0, 100/_settings.blinkSpeed*255);
}

void DemoProject::writeToJsonObject(JsonObject& root) {
  // connection settings
  root["blink_speed"] = _settings.blinkSpeed;
  ledcWrite(0, (_settings.blinkSpeed/100.)*255);
}
