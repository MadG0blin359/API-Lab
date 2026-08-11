import AppError from "../utils/app.error.js";

export const validateTaskID = (req, res, next, val) => {
  const id = Number(val);

  if (isNaN(id)) {
    return next(
      new AppError(400, `Invalid ID format: '${val}'. Task ID must be a number.`),
    );
  }

  req.taskId = id;

  next();
};
