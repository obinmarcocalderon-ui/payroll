const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function threeDigitsToWords(n: number): string {
  let result = '';
  if (n >= 100) {
    result += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    result += `${TENS[Math.floor(n / 10)]} `;
    n %= 10;
  }
  if (n > 0) {
    result += `${ONES[n]} `;
  }
  return result.trim();
}

export function amountToWords(amount: number): string {
  const pesos = Math.floor(amount);
  const centavos = Math.round((amount - pesos) * 100);

  if (pesos === 0) return `Zero and ${String(centavos).padStart(2, '0')}/100 Pesos`;

  const groups: string[] = [];
  let remaining = pesos;
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  let scaleIndex = 0;

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const words = threeDigitsToWords(chunk);
      groups.unshift(scales[scaleIndex] ? `${words} ${scales[scaleIndex]}` : words);
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex += 1;
  }

  const pesosWords = groups.join(' ').trim();
  return `${pesosWords} and ${String(centavos).padStart(2, '0')}/100 Pesos`;
}
