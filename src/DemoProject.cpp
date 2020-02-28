#include <DemoProject.h>
#include <ESPAsyncWebServer.h>
#include <functional>

DemoProject::DemoProject(AsyncWebServer* server, FS* fs, SecurityManager* securityManager) :
    AdminSettingsService(server, fs, securityManager, DEMO_SETTINGS_PATH, DEMO_SETTINGS_FILE),
    ws("/ws") {
  pinMode(BLINK_LED, OUTPUT);
  
  ledcSetup(0, 5000, 8);
  ledcAttachPin(BLINK_LED, 0);
    // configure LED PWM functionalitites
  
  //Wensockets handle
   ws.onEvent(std::bind(&DemoProject::onWsEvent, this, std::placeholders::_1, std::placeholders::_2, 
                        std::placeholders::_3, std::placeholders::_4, std::placeholders::_5, std::placeholders::_6));
   server->addHandler(&ws);
}

DemoProject::~DemoProject() {
}


void DemoProject::onWsEvent(AsyncWebSocket * server, AsyncWebSocketClient * client, AwsEventType type, void * arg, uint8_t *data, size_t len){

  if(type == WS_EVT_CONNECT){

    Serial.println("Websocket client connection received");
    const String &token = ((const AsyncWebServerRequest *) (arg))->arg("Authorization");
    if (token.startsWith(AUTHORIZATION_HEADER_PREFIX)) {
       Authentication authentication = ((SecuritySettingsService *)(this->_securityManager))->authenticateJWT(token.substring(AUTHORIZATION_HEADER_PREFIX_LEN));
       if (!getAuthenticationPredicate()(authentication)) {
         Serial.println("Unauthorized invalid token");
         client->close(401,"Invalid Token");  
       }
    }else{
      Serial.println("Unauthorized token missing");
      client->close(401,"Invalid Token"); 
    }
  } else if(type == WS_EVT_DISCONNECT){

    Serial.println("Client disconnected");
  } else if(type == WS_EVT_DATA){

    //Serial.println("Data received: ");
    data[len-1] = '\0';
    String dataIn((char*) data);
    int separator = dataIn.indexOf('|');
    String key = dataIn.substring(0,separator);
    String value = dataIn.substring(separator + 1);
    //Serial.println(key);
    //Serial.println(value);
    if (key = "blink_speed"){
        int ivalue = value.toInt();
        _settings.blinkSpeed = ivalue;
        ledcWrite(0, ivalue);
    }
    //Serial.println();
  }
}

void DemoProject::loop() {
  ledcWrite(0, _settings.blinkSpeed);
}

void DemoProject::readFromJsonObject(JsonObject& root) {
  _settings.blinkSpeed = root["blink_speed"] | DEFAULT_BLINK_SPEED;
  //ledcWrite(BLINK_LED, 100/_settings.blinkSpeed*255);
  //ledcWrite(0, 100/_settings.blinkSpeed*255);

}

void DemoProject::writeToJsonObject(JsonObject& root) {
  // connection settings
  root["blink_speed"] = _settings.blinkSpeed;
  ledcWrite(0, _settings.blinkSpeed);
}
