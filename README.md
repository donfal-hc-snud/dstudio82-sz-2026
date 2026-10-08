# Spiral Trails

An openFrameworks 0.12.1 animation. Two red and blue points orbit the center of a resizable window. Their history drifts downward, forming two intertwined spiral trails. The initial window size is 600 × 600 pixels.

## Run on macOS

1. In your openFrameworks 0.12.1 installation, create a new project called `spiralTrails` in `apps/myApps` with the openFrameworks Project Generator.
2. Move the generated placeholder `src` directory aside, then link the project's `src` to this repository's `src`. That keeps edits made in Cursor inside Git:

   ```bash
   mv /path/to/openFrameworks/apps/myApps/spiralTrails/src /path/to/openFrameworks/apps/myApps/spiralTrails/src.generated-backup
   ln -s /path/to/dstudio82-sz-2026/src /path/to/openFrameworks/apps/myApps/spiralTrails/src
   ```

   Replace both example paths with the actual paths on your Mac. Run the commands only after creating a fresh project.
3. Open this repository in Cursor to edit the source. Open the generated `.xcodeproj` in Xcode to build and run the app. The openFrameworks release and its project files remain outside this repository.

The animation runs continuously. Resize the window to any desired dimensions; the orbit stays centered and the visible trail length adapts to the new height.
