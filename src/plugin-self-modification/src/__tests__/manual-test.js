// Simple manual test for XML parser
const {
  parseCharacterDiff,
  buildCharacterDiffXml,
} = require("../utils/xml-parser");

console.log("Testing XML Parser Security and Functionality...\n");

// Test 1: Basic functionality
try {
  const basicXml = `
<character-modification>
  <operations>
    <add path="bio[]" type="string">New bio entry</add>
    <modify path="system" type="string">Updated system prompt</modify>
    <delete path="topics[0]" />
  </operations>
  <reasoning>Test modification</reasoning>
  <timestamp>2024-01-01T00:00:00Z</timestamp>
</character-modification>`;

  const result = parseCharacterDiff(basicXml);
  console.log("✅ Basic parsing passed:", result.operations.length === 3);
} catch (error) {
  console.error("❌ Basic parsing failed:", error.message);
}

// Test 2: XXE Attack Prevention
try {
  const xxeXml = `
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<character-modification>
  <operations>
    <add path="bio[]" type="string">&xxe;</add>
  </operations>
  <reasoning>XXE attempt</reasoning>
</character-modification>`;

  const result = parseCharacterDiff(xxeXml);
  const passed =
    result.operations[0].value === "&xxe;" &&
    !result.operations[0].value.includes("root:");
  console.log("✅ XXE prevention passed:", passed);
} catch (error) {
  console.error("❌ XXE prevention test failed:", error.message);
}

// Test 3: Path Traversal Prevention
try {
  const traversalXml = `
<character-modification>
  <operations>
    <add path="../../../etc/passwd" type="string">Traversal</add>
  </operations>
  <reasoning>Path traversal</reasoning>
</character-modification>`;

  parseCharacterDiff(traversalXml);
  console.log("❌ Path traversal prevention failed: Should have thrown error");
} catch (error) {
  console.log(
    "✅ Path traversal prevention passed:",
    error.message.includes("Dangerous path pattern"),
  );
}

// Test 4: Round-trip conversion
try {
  const originalDiff = {
    operations: [
      { type: "add", path: "bio[]", value: "Test bio", dataType: "string" },
      {
        type: "modify",
        path: "adjectives[0]",
        value: "creative",
        dataType: "string",
      },
      { type: "delete", path: "topics[5]" },
    ],
    reasoning: "Round trip test",
    timestamp: "2024-01-01T12:00:00Z",
  };

  const xml = buildCharacterDiffXml(originalDiff);
  const parsedDiff = parseCharacterDiff(xml);

  const passed =
    parsedDiff.operations.length === 3 &&
    parsedDiff.reasoning === originalDiff.reasoning &&
    parsedDiff.timestamp === originalDiff.timestamp;

  console.log("✅ Round-trip conversion passed:", passed);
} catch (error) {
  console.error("❌ Round-trip conversion failed:", error.message);
}

// Test 5: Empty reasoning validation
try {
  const emptyReasoningDiff = {
    operations: [],
    reasoning: "",
    timestamp: "2024-01-01T00:00:00Z",
  };

  buildCharacterDiffXml(emptyReasoningDiff);
  console.log("❌ Empty reasoning validation failed: Should have thrown error");
} catch (error) {
  console.log(
    "✅ Empty reasoning validation passed:",
    error.message.includes("Reasoning is required"),
  );
}

console.log("\nManual tests completed!");
