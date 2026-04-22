export function extractJsonFromResponse(response: string): any {
  // First try to parse the entire response
  try {
    return JSON.parse(response);
  } catch (e) {
    // Clean the response by removing markdown code blocks if present
    let cleanResponse = response.trim();

    // Remove markdown code block markers if present
    if (cleanResponse.startsWith("```json")) {
      cleanResponse = cleanResponse.substring(7);
    }
    if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse.substring(3);
    }
    if (cleanResponse.endsWith("```")) {
      cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
    }

    cleanResponse = cleanResponse.trim();

    // Look for JSON in the response by finding the first opening brace
    const jsonStart = cleanResponse.indexOf("{");
    const arrayStart = cleanResponse.indexOf("[");
    
    // Determine if it's an array or object
    const isArray = arrayStart !== -1 && (jsonStart === -1 || arrayStart < jsonStart);
    const startChar = isArray ? "[" : "{";
    const endChar = isArray ? "]" : "}";
    const startIdx = isArray ? arrayStart : jsonStart;

    if (startIdx !== -1) {
      // Extract everything from the first opening brace/bracket to the last closing brace/bracket
      const jsonEnd = cleanResponse.lastIndexOf(endChar) + 1;
      if (jsonEnd > startIdx) {
        let jsonString = cleanResponse.substring(startIdx, jsonEnd);

        // Try to parse the extracted JSON
        try {
          return JSON.parse(jsonString);
        } catch (e2) {
          // If parsing fails, try to fix common issues
          const openBraces = (jsonString.match(/\{/g) || []).length;
          const closeBraces = (jsonString.match(/\}/g) || []).length;
          const openBrackets = (jsonString.match(/\[/g) || []).length;
          const closeBrackets = (jsonString.match(/\]/g) || []).length;

          // Add missing closing brackets first
          let missingBrackets = openBrackets - closeBrackets;
          while (missingBrackets > 0) {
            jsonString += "]";
            missingBrackets--;
          }

          // Then add missing closing braces
          let missingBraces = openBraces - closeBraces;
          while (missingBraces > 0) {
            jsonString += "}";
            missingBraces--;
          }

          try {
            return JSON.parse(jsonString);
          } catch (e3) {
            // Try a more aggressive approach
            let patched = jsonString;
            let openSq: number[] = [];
            let openCurl: number[] = [];
            for (let i = 0; i < patched.length; i++) {
              if (patched[i] === '[') openSq.push(i);
              else if (patched[i] === ']') openSq.pop();
              if (patched[i] === '{') openCurl.push(i);
              else if (patched[i] === '}') openCurl.pop();
            }
            while (openSq.length) {
              const startIdx = openSq.pop();
              let closeIdx = startIdx !== undefined ? (startIdx as number) + 1 : 1;
              while (closeIdx < patched.length && (patched[closeIdx] === ' ' || patched[closeIdx] === '\n' || patched[closeIdx] === '\t')) closeIdx++;
              patched = patched.slice(0, closeIdx) + ']' + patched.slice(closeIdx);
            }
            while (openCurl.length) {
              const startIdx = openCurl.pop();
              let closeIdx = startIdx !== undefined ? startIdx + 1 : 1;
              while (closeIdx < patched.length && (patched[closeIdx] === ' ' || patched[closeIdx] === '\n' || patched[closeIdx] === '\t')) closeIdx++;
              patched = patched.slice(0, closeIdx) + '}' + patched.slice(closeIdx);
            }
            try {
              return JSON.parse(patched);
            } catch (finalPatchErr) { }
            
            throw e;
          }
        }
      }
    }
    throw e;
  }
}
