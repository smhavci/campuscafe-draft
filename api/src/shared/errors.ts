/**
 * Typed application errors. Throw these from services/controllers; the central
 * error handler turns them into consistent JSON responses.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Geçersiz istek', details?: unknown) {
    super(400, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Giriş yapmanız gerekiyor') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bu işlem için yetkiniz yok') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Kayıt bulunamadı') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Çakışma', details?: unknown) {
    super(409, message, details);
  }
}
