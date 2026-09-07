export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function invariant(
  condition: unknown,
  code: string,
  status: number,
  message: string,
): asserts condition {
  if (!condition) throw new AppError(code, status, message);
}
