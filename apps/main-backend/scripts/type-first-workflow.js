#!/usr/bin/env node

/**
 * Type-First Development Workflow
 *
 * 1. You write plain TypeScript types in src/app/types/*.types.ts
 * 2. This script:
 *    - Generates TypeBox schemas for backend validation
 *    - Copies types to frontend for type safety
 *
 * Single source of truth: Your TypeScript types!
 */

const fs = require("fs");
const path = require("path");
const Codegen = require("@sinclair/typebox-codegen");

console.log(
  "🔄 Type-First Workflow: Generating schemas and copying types...\n",
);

// Get all type files
const typesDir = path.join(__dirname, "../src/app/types");
// Separate main.types.ts (shared types) from API-specific types
const allTypeFiles = fs
  .readdirSync(typesDir)
  .filter((file) => file.endsWith(".types.ts") && file !== "database.types.ts");

// main.types.ts contains shared types that other files import
const mainTypesFile = "main.types.ts";
const apiTypeFiles = allTypeFiles.filter((file) => file !== mainTypesFile);

let mainTypesContent = "";
let apiTypesContent = "";
const generatedSchemas = [];

// Process main.types.ts first (shared types)
if (allTypeFiles.includes(mainTypesFile)) {
  const mainTypesPath = path.join(typesDir, mainTypesFile);
  const typesContent = fs.readFileSync(mainTypesPath, "utf8");

  console.log(`📖 Processing: ${mainTypesFile} (shared types)`);

  // Generate TypeBox schema
  console.log(`   🔨 Generating TypeBox schema...`);
  const generatedCode = Codegen.TypeScriptToTypeBox.Generate(typesContent);

  const schemaOutputPath = path.join(
    __dirname,
    "../src/app/schemas/main.schema.ts",
  );

  fs.writeFileSync(schemaOutputPath, generatedCode);
  console.log(`   ✅ Schema: schemas/main.schema.ts`);
  generatedSchemas.push("main.schema.ts");

  // Clean content for frontend (remove comments but keep the types)
  mainTypesContent = typesContent
    .replace(/\/\*\*[\s\S]*?\*\//g, "") // Remove block comments
    .replace(/\/\/.*$/gm, "") // Remove line comments
    .trim();
}

// Process API-specific type files
for (const typeFile of apiTypeFiles) {
  const typesPath = path.join(typesDir, typeFile);
  const typesContent = fs.readFileSync(typesPath, "utf8");

  console.log(`📖 Processing: ${typeFile}`);

  // Generate TypeBox schemas
  console.log(`   🔨 Generating TypeBox schemas...`);
  const generatedCode = Codegen.TypeScriptToTypeBox.Generate(typesContent);

  // Write generated schema
  const schemaName = typeFile.replace(".types.ts", ".schema.ts");
  const schemaOutputPath = path.join(
    __dirname,
    "../src/app/schemas",
    schemaName,
  );
  const schemaDir = path.dirname(schemaOutputPath);

  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
  }

  fs.writeFileSync(schemaOutputPath, generatedCode);
  console.log(`   ✅ Schema: schemas/${schemaName}`);

  generatedSchemas.push(schemaName);

  // Accumulate types for frontend (remove comments and imports)
  let cleanContent = typesContent
    .replace(/\/\*\*[\s\S]*?\*\//g, "") // Remove block comments
    .replace(/\/\/.*$/gm, "") // Remove line comments
    .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?\s*/gm, "") // Remove import statements
    .trim();

  // Remove excessive empty lines
  cleanContent = cleanContent.replace(/\n\s*\n\s*\n/g, "\n\n");

  apiTypesContent += cleanContent + "\n\n";
}

// Copy all types to frontend
console.log("\n📦 Copying types to frontends...");

const frontedPaths = [
  path.join(__dirname, "../../main-webapp/src/app/shared/types/api.types.ts"),
  path.join(__dirname, "../../../libs/api-services/src/types/api.types.ts"),
];

for (const frontedPath of frontedPaths) {
  const frontendDir = path.dirname(frontedPath);
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const frontendContent = `/**
 * Auto-generated API Types
 * Generated on: ${new Date().toISOString()}
 * 
 * ⚠️ DO NOT EDIT MANUALLY
 * Source: apps/smartschool-api/src/app/types/
 * Script: yarn generate:types
 * 
 * TYPE-FIRST WORKFLOW:
 * 1. Edit types in backend: apps/main-backend/src/app/types/*.types.ts
 * 2. Run: yarn generate:types
 * 3. Backend gets TypeBox schemas (for validation)
 * 4. Frontend gets TypeScript types (for type safety)
 * 5. Everything stays in sync automatically!
 * 
 * NOTE: Shared types from main.types.ts are included first.
 *       API-specific types follow, with imports removed.
 */

// ========================================
// SHARED TYPES (from main.types.ts)
// ========================================
${mainTypesContent}

// ========================================
// API-SPECIFIC TYPES
// ========================================
${apiTypesContent}`;

  fs.writeFileSync(frontedPath, frontendContent);
  console.log(`   ✅ Types: main-webapp/src/app/shared/types/api.types.ts`);

  // Run post-processing to fix schema imports
  console.log("\n🔧 Post-processing schemas...");
  const { execSync } = require("child_process");
  try {
    execSync("node apps/main-backend/scripts/fix-schema-imports.js", {
      stdio: "inherit",
    });
  } catch (error) {
    console.log("   ⚠️  Post-processing skipped (manual fix may be needed)");
  }
}

console.log("\n🎉 Generation Complete!\n");
console.log("📊 Summary:");
console.log(`   • Processed ${allTypeFiles.length} type file(s)`);
console.log(`   • Generated ${generatedSchemas.length} schema file(s)`);
console.log(`   • Updated frontend types`);
console.log("\n💡 Your workflow:");
console.log("   1. Edit types: apps/smartschool-api/src/app/types/*.types.ts");
console.log("   2. Run: yarn generate:types");
console.log("   3. Use schemas in backend, types in frontend - all in sync!");
