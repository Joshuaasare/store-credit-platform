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
    // The negative lookahead (?![A-Za-z0-9_]) after each schemaName prevents
    // false positives where one type name is a prefix of another (e.g.
    // BaseCustomer matching inside BaseCustomerCredit).
    const wb = "(?![A-Za-z0-9_])";
    const usagePattern = new RegExp(
      `(Type\\.Array\\(${schemaName}${wb}\\)|Type\\.Optional\\(${schemaName}${wb}\\)|Type\\.Union\\(\\[\\s*${schemaName}${wb}|Type\\.Intersect\\(\\[\\s*${schemaName}${wb}|Type\\.Composite\\(\\[\\s*${schemaName}${wb}|:\\s*${schemaName}${wb}\\s*[,\\}\\)]|data:\\s*${schemaName}${wb}\\s*[,\\}]|Type\\.Index\\(${schemaName}${wb},|=\\s*${schemaName}${wb}\\s*($|;|\\n)|[,\\[]\\s*${schemaName}${wb}\\s*[,\\])])`,
      "g",
    );
    const definitionPattern = new RegExp(
      `export (type|const) ${schemaName}${wb} =`,
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
      // Add import after the first import line. Match either
      // `import { Type, Static } from '@sinclair/typebox'` or the
      // `import { Type, Static, TSchema } from '@sinclair/typebox'`
      // variant that generic schemas (e.g. MerchantAuditFeedPage<T extends TSchema>)
      // produce — without this broader pattern the script silently no-ops on
      // those files and leaves them with unresolved `./main.schema` imports.
      const importStatement = `import { ${usedSchemas.join(", ")} } from './main.schema'\n`;
      content = content.replace(
        /(import \{ Type, Static(?:, TSchema)? \} from '@sinclair\/typebox')/,
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
