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

export const createTask = (req, res) => {
  const { title } = req.body;

  if (!title)
    return res.status(400).json({
      status: "fail",
      message: "Please provide a title.",
    });

  const nextId =
    tasks.length > 0 ? Math.max(...tasks.map((task) => task.id)) + 1 : 1;

  const newTask = {
    id: nextId,
    title,
    done: false,
  };

  tasks.push(newTask);

  return res.status(201).json({ status: "success", task: newTask });
};
