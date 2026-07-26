/**
 * Wraps an async Express route handler and forwards any thrown errors
 * to the next() error-handling middleware instead of crashing the server.
 *
 * Usage: router.get('/', asyncHandler(myController))
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
