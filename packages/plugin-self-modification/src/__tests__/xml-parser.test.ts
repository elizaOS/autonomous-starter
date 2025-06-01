import { describe, it, expect } from 'vitest';
import { parseCharacterDiff, buildCharacterDiffXml } from '../utils/xml-parser';
import { type CharacterDiff } from '../types';

describe('XML Parser', () => {
  describe('parseCharacterDiff', () => {
    it('should parse a valid character modification XML', () => {
      const xml = `
<character-modification>
  <operations>
    <add path="bio[]" type="string">New biographical info</add>
    <modify path="system" type="string">Updated system prompt</modify>
    <delete path="topics[0]" />
  </operations>
  <reasoning>Test reasoning</reasoning>
  <timestamp>2024-01-01T00:00:00Z</timestamp>
</character-modification>`;
      
      const result = parseCharacterDiff(xml);
      
      expect(result.operations).toHaveLength(3);
      expect(result.operations[0]).toEqual({
        type: 'add',
        path: 'bio[]',
        value: 'New biographical info',
        dataType: 'string'
      });
      expect(result.operations[1]).toEqual({
        type: 'modify',
        path: 'system',
        value: 'Updated system prompt',
        dataType: 'string'
      });
      expect(result.operations[2]).toEqual({
        type: 'delete',
        path: 'topics[0]',
        value: undefined,
        dataType: undefined
      });
      expect(result.reasoning).toBe('Test reasoning');
      expect(result.timestamp).toBe('2024-01-01T00:00:00Z');
    });
    
    it('should handle multiple operations of the same type', () => {
      const xml = `
<character-modification>
  <operations>
    <add path="topics[]" type="string">Topic 1</add>
    <add path="topics[]" type="string">Topic 2</add>
    <add path="adjectives[]" type="string">curious</add>
  </operations>
  <reasoning>Adding multiple items</reasoning>
</character-modification>`;
      
      const result = parseCharacterDiff(xml);
      
      expect(result.operations).toHaveLength(3);
      expect(result.operations.filter(op => op.type === 'add')).toHaveLength(3);
    });
    
    it('should throw error for invalid XML', () => {
      const invalidXml = '<invalid>Not a character modification</invalid>';
      
      expect(() => parseCharacterDiff(invalidXml)).toThrow(
        'Invalid XML: missing character-modification root element'
      );
    });
    
    it('should handle empty operations', () => {
      const xml = `
<character-modification>
  <operations></operations>
  <reasoning>No operations</reasoning>
</character-modification>`;
      
      const result = parseCharacterDiff(xml);
      
      expect(result.operations).toHaveLength(0);
      expect(result.reasoning).toBe('No operations');
    });
  });
  
  describe('buildCharacterDiffXml', () => {
    it('should build valid XML from CharacterDiff', () => {
      const diff: CharacterDiff = {
        operations: [
          {
            type: 'add',
            path: 'bio[]',
            value: 'New bio entry',
            dataType: 'string'
          },
          {
            type: 'modify',
            path: 'system',
            value: 'Updated prompt',
            dataType: 'string'
          },
          {
            type: 'delete',
            path: 'topics[1]'
          }
        ],
        reasoning: 'Test build',
        timestamp: '2024-01-01T00:00:00Z'
      };
      
      const xml = buildCharacterDiffXml(diff);
      
      expect(xml).toContain('<character-modification>');
      expect(xml).toContain('</character-modification>');
      expect(xml).toContain('<add path="bio[]" type="string">New bio entry</add>');
      expect(xml).toContain('<modify path="system" type="string">Updated prompt</modify>');
      expect(xml).toContain('<delete path="topics[1]"/>');
      expect(xml).toContain('<reasoning>Test build</reasoning>');
      expect(xml).toContain('<timestamp>2024-01-01T00:00:00Z</timestamp>');
    });
    
    it('should handle diff with only one operation type', () => {
      const diff: CharacterDiff = {
        operations: [
          {
            type: 'add',
            path: 'topics[]',
            value: 'New topic'
          }
        ],
        reasoning: 'Single operation',
        timestamp: '2024-01-01T00:00:00Z'
      };
      
      const xml = buildCharacterDiffXml(diff);
      
      expect(xml).not.toContain('<modify');
      expect(xml).not.toContain('<delete');
      expect(xml).toContain('<add');
    });
    
    it('should round-trip correctly', () => {
      const originalDiff: CharacterDiff = {
        operations: [
          {
            type: 'add',
            path: 'bio[]',
            value: 'Test bio',
            dataType: 'string'
          },
          {
            type: 'modify',
            path: 'style/chat[0]',
            value: 'New chat style',
            dataType: 'string'
          }
        ],
        reasoning: 'Round trip test',
        timestamp: '2024-01-01T12:00:00Z'
      };
      
      const xml = buildCharacterDiffXml(originalDiff);
      const parsedDiff = parseCharacterDiff(xml);
      
      expect(parsedDiff).toEqual(originalDiff);
    });
  });
});