/**
 * Token-Oriented Object Notation (TOON) Encoder
 * 
 * TOON is a compact data serialization format specifically designed to optimize 
 * Large Language Model (LLM) prompts by reducing token consumption. It strips away 
 * redundant punctuation (braces, quotes, colons) and structures arrays as tabular data.
 */
export class ToonEncoder {
  /**
   * Encodes a JSON object or array into TOON format.
   * 
   * @param obj The object to encode
   * @param indent Current indentation level (used recursively)
   * @param keyName Optional key name for nested objects/arrays
   * @returns A TOON formatted string
   */
  static encode(obj: any, indent = 0, keyName = ''): string {
    if (obj === null || obj === undefined || obj === '') return '-';
    const indentStr = '  '.repeat(indent);

    if (Array.isArray(obj)) {
      if (obj.length === 0) return keyName ? `${indentStr}${keyName} -` : '-';
      
      // Check if it's an array of objects (suitable for tabular format)
      const isUniformObjects = obj.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));
      
      if (isUniformObjects) {
        const keys = new Set<string>();
        obj.forEach(item => Object.keys(item).forEach(k => keys.add(k)));
        const headers = Array.from(keys);
        
        let toonStr = `${indentStr}${keyName ? keyName + ' ' : 'array '}${obj.length}\n`;
        toonStr += `${indentStr}  ${headers.join(' | ')}\n`;
        
        obj.forEach(item => {
          const row = headers.map(h => {
            let val = item[h];
            if (val === null || val === undefined || val === '') return '-';
            if (typeof val === 'string') {
              // Replace newlines with spaces and pipes with slashes to avoid breaking table format
              return val.replace(/\n/g, ' ').replace(/\|/g, '/');
            }
            if (typeof val === 'object') return JSON.stringify(val).replace(/\|/g, '/');
            return String(val);
          });
          toonStr += `${indentStr}  ${row.join(' | ')}\n`;
        });
        return toonStr.trimEnd();
      } else {
        // Simple array (list of primitives)
        let toonStr = keyName ? `${indentStr}${keyName}\n` : '';
        toonStr += obj.map(item => `${indentStr}  - ${this.encode(item, 0)}`).join('\n');
        return toonStr;
      }
    } else if (typeof obj === 'object') {
      let toonStr = keyName ? `${indentStr}${keyName}\n` : '';
      const childIndentStr = keyName ? indentStr + '  ' : indentStr;
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          toonStr += `${this.encode(value, keyName ? indent + 1 : indent, key)}\n`;
        } else {
          let valStr = String(value);
          if (valStr.includes('\n')) valStr = valStr.replace(/\n/g, '\\n');
          toonStr += `${childIndentStr}${key} ${valStr}\n`;
        }
      }
      return toonStr.trimEnd();
    }
    
    return String(obj);
  }
}
