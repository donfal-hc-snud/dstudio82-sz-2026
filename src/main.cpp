#include "ofMain.h"
#include "ofApp.h"

#include <memory>

int main() {
    ofGLFWWindowSettings settings;
    settings.setSize(600, 600);
    settings.resizable = true;

    auto window = ofCreateWindow(settings);
    ofRunApp(window, std::make_shared<ofApp>());
    ofRunMainLoop();
}
