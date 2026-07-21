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

function findIdx(id) {
  return tasks.findIndex((task) => task.id === id);
}

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

  // Validate that the ID is a valid number
  if (isNaN(id)) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid ID format provided.",
    });
  }

  const index = findIdx(id);

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

export const updateOne = (req, res) => {
  const id = Number(req.params.id);
  const { title, done } = req.body;

  if (title === undefined && done === undefined)
    return res.status(400).json({
      status: "fail",
      message: "Please provide a title or done status to update.",
    });

  // Validate that the ID is a valid number
  if (isNaN(id)) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid ID format provided.",
    });
  }

  const index = findIdx(id);

  if (index === -1)
    return res.status(404).json({
      status: "fail",
      message: `No task was found with ID ${id}.`,
    });

  tasks[index] = {
    ...tasks[index],
    ...(title !== undefined && { title }),
    ...(done !== undefined && { done }),
  };

  return res.status(200).json({
    status: "success",
    task: tasks[index],
  });
};

export const deleteOne = (req, res) => {
  const id = Number(req.params.id);

  // Validate that the ID is a valid number
  if (isNaN(id)) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid ID format provided.",
    });
  }

  const index = findIdx(id);

  if (index === -1)
    return res.status(404).json({
      status: "fail",
      message: `No task was found with ID ${id}.`,
    });

  tasks.splice(index, 1);

  return res.status(200).json({
    status: "success",
    messsage: `Task with ID ${id} was deleted.`,
  });
};
