
export class TaskResponse {
    id: number;
    taskId: number;
    operatorId: number;

    /**
     * creation datetime in milliseconds
     */
    createdAt: number
    response: string;

    /**
     * 
     * @param serialized 
     * @returns 
     */
    static buildFromDatabase(serialized: any) : TaskResponse {
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
