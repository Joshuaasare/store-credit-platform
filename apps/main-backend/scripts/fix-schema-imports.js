#!/usr/bin/env node

/**
 * Post-Generation Schema Fix
 *
 * TypeBox code generation doesn't handle imports, so generated schemas
 * that use types from main.types.ts won't have the necessary imports.
 *
 * This script automatically adds imports from main.schema.ts
 * where needed.
 */

const fs = require("fs");
const path = require("path");

console.log("🔧 Post-processing generated schemas...\n");

const schemasDir = path.join(__dirname, "../src/app/schemas");
const schemaFiles = fs
  .readdirSync(schemasDir)
  .filter((file) => file.endsWith(".schema.ts") && file !== "main.schema.ts");

// Read main.schema.ts to extract exported type names
const mainSchemaPath = path.join(schemasDir, "main.schema.ts");
const mainSchemaContent = fs.readFileSync(mainSchemaPath, "utf8");

// Extract all exported const names from main.schema.ts
// These are the schemas that other files might import
const exportedSchemas = [];
const exportMatches = mainSchemaContent.matchAll(/export const (\w+) =/g);
for (const match of exportMatches) {
  exportedSchemas.push(match[1]);
}

console.log(
  `📋 Available schemas in main.schema.ts: ${exportedSchemas.join(", ")}\n`,
);

for (const schemaFile of schemaFiles) {
  const schemaPath = path.join(schemasDir, schemaFile);
  let content = fs.readFileSync(schemaPath, "utf8");

  // Check which schemas from main.schema.ts are used in this file
  const usedSchemas = exportedSchemas.filter((schemaName) => {
    // Look for the schema being used but not defined in this file
    // Updated regex to detect:
    // 1. Type.Array(SchemaName)
    // 2. Type.Optional(SchemaName)
    // 3. Type.Intersect([SchemaName
    // 4. Type.Union([SchemaName
    // 5. Direct usage: SchemaName, or SchemaName)
    // 6. data: SchemaName
    // 7. Type.Index(SchemaName,
    // 8. = SchemaName
    const usagePattern = new RegExp(
      `(Type\\.Array\\(${schemaName}\\)|Type\\.Optional\\(${schemaName}\\)|Type\\.Union\\(\\[\\s*${schemaName}|Type\\.Intersect\\(\\[\\s*${schemaName}|Type\\.Composite\\(\\[\\s*${schemaName}|:\\s*${schemaName}\\s*[,\\}\\)]|data:\\s*${schemaName}\\s*[,\\}]|Type\\.Index\\(${schemaName},|=\\s*${schemaName}\\s*($|;|\\n)|[,\\[]\\s*${schemaName}\\s*[,\\])])`,
      "g",
    );
    const definitionPattern = new RegExp(
      `export (type|const) ${schemaName} =`,
      "g",
    );

    const isUsed = usagePattern.test(content);
    const isDefined = definitionPattern.test(content);

    return isUsed && !isDefined;
  });

  if (usedSchemas.length > 0) {
    console.log(`📝 ${schemaFile}`);
    console.log(`   Adding imports: ${usedSchemas.join(", ")}`);

    // Check if import already exists
    const hasMainSchemaImport = content.includes("from './main.schema'");

    if (!hasMainSchemaImport) {
      // Add import after the first import line
      const importStatement = `import { ${usedSchemas.join(", ")} } from './main.schema'\n`;
      content = content.replace(
        /(import { Type, Static } from '@sinclair\/typebox')/,
        `$1\n${importStatement}`,
      );

      fs.writeFileSync(schemaPath, content);
      console.log(`   ✅ Import added\n`);
    } else {
      // Import exists, check if we need to add more types
      const currentImportMatch = content.match(
        /import { (.*?) } from '\.\/main\.schema'/,
      );
      if (currentImportMatch) {
        const currentImports = currentImportMatch[1]
          .split(",")
          .map((s) => s.trim());
        const newImports = usedSchemas.filter(
          (s) => !currentImports.includes(s),
        );

        if (newImports.length > 0) {
          const allImports = [...new Set([...currentImports, ...usedSchemas])];
          const newImportStatement = `import { ${allImports.join(", ")} } from './main.schema'`;
          content = content.replace(
            /import { .*? } from '\.\/main\.schema'/,
            newImportStatement,
          );
          fs.writeFileSync(schemaPath, content);
          console.log(`   ✅ Import updated with: ${newImports.join(", ")}\n`);
        } else {
          console.log(`   ⏭️  Import already exists\n`);
        }
      }
    }
  }
}

console.log("✨ Post-processing complete!\n");
