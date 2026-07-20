const tasks = [
  {
    id: 1,
    title: "First Assignment",
    done: true,
  },
  {
    id: 2,
    title: "Second Assignment",
    done: true,
  },
  {
    id: 3,
    title: "Third Assignment",
    done: false,
  },
];

export const getAllTasks = (req, res) => {
  if (!tasks)
    return res.status(404).json({
      status: "fail",
      message: "No tasks found!",
    });

  return res.status(200).json({
    status: "success",
    totalCount: tasks.length,
    tasks,
  });
};

export const getOneTask = (req, res) => {
  const id = Number(req.params.id);

  const index = tasks.findIndex((task) => task.id === id);

  if (index === -1)
    return res.status(404).json({
      status: "fail",
      message: `No task was found with ID ${id}.`,
    });

  return res.status(200).json({
    status: "success",
    task: tasks[index],
  });
};
