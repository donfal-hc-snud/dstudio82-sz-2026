# Spiral Trails

An openFrameworks 0.12.1 animation. Two red and blue points orbit the center of a resizable window. Their history drifts downward, forming two intertwined spiral trails. The initial window size is 600 × 600 pixels.

## Run on macOS

Install Xcode, then clone this repository on your Mac and run the setup script from Terminal:

```bash
git clone https://github.com/donfal-hc-snud/dstudio82-sz-2026.git ~/Documents/dstudio82-sz-2026
bash ~/Documents/dstudio82-sz-2026/scripts/setup-macos.sh
```

If the repository is already cloned, update it with `git pull --ff-only` there and run the script. The script uses `/Users/donfal/Documents/openFrameworks/of_v0.12.1_osx_release` as the default openFrameworks path; set `OF_ROOT` to override it. It generates `apps/myApps/spiralTrails` with the bundled Project Generator, links the project's `src` to this Git checkout, builds with Xcode, opens the source in Cursor and the Xcode project, and launches the built app when found. Otherwise press Command-R in Xcode to run it. If the command-line Project Generator is absent, create `spiralTrails` with its GUI and rerun the script.

Open the Git checkout in Cursor to edit the source. The openFrameworks release and generated Xcode files remain outside this repository; the authored source and setup script are tracked here.

The animation runs continuously. Resize the window to any desired dimensions; the orbit stays centered and the visible trail length adapts to the new height.
