/**
 * StudyFlow MCP server — registers all StudyFlow agent tools on an McpServer.
 * Used by both the Streamable HTTP and stdio transports.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DB, loadDB, saveDB } from "./db.js";
import {
  addTask, completeTask, createStudyPlan, getStudyContextHandler,
  getStudyHistory, listTasks, suggestNextStepHandler, updateTask,
} from "./tools.js";

const PriorityEnum = z.enum(["low", "medium", "high"]);
const TaskStatusEnum = z.enum(["pending", "in-progress", "completed"]);

function resultJson(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

export function createStudyFlowServer(): McpServer {
  const server = new McpServer(
    { name: "studyflow-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.registerTool(
    "createStudyPlan",
    {
      title: "Create study plan",
      description:
        "Create a StudyFlow study plan from a learning goal and auto-generate 6 sequenced tasks sized to the learner's level and daily minutes. Returns the created plan and its tasks.",
      inputSchema: {
        goal: z.string().min(3).describe("The learning goal, e.g. 'learn Spanish verbs'"),
        subject: z.string().optional().describe("Subject/topic; defaults to the goal"),
        currentLevel: z.enum(["beginner", "intermediate", "advanced"]).optional().describe("Learner's current level"),
        minutesPerDay: z.number().int().min(15).max(180).optional().describe("Study minutes per day (default 45)"),
        deadline: z.string().optional().describe("ISO date deadline, or empty"),
      },
    },
    async (args) => {
      const db: DB = loadDB();
      const result = createStudyPlan(db, args);
      saveDB(db);
      return { content: [{ type: "text" as const, text: resultJson(result) }] };
    }
  );

  server.registerTool(
    "addTask",
    {
      title: "Add task",
      description: "Add a task to StudyFlow (attached to the active plan when planId is omitted).",
      inputSchema: {
        title: z.string().min(3).describe("Task title"),
        description: z.string().optional().describe("Task description"),
        planId: z.string().optional().describe("Plan id; defaults to the active plan"),
        priority: PriorityEnum.optional().describe("Priority (default medium)"),
        dueDate: z.string().optional().describe("ISO date due date, or empty"),
        estimatedMinutes: z.number().int().min(5).optional().describe("Estimated minutes"),
      },
    },
    async (args) => {
      const db: DB = loadDB();
      const result = addTask(db, args);
      saveDB(db);
      return { content: [{ type: "text" as const, text: resultJson(result) }] };
    }
  );

  server.registerTool(
    "listTasks",
    {
      title: "List tasks",
      description: "List StudyFlow tasks, optionally filtered by status.",
      inputSchema: {
        status: TaskStatusEnum.optional().describe("Filter by task status"),
      },
    },
    async (args) => {
      const db: DB = loadDB();
      const result = listTasks(db, args);
      saveDB(db); // persists the audit-log entry
      return { content: [{ type: "text" as const, text: resultJson(result) }] };
    }
  );

  server.registerTool(
    "updateTask",
    {
      title: "Update task",
      description: "Update a StudyFlow task by id (title, description, status, priority, due date, estimate, plan).",
      inputSchema: {
        id: z.string().describe("Task id"),
        title: z.string().optional(),
        description: z.string().optional(),
        status: TaskStatusEnum.optional(),
        priority: PriorityEnum.optional(),
        dueDate: z.string().optional(),
        estimatedMinutes: z.number().int().min(5).optional(),
        planId: z.string().nullable().optional(),
      },
    },
    async (args) => {
      const db: DB = loadDB();
      const result = updateTask(db, args);
      saveDB(db);
      return { content: [{ type: "text" as const, text: resultJson(result) }] };
    }
  );

  server.registerTool(
    "completeTask",
    {
      title: "Complete task",
      description: "Mark a StudyFlow task completed by id, or by a title query when id is unknown. Updates plan progress.",
      inputSchema: {
        id: z.string().optional().describe("Task id (preferred)"),
        query: z.string().optional().describe("Substring of the task title to match"),
      },
    },
    async (args) => {
      const db: DB = loadDB();
      const result = completeTask(db, args);
      saveDB(db);
      return { content: [{ type: "text" as const, text: resultJson(result) }] };
    }
  );

  server.registerTool(
    "getStudyHistory",
    {
      title: "Get study history",
      description: "Get completed focus sessions and total recorded study time.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional().describe("Max sessions to return (default 10)"),
      },
    },
    async (args) => {
      const db: DB = loadDB();
      const result = getStudyHistory(db, args);
      saveDB(db);
      return { content: [{ type: "text" as const, text: resultJson(result) }] };
    }
  );

  server.registerTool(
    "getStudyContext",
    {
      title: "Get study context",
      description: "Get a compact summary of active plans, task counts, study time and reported difficulties.",
      inputSchema: {},
    },
    async () => {
      const db: DB = loadDB();
      const result = getStudyContextHandler(db);
      saveDB(db);
      return { content: [{ type: "text" as const, text: resultJson(result) }] };
    }
  );

  server.registerTool(
    "suggestNextStep",
    {
      title: "Suggest next step",
      description: "Recommend the single best next study action from current plans and tasks.",
      inputSchema: {},
    },
    async () => {
      const db: DB = loadDB();
      const result = suggestNextStepHandler(db);
      saveDB(db);
      return { content: [{ type: "text" as const, text: resultJson(result) }] };
    }
  );

  return server;
}
