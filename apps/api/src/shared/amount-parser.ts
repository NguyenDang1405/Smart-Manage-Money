/**
 * Parses Vietnamese shorthand currency strings into numbers.
 * Examples:
 * "50k" -> 50000
 * "1.5tr" -> 1500000
 * "2tr5" -> 2500000
 * "1b" -> 1000000000
 */
export function parseVietnameseAmount(input: string | number): number {
  if (typeof input === "number") return input;

  const cleanInput = input.toLowerCase().replace(/,/g, ".").replace(/\s/g, "");
  
  // Handle "2tr5" or "1k5" format (number + suffix + number)
  const complexMatch = cleanInput.match(/^(\d+\.?\d*)(k|tr|m|b|t)(\d*)$/);
  
  if (complexMatch) {
    const [_, mainPart, suffix, decimalPart] = complexMatch;
    let multiplier = 1;
    
    switch (suffix) {
      case "k": multiplier = 1000; break;
      case "tr":
      case "m":
      case "t": multiplier = 1000000; break;
      case "b": multiplier = 1000000000; break;
    }

    const mainVal = parseFloat(mainPart);
    
    // If there's a decimal part after the suffix (e.g., 2tr5 -> 2.5tr)
    if (decimalPart) {
      const decimalVal = parseFloat(decimalPart);
      // Determine how many digits to shift (e.g., for 'tr', 5 means 500,000)
      const shift = Math.pow(10, Math.log10(multiplier) - decimalPart.length);
      return (mainVal * multiplier) + (decimalVal * shift);
    }

    return mainVal * multiplier;
  }

  const numericVal = parseFloat(cleanInput);
  return isNaN(numericVal) ? 0 : numericVal;
}
