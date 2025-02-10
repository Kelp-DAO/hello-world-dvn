/**
 * Represents a response to a task
 */
export class TaskResponse {
  /**
   * The unique identifier of the task response
   */
  id: number;

  /**
   * The unique identifier of the task
   */
  taskId: number;

  /**
   * The unique identifier of the operator who created the response
   */
  operatorId: number;

  /**
   * The timestamp when the response was created (in milliseconds)
   */
  createdAt: number;

  /**
   * The content of the response
   */
  response: string;

  /**
   * Creates an instance of TaskResponse from a serialized database object
   *
   * @param serialized The serialized database object
   * @returns A new instance of TaskResponse
   */
  static buildFromDatabase(serialized: any): TaskResponse {
    const task = new TaskResponse();

    task.id = serialized.id;
    task.taskId = serialized.taskId;
    task.operatorId = serialized.operatorId;
    task.response = serialized.response;
    task.response = serialized.response;
    task.createdAt = serialized.createdAt;

    return task;
  }
}
