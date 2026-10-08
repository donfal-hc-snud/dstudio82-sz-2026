#include "ofApp.h"

#include <algorithm>
#include <cmath>

namespace {
constexpr float kPi = 3.14159265358979323846f;
constexpr float kOrbitRadius = 52.0f;
constexpr float kAngularSpeed = 3.0f;   // Radians per second.
constexpr float kFallSpeed = 115.0f;    // World units per second, along the helix axis.
constexpr float kSampleInterval = 1.0f / 120.0f;
constexpr float kFov = 60.0f;
constexpr float kMaxPitch = 1.31f;      // About 75 degrees; avoids camera flips.

glm::vec3 trailPoint(float phase, float age) {
    return {
        kOrbitRadius * std::cos(phase),
        -kFallSpeed * age,
        kOrbitRadius * std::sin(phase)
    };
}
}  // namespace

void ofApp::setup() {
    ofSetWindowTitle("3D Spiral Trails");
    ofSetFrameRate(60);
    ofSetVerticalSync(true);
    ofEnableAntiAliasing();
    ofSetSphereResolution(24);
    camera.setFov(kFov);
    camera.setNearClip(1.0f);
    camera.setFarClip(10000.0f);
    cameraDistance = std::max(350.0f, ofGetHeight() * 0.9f);
    updateCamera();
    startTime = ofGetElapsedTimef();
}

void ofApp::update() {
    elapsed = ofGetElapsedTimef() - startTime;
}

ofPolyline ofApp::makeTrail(float phaseOffset, float ageLimit) const {
    ofPolyline trail;
    const int samples = std::min(2000, std::max(1, static_cast<int>(std::ceil(ageLimit / kSampleInterval))));

    // The two old positions descend along a shared vertical axis in 3D space.
    for (int i = samples; i >= 0; --i) {
        const float age = ageLimit * static_cast<float>(i) / samples;
        const float phase = kAngularSpeed * (elapsed - age) + phaseOffset;
        trail.addVertex(trailPoint(phase, age));
    }
    return trail;
}

void ofApp::draw() {
    ofBackground(13, 16, 25);

    // Retain enough history to extend below the viewport, even when tilted.
    const float halfViewHeight = cameraDistance * std::tan(kFov * kPi / 360.0f);
    const float verticalProjection = std::max(0.25f, std::cos(pitch));
    const float ageToBottom = (halfViewHeight + 2.0f * kOrbitRadius) /
                              (kFallSpeed * verticalProjection) + 0.5f;
    const float ageLimit = std::min(elapsed, ageToBottom);

    const struct {
        float offset;
        ofColor color;
    } strands[] = {
        {0.0f, ofColor(255, 67, 76)},
        {kPi, ofColor(65, 136, 255)}
    };

    ofEnableDepthTest();
    camera.begin();
    ofSetLineWidth(4.0f);
    for (const auto& strand : strands) {
        ofSetColor(strand.color);
        makeTrail(strand.offset, ageLimit).draw();

        const float phase = kAngularSpeed * elapsed + strand.offset;
        ofDrawSphere(trailPoint(phase, 0.0f), 8.0f);
    }
    camera.end();
    ofDisableDepthTest();
}

void ofApp::updateCamera() {
    const float cosPitch = std::cos(pitch);
    camera.setPosition({
        cameraDistance * std::sin(yaw) * cosPitch,
        cameraDistance * std::sin(pitch),
        cameraDistance * std::cos(yaw) * cosPitch
    });
    camera.lookAt({0.0f, 0.0f, 0.0f});
}

void ofApp::windowResized(int, int height) {
    cameraDistance = std::max(350.0f, height * 0.9f);
    updateCamera();
}

void ofApp::mousePressed(int x, int y, int button) {
    if (button == OF_MOUSE_BUTTON_LEFT) {
        rotating = true;
        previousMouseX = x;
        previousMouseY = y;
    }
}

void ofApp::mouseDragged(int x, int y, int button) {
    if (!rotating || button != OF_MOUSE_BUTTON_LEFT) return;

    yaw += (x - previousMouseX) * 0.008f;
    pitch += (y - previousMouseY) * 0.008f;
    pitch = std::max(-kMaxPitch, std::min(kMaxPitch, pitch));
    previousMouseX = x;
    previousMouseY = y;
    updateCamera();
}

void ofApp::mouseReleased(int, int, int button) {
    if (button == OF_MOUSE_BUTTON_LEFT) rotating = false;
}
