class AppError extends Error {
  constructor(statusCode, message) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    this.isOperational = true;

    // Captures the stack trace, excluding the constructor call itself
    Error.capureStackTrace(this, this.constructor);
  }
}

export default AppError;
