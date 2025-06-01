import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { type CharacterDiff, type ModificationOperation } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  trimValues: true
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  '
});

export function parseCharacterDiff(xmlString: string): CharacterDiff {
  try {
    const parsed = parser.parse(xmlString);
    const root = parsed['character-modification'];
    
    if (!root) {
      throw new Error('Invalid XML: missing character-modification root element');
    }
    
    const operations: ModificationOperation[] = [];
    const opsRoot = root.operations;
    
    if (opsRoot) {
      // Handle single operation or array of operations
      const processOperation = (op: any, type: string) => {
        const items = Array.isArray(op) ? op : [op];
        items.forEach((item: any) => {
          operations.push({
            type: type as 'add' | 'modify' | 'delete',
            path: item['@_path'],
            value: item['#text'] || item,
            dataType: item['@_type']
          });
        });
      };
      
      if (opsRoot.add) processOperation(opsRoot.add, 'add');
      if (opsRoot.modify) processOperation(opsRoot.modify, 'modify');
      if (opsRoot.delete) processOperation(opsRoot.delete, 'delete');
    }
    
    return {
      operations,
      reasoning: root.reasoning || '',
      timestamp: root.timestamp || new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to parse character diff XML: ${error.message}`);
  }
}

export function buildCharacterDiffXml(diff: CharacterDiff): string {
  const xmlObj = {
    'character-modification': {
      operations: {
        add: diff.operations
          .filter(op => op.type === 'add')
          .map(op => ({
            '@_path': op.path,
            '@_type': op.dataType || 'string',
            '#text': op.value
          })),
        modify: diff.operations
          .filter(op => op.type === 'modify')
          .map(op => ({
            '@_path': op.path,
            '@_type': op.dataType || 'string',
            '#text': op.value
          })),
        delete: diff.operations
          .filter(op => op.type === 'delete')
          .map(op => ({
            '@_path': op.path
          }))
      },
      reasoning: diff.reasoning,
      timestamp: diff.timestamp
    }
  };
  
  // Remove empty operation arrays
  const ops = xmlObj['character-modification'].operations;
  if (ops.add.length === 0) delete ops.add;
  if (ops.modify.length === 0) delete ops.modify;
  if (ops.delete.length === 0) delete ops.delete;
  
  return builder.build(xmlObj);
}