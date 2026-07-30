class Task {
  id;
  name;
  status;
  output;
  tools;
  constructor(id, name, status, tools) {
    this.id = id;
    this.name = name;
    this.status = status;
    this.output = "Task yet to complete.";
    this.tools = tools;
  }
  set setId(id) {
    this.id = id;
  }
  get getId() {
    return this.id;
  }
  set setName(taskDescription) {
    this.name = taskDescription;
  }
  get getName() {
    return this.name;
  }
  set setStatus(status) {
    this.status = status;
  }
  get getStatus() {
    return this.status;
  }
  set setOutput(output) {
    this.output = output;
  }
  get getOutput() {
    return this.output;
  }
  set setTools(tools) {
    this.tools = tools;
  }
  get getTools() {
    return this.tools;
  }
}

let taskItems = [];

function appendTaskItem(id, description, status, tools) {
  let taskObj = new Task(id, description, status, tools);
  taskItems.push(taskObj);
}

function deleteTaskItem(id) {
  taskItems = taskItems.filter((task) => task.id != id);
}
function updateTaskItem(id, status, output) {
  for (let i = 0; i < taskItems.length; i++) {
    if (taskItems[i].getId === id) {
      taskItems[i].setStatus = status;
      taskItems[i].setOutput = output;
    }
  }
}
function readTaskById(id) {
  for (let task of taskItems) {
    if (task.getId === id) {
      return task;
    }
  }
}

function getTasks() {
  return taskItems;
}

function clearTasks() {
  taskItems = [];
}
export {
  appendTaskItem,
  updateTaskItem,
  deleteTaskItem,
  readTaskById,
  getTasks,
  clearTasks,
};
