import { describe, it, expect } from "vitest";
import { parseCharacterDiff, buildCharacterDiffXml } from "../utils/xml-parser";
import { type CharacterDiff } from "../types";

describe("XML Parser", () => {
  describe("parseCharacterDiff", () => {
    it("should parse valid XML with all operation types", () => {
      const xml = `
<character-modification>
  <operations>
    <add path="bio[]" type="string">New bio entry</add>
    <modify path="system" type="string">Updated system prompt</modify>
    <delete path="topics[0]" />
  </operations>
  <reasoning>Test modification</reasoning>
  <timestamp>2024-01-01T00:00:00Z</timestamp>
</character-modification>`;

      const diff = parseCharacterDiff(xml);

      expect(diff.operations).toHaveLength(3);
      expect(diff.operations[0]).toEqual({
        type: "add",
        path: "bio[]",
        value: "New bio entry",
        dataType: "string",
      });
      expect(diff.operations[1]).toEqual({
        type: "modify",
        path: "system",
        value: "Updated system prompt",
        dataType: "string",
      });
      expect(diff.operations[2]).toEqual({
        type: "delete",
        path: "topics[0]",
        value: undefined,
        dataType: undefined,
      });
      expect(diff.reasoning).toBe("Test modification");
      expect(diff.timestamp).toBe("2024-01-01T00:00:00Z");
    });

    it("should handle multiple operations of the same type", () => {
      const xml = `
<character-modification>
  <operations>
    <add path="bio[]" type="string">First bio</add>
    <add path="bio[]" type="string">Second bio</add>
    <add path="topics[]" type="string">New topic</add>
  </operations>
  <reasoning>Multiple additions</reasoning>
</character-modification>`;

      const diff = parseCharacterDiff(xml);

      expect(diff.operations).toHaveLength(3);
      expect(diff.operations.filter((op) => op.type === "add")).toHaveLength(3);
    });

    it("should throw error for missing root element", () => {
      const xml = "<invalid>Not a character modification</invalid>";

      expect(() => parseCharacterDiff(xml)).toThrow(
        "Invalid XML: missing character-modification root element",
      );
    });

    it("should throw error for missing reasoning", () => {
      const xml = `
<character-modification>
  <operations>
    <add path="bio[]" type="string">New bio</add>
  </operations>
</character-modification>`;

      expect(() => parseCharacterDiff(xml)).toThrow(
        "Missing or empty reasoning",
      );
    });

    it("should throw error for empty reasoning", () => {
      const xml = `
<character-modification>
  <operations>
    <add path="bio[]" type="string">New bio</add>
  </operations>
  <reasoning>   </reasoning>
</character-modification>`;

      expect(() => parseCharacterDiff(xml)).toThrow(
        "Missing or empty reasoning",
      );
    });

    it("should throw error for invalid operation type", () => {
      const xml = `
<character-modification>
  <operations>
    <invalidOp path="bio[]">Test</invalidOp>
  </operations>
  <reasoning>Test</reasoning>
</character-modification>`;

      expect(() => parseCharacterDiff(xml)).toThrow(
        "Invalid operation type: invalidOp",
      );
    });

    it("should throw error for missing path attribute", () => {
      const xml = `
<character-modification>
  <operations>
    <add type="string">No path</add>
  </operations>
  <reasoning>Test</reasoning>
</character-modification>`;

      expect(() => parseCharacterDiff(xml)).toThrow(
        "Invalid path in add operation",
      );
    });

    describe("Security Tests", () => {
      it("should prevent XXE attacks by removing DOCTYPE", () => {
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

        const diff = parseCharacterDiff(xxeXml);

        // Should parse without expanding entity
        expect(diff.operations[0].value).toBe("&xxe;");
        expect(diff.operations[0].value).not.toContain("root:");
      });

      it("should remove ENTITY declarations", () => {
        const entityXml = `
<!ENTITY test "malicious content">
<character-modification>
  <operations>
    <add path="bio[]" type="string">&test;</add>
  </operations>
  <reasoning>Entity test</reasoning>
</character-modification>`;

        const diff = parseCharacterDiff(entityXml);

        expect(diff.operations[0].value).toBe("&test;");
      });

      it("should remove processing instructions", () => {
        const piXml = `
<?php echo file_get_contents('/etc/passwd'); ?>
<character-modification>
  <operations>
    <add path="bio[]" type="string">Test</add>
  </operations>
  <reasoning>PI test</reasoning>
</character-modification>`;

        const diff = parseCharacterDiff(piXml);

        expect(diff.operations[0].value).toBe("Test");
      });

      it("should escape CDATA content", () => {
        const cdataXml = `
<character-modification>
  <operations>
    <add path="bio[]" type="string"><![CDATA[<script>alert('xss')</script>]]></add>
  </operations>
  <reasoning>CDATA test</reasoning>
</character-modification>`;

        const diff = parseCharacterDiff(cdataXml);

        expect(diff.operations[0].value).toContain("&lt;script&gt;");
        expect(diff.operations[0].value).not.toContain("<script>");
      });

      it("should reject dangerous path patterns", () => {
        const dangerousPath1 = `
<character-modification>
  <operations>
    <add path="../../../etc/passwd" type="string">Traversal</add>
  </operations>
  <reasoning>Path traversal</reasoning>
</character-modification>`;

        expect(() => parseCharacterDiff(dangerousPath1)).toThrow(
          "Dangerous path pattern detected",
        );

        const dangerousPath2 = `
<character-modification>
  <operations>
    <add path="bio//../../admin" type="string">Double slash</add>
  </operations>
  <reasoning>Double slash</reasoning>
</character-modification>`;

        expect(() => parseCharacterDiff(dangerousPath2)).toThrow(
          "Dangerous path pattern detected",
        );
      });
    });

    it("should handle empty operations gracefully", () => {
      const xml = `
<character-modification>
  <operations>
  </operations>
  <reasoning>No operations</reasoning>
</character-modification>`;

      const diff = parseCharacterDiff(xml);

      expect(diff.operations).toEqual([]);
    });

    it("should use current timestamp if not provided", () => {
      const xml = `
<character-modification>
  <operations>
    <add path="bio[]" type="string">Test</add>
  </operations>
  <reasoning>Test</reasoning>
</character-modification>`;

      const beforeParse = new Date();
      const diff = parseCharacterDiff(xml);
      const afterParse = new Date();

      const timestamp = new Date(diff.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeParse.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterParse.getTime());
    });
  });

  describe("buildCharacterDiffXml", () => {
    it("should build valid XML from diff object", () => {
      const diff: CharacterDiff = {
        operations: [
          { type: "add", path: "bio[]", value: "New bio", dataType: "string" },
          {
            type: "modify",
            path: "system",
            value: "Updated",
            dataType: "string",
          },
          { type: "delete", path: "topics[0]" },
        ],
        reasoning: "Test build",
        timestamp: "2024-01-01T00:00:00Z",
      };

      const xml = buildCharacterDiffXml(diff);

      expect(xml).toContain("<character-modification>");
      expect(xml).toContain('<add path="bio[]" type="string">New bio</add>');
      expect(xml).toContain(
        '<modify path="system" type="string">Updated</modify>',
      );
      expect(xml).toContain('<delete path="topics[0]"/>');
      expect(xml).toContain("<reasoning>Test build</reasoning>");
      expect(xml).toContain("<timestamp>2024-01-01T00:00:00Z</timestamp>");
    });

    it("should omit empty operation categories", () => {
      const diff: CharacterDiff = {
        operations: [{ type: "add", path: "bio[]", value: "New bio" }],
        reasoning: "Only additions",
        timestamp: "2024-01-01T00:00:00Z",
      };

      const xml = buildCharacterDiffXml(diff);

      expect(xml).toContain("<add");
      expect(xml).not.toContain("<modify");
      expect(xml).not.toContain("<delete");
    });

    it("should validate reasoning is not empty", () => {
      const diff: CharacterDiff = {
        operations: [],
        reasoning: "",
        timestamp: "2024-01-01T00:00:00Z",
      };

      expect(() => buildCharacterDiffXml(diff)).toThrow(
        "Reasoning is required",
      );
    });

    it("should validate operations is an array", () => {
      const diff = {
        operations: "not an array",
        reasoning: "Test",
        timestamp: "2024-01-01T00:00:00Z",
      } as any;

      expect(() => buildCharacterDiffXml(diff)).toThrow(
        "Operations must be an array",
      );
    });

    it("should default dataType to string if not specified", () => {
      const diff: CharacterDiff = {
        operations: [{ type: "add", path: "bio[]", value: "No type" }],
        reasoning: "Default type test",
        timestamp: "2024-01-01T00:00:00Z",
      };

      const xml = buildCharacterDiffXml(diff);

      expect(xml).toContain('type="string"');
    });

    it("should handle build errors gracefully", () => {
      // Create a diff that might cause builder to fail
      const diff: CharacterDiff = {
        operations: [
          { type: "add" as any, path: null as any, value: "Invalid" },
        ],
        reasoning: "Invalid operation",
        timestamp: "2024-01-01T00:00:00Z",
      };

      expect(() => buildCharacterDiffXml(diff)).toThrow(
        "Invalid path in operation",
      );
    });
  });

  describe("Round-trip conversion", () => {
    it("should maintain data integrity through parse and build", () => {
      const originalDiff: CharacterDiff = {
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

      expect(parsedDiff.operations).toHaveLength(3);
      expect(parsedDiff.reasoning).toBe(originalDiff.reasoning);
      expect(parsedDiff.timestamp).toBe(originalDiff.timestamp);

      // Check each operation
      parsedDiff.operations.forEach((op, i) => {
        expect(op.type).toBe(originalDiff.operations[i].type);
        expect(op.path).toBe(originalDiff.operations[i].path);
        expect(op.value).toBe(originalDiff.operations[i].value);
        expect(op.dataType).toBe(originalDiff.operations[i].dataType);
      });
    });
  });
});
