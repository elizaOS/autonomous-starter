// Simple manual test for CharacterModificationService
const {
  CharacterModificationService,
} = require("../services/character-modification-service");

console.log("Testing Character Modification Service...\n");

// Mock runtime
const mockRuntime = {
  agentId: "test-agent-123",
  character: {
    name: "TestAgent",
    bio: ["Original bio"],
    lore: ["Original lore"],
    system: "Original system prompt",
    adjectives: ["helpful", "friendly"],
    topics: ["general", "tech"],
    style: {
      all: ["Be helpful"],
      chat: ["Be conversational"],
      post: ["Be informative"],
    },
    messageExamples: [],
    postExamples: [],
  },
  emitEvent: async () => {},
  updateAgent: async () => true,
  getCache: async () => null,
  setCache: async () => {},
};

async function runTests() {
  const service = new CharacterModificationService();
  service.runtime = mockRuntime;

  // Test 1: Initialize
  try {
    await service.initialize();
    console.log("✅ Service initialization passed");
  } catch (error) {
    console.error("❌ Service initialization failed:", error.message);
  }

  // Test 2: Apply valid diff
  try {
    const validDiffXml = `
<character-modification>
  <operations>
    <add path="bio[]" type="string">New bio entry</add>
    <modify path="system" type="string">Updated system prompt</modify>
  </operations>
  <reasoning>Test modification</reasoning>
  <timestamp>2024-01-01T00:00:00Z</timestamp>
</character-modification>`;

    const result = await service.applyCharacterDiff(validDiffXml);
    const passed =
      result.success &&
      result.appliedChanges === 2 &&
      mockRuntime.character.bio.includes("New bio entry") &&
      mockRuntime.character.system === "Updated system prompt";

    console.log("✅ Apply valid diff passed:", passed);
  } catch (error) {
    console.error("❌ Apply valid diff failed:", error.message);
  }

  // Test 3: Rate limiting
  try {
    const simpleDiff = `
<character-modification>
  <operations>
    <add path="topics[]" type="string">new topic</add>
  </operations>
  <reasoning>Rate limit test</reasoning>
</character-modification>`;

    // Apply 5 modifications (hitting rate limit)
    for (let i = 0; i < 5; i++) {
      await service.applyCharacterDiff(simpleDiff);
    }

    // 6th should fail
    const result = await service.applyCharacterDiff(simpleDiff);
    const passed =
      !result.success &&
      result.errors?.includes("Modification rate limit exceeded");

    console.log("✅ Rate limiting passed:", passed);
  } catch (error) {
    console.error("❌ Rate limiting test failed:", error.message);
  }

  // Test 4: Lock/unlock mechanism
  try {
    service.lockModifications();

    const testDiff = `
<character-modification>
  <operations>
    <add path="topics[]" type="string">locked test</add>
  </operations>
  <reasoning>Lock test</reasoning>
</character-modification>`;

    const lockedResult = await service.applyCharacterDiff(testDiff);
    const lockedPassed =
      !lockedResult.success &&
      lockedResult.errors?.includes(
        "Character modifications are currently locked",
      );

    service.unlockModifications();
    const unlockedResult = await service.applyCharacterDiff(testDiff);
    const unlockedPassed = unlockedResult.success;

    console.log(
      "✅ Lock/unlock mechanism passed:",
      lockedPassed && unlockedPassed,
    );
  } catch (error) {
    console.error("❌ Lock/unlock test failed:", error.message);
  }

  // Test 5: Version management
  try {
    const initialVersion = service.getCurrentVersion();
    const history = service.getCharacterHistory();
    const snapshots = service.getCharacterSnapshots();

    const passed =
      typeof initialVersion === "number" &&
      Array.isArray(history) &&
      Array.isArray(snapshots) &&
      snapshots.length > 0;

    console.log("✅ Version management passed:", passed);
  } catch (error) {
    console.error("❌ Version management test failed:", error.message);
  }

  console.log("\nService tests completed!");
}

runTests().catch(console.error);
