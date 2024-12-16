
export class Task {
    public static readonly STATUS_READY = "READY";
    public static readonly STATUS_COMPLETED = "COMPLETED";
    public static readonly STATUS_CONSENSUS_NOT_REACHED = "CONSENSUS_NOT_REACHED";

    id: number;
    status: string;

    /**
     * creation datetime in milliseconds
     */
    createdAt: number
    input: string;
    response: string | undefined;

    /**
     * 
     * @param serialized 
     * @returns 
     */
    static buildFromAPI(serialized: any) : Task {
        const task = new Task();

        task.id = serialized.id;
        task.createdAt = serialized.createdAt;
        task.input = serialized.input;

        return task;
    }
}
