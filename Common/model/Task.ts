/**
 * Represents a Task with an id, status, creation datetime, input, and optional response
 */
export class Task {
  /**
   * Status indicating the task is ready
   */
  public static readonly STATUS_READY = "READY";

  /**
   * Status indicating the task is completed
   */
  public static readonly STATUS_COMPLETED = "COMPLETED";

  /**
   * Status indicating the task did not reach consensus
   */
  public static readonly STATUS_CONSENSUS_NOT_REACHED = "CONSENSUS_NOT_REACHED";

  /**
   * Unique identifier for the task
   */
  id: number;

  /**
   * Current status of the task
   */
  status: string;

  /**
   * Creation datetime in milliseconds
   */
  createdAt: number;

  /**
   * Input data for the task
   */
  input: string;

  /**
   * Optional response data for the task
   */
  response: string | undefined;

  /**
   * Builds a Task instance from a serialized object
   *
   * @param serialized The serialized object containing task data
   * @returns A new Task instance
   */
  static buildFromAPI(serialized: any): Task {
    const task = new Task();

    task.id = serialized.id;
    task.createdAt = serialized.createdAt;
    task.input = serialized.input;

    return task;
  }
}
