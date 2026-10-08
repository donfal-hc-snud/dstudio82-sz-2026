#include "ofApp.h"

#include <algorithm>
#include <cmath>

namespace {
constexpr float kPi = 3.14159265358979323846f;
constexpr float kOrbitRadius = 52.0f;
constexpr float kAngularSpeed = 3.0f;   // Radians per second.
constexpr float kFallSpeed = 115.0f;    // Pixels of downward trail travel per second.
constexpr float kSampleInterval = 1.0f / 120.0f;

glm::vec3 trailPoint(float phase, float age, float centerX, float centerY) {
    return {
        centerX + kOrbitRadius * std::cos(phase),
        centerY + kOrbitRadius * std::sin(phase) + kFallSpeed * age,
        0.0f
    };
}
}  // namespace

void ofApp::setup() {
    ofSetWindowTitle("Spiral Trails");
    ofSetFrameRate(60);
    ofSetVerticalSync(true);
    ofEnableAntiAliasing();
    ofSetCircleResolution(48);
    startTime = ofGetElapsedTimef();
}

void ofApp::update() {
    elapsed = ofGetElapsedTimef() - startTime;
}

ofPolyline ofApp::makeTrail(float phaseOffset, float ageLimit) const {
    ofPolyline trail;
    const float centerX = ofGetWidth() * 0.5f;
    const float centerY = ofGetHeight() * 0.5f;
    const int samples = std::max(1, static_cast<int>(std::ceil(ageLimit / kSampleInterval)));

    // Old positions move down while the two current positions orbit the center.
    for (int i = samples; i >= 0; --i) {
        const float age = ageLimit * static_cast<float>(i) / samples;
        const float phase = kAngularSpeed * (elapsed - age) + phaseOffset;
        trail.addVertex(trailPoint(phase, age, centerX, centerY));
    }
    return trail;
}

void ofApp::draw() {
    ofBackground(13, 16, 25);

    // Keep enough history to reach below the window, including after a resize.
    const float ageToBottom = (ofGetHeight() * 0.5f + kOrbitRadius) / kFallSpeed;
    const float ageLimit = std::min(elapsed, ageToBottom);
    const float centerX = ofGetWidth() * 0.5f;
    const float centerY = ofGetHeight() * 0.5f;

    const struct {
        float offset;
        ofColor color;
    } strands[] = {
        {0.0f, ofColor(255, 67, 76)},
        {kPi, ofColor(65, 136, 255)}
    };

    ofSetLineWidth(4.0f);
    for (const auto& strand : strands) {
        ofSetColor(strand.color);
        makeTrail(strand.offset, ageLimit).draw();

        const float phase = kAngularSpeed * elapsed + strand.offset;
        ofDrawCircle(trailPoint(phase, 0.0f, centerX, centerY), 7.0f);
    }
}
