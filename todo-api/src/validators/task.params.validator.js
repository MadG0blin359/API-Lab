import AppError from "../utils/app.error";

export const validateTaskID = (req, res, next, val) => {
  const id = Number(val);

  if (isNaN(id)) {
    throw new AppError(
      `Invalid ID format: '${val}'. Task ID must be a number.`,
      400,
    );
  }

  req.taskId = id;

  next();
};
