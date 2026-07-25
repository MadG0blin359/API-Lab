class AppError extends Error {
  constructor(statusCode, status, message) {
    super(message);

    this.statusCode = statusCode;
    this.status = status;

    this.isOperational = true;

    // Captures the stack trace, excluding the constructor call itself
    Error.capureStackTrace(this, this.constructor);
  }
}

export default AppError;
