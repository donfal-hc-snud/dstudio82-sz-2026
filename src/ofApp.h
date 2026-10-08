#pragma once

#include "ofMain.h"

class ofApp : public ofBaseApp {
public:
    void setup() override;
    void update() override;
    void draw() override;

private:
    ofPolyline makeTrail(float phaseOffset, float ageLimit) const;

    float startTime = 0.0f;
    float elapsed = 0.0f;
};
