#pragma once

#include "ofMain.h"

class ofApp : public ofBaseApp {
public:
    void setup() override;
    void update() override;
    void draw() override;
    void windowResized(int width, int height) override;
    void mousePressed(int x, int y, int button) override;
    void mouseDragged(int x, int y, int button) override;
    void mouseReleased(int x, int y, int button) override;

private:
    ofPolyline makeTrail(float phaseOffset, float ageLimit) const;
    void updateCamera();

    ofCamera camera;
    float startTime = 0.0f;
    float elapsed = 0.0f;
    float cameraDistance = 540.0f;
    float yaw = 0.4f;
    float pitch = 0.14f;
    int previousMouseX = 0;
    int previousMouseY = 0;
    bool rotating = false;
};
