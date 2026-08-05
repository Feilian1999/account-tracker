export const parseAmountExpression = (
  expression: string,
  percentageBase?: number,
): number | null => {
  const input = expression.replace(/,/g, "").trim();
  const normalized = input.endsWith("%")
    ? `${percentageBase}*${input.slice(0, -1)}/100`
    : input;
  if (!normalized || !/^[\d+\-*/. ()]+$/.test(normalized)) return null;

  try {
    const result = new Function(`return (${normalized})`)();
    return typeof result === "number" && Number.isFinite(result)
      ? result
      : null;
  } catch {
    return null;
  }
};
