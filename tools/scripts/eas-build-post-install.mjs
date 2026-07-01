/**
 * This script is used to patch the '@nx/expo' package to work with EAS Build.
 * It is run as a eas-build-post-install script in the 'package.json' of expo app.
 * It is executed as 'node tools/scripts/eas-build-post-install.mjs <workspace root> <project root>'
 * It will create a symlink from the project's node_modules to the workspace's node_modules.
 * It also builds workspace libraries that are needed by the Expo app.
 */

import { symlink, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const [workspaceRoot, projectRoot] = process.argv.slice(2);

try {
  // Create symlink if it doesn't exist
  if (existsSync(join(workspaceRoot, "node_modules"))) {
    console.log("Symlink already exists");
  } else {
    symlink(
      join(projectRoot, "node_modules"),
      join(workspaceRoot, "node_modules"),
      "dir",
      (err) => {
        if (err) console.error("Symlink error:", err);
        else {
          console.log("Symlink created");
        }
      },
    );
  }

  // Build workspace libraries that are dependencies
  console.log("Building workspace libraries...");

  // Build api-services library
  const apiServicesPath = join(workspaceRoot, "libs", "api-services");
  if (existsSync(apiServicesPath)) {
    console.log("Building @store-credit-platform/api-services...");
    execSync("npm run build", {
      cwd: apiServicesPath,
      stdio: "inherit",
    });
    console.log("✓ @store-credit-platform/api-services built successfully");
  }

  console.log("EAS post-install setup completed successfully");
} catch (error) {
  console.error("Error during EAS post-install setup:", error);
  process.exit(1);
}
