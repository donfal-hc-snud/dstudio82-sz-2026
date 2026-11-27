# RhythmicVisual — Web

현재 배포 중인 웹 버전은 [`v12/`](./v12/)입니다. 최종 v11의 HTML / Three.js 웹 포트는 [`v11/`](./v11/)에 보존합니다. 기존 openFrameworks Spiral Trails 소스도 보존했습니다.

Vercel 프로젝트 이름: `rhythm-visualiser` · Root Directory: `v12` · Build: `npm run build` · Output: `dist`.

로컬 실행과 기능·검증 내용은 [v12 안내](./v12/README.md)를 확인하세요.

---

# Spiral Trails

An openFrameworks 0.12.1 animation. Two red and blue points orbit a vertical axis in 3D. Their history descends to form two intertwined spiral trails. The initial window size is 600 × 600 pixels and remains resizable. Hold the left mouse button and drag to rotate the view around the spirals.

## Run on macOS

Install Xcode, then clone this repository on your Mac and run the setup script from Terminal:

```bash
git clone https://github.com/donfal-hc-snud/dstudio82-sz-2026.git ~/Documents/dstudio82-sz-2026
bash ~/Documents/dstudio82-sz-2026/scripts/setup-macos.sh
```

If the repository is already cloned, update it with `git pull --ff-only` there and run the script. The script uses `/Users/donfal/Documents/openFrameworks/of_v0.12.1_osx_release` as the default openFrameworks path; set `OF_ROOT` to override it. It generates `apps/myApps/spiralTrails` with the bundled Project Generator, links the project's `src` to this Git checkout, builds with Xcode, opens the source in Cursor and the Xcode project, and launches the built app when found. Otherwise press Command-R in Xcode to run it. If the command-line Project Generator is absent, create `spiralTrails` with its GUI and rerun the script.

Open the Git checkout in Cursor to edit the source. The openFrameworks release and generated Xcode files remain outside this repository; the authored source and setup script are tracked here.

The animation runs continuously. Resize the window to any desired dimensions; the orbit stays centered and the visible trail length adapts to the new height. Left-drag rotates the camera; releasing the button stops the rotation.
