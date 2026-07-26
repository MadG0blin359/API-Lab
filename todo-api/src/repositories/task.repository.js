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

class TaskRepository {
  findAll() {
    return tasks;
  }

  findById(id) {
    return tasks.findIndex((t) => t.id === id);
  }

  create(newTask) {
    tasks.push(newTask);
    return newTask;
  }

  update(idx, updateData) {
    tasks[idx] = {
      ...tasks[idx],
      ...(updateData.title !== undefined && { title: updateData.title }),
      ...(updateData.done !== undefined && { done: updateData.done }),
    };

    // Return the freshly updated object
    return tasks[idx];
  }

  delete(index) {
    tasks.splice(index, 1);
  }
}

export default new TaskRepository();
