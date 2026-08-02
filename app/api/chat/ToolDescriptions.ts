const gmailToolDeclaration = [
  {
    type: "function",
    function: {
      name: "send_mails",
      description: "Sends emails to multiple users.",
      parameters: {
        type: "object",
        properties: {
          mailList: {
            type: "array",
            items: {
              type: "string",
            },
            description: "An array of recipients mails.",
          },
          subject: {
            type: "string",
            description: "Subject of the mail.",
          },
          body: {
            type: "string",
            description:
              "Body of the mail, only html format, even newlines expects <br>",
          },
        },
        required: ["mailList", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lists_messages",
      description:
        "Lists unread Gmail messages for the authenticated user matching optional search filters.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description:
              "The user's email address. The special value 'me' indicates the authenticated user.",
            default: "me",
          },
          q: {
            type: "string",
            description:
              "Optional search query to refine unread messages (e.g., 'from:boss@company.com').",
            default: "is:unread",
          },
        },
        required: ["userId", "q"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_message_details",
      description:
        "Retrieves the sender, subject, body, and headers of a specific Gmail message by its messageID.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The unique immutable ID of the message to retrieve.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trash_gmail_message",
      description:
        "Moves a specific Gmail message to the trash folder using its message ID.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "The unique alphanumeric ID of the Gmail message to trash.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trash_automation",
      description:
        "To initiate a process that deletes unwanted/unuseful mails.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_contacts_list",
      description: "gets a list of contacts with name and mail address.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_contact",
      description: "saves a new contact with name and email address.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "name of contact, can be firstname from mail address",
          },
          mailAddress: {
            type: "string",
            description: "mail address of the contact.",
          },
        },
        required: ["name", "mailAddress"],
      },
    },
  },
];

const commandToolDeclaration = [
  {
    type: "function",
    function: {
      name: "execute_commands",
      description:
        "execute any command in the windows command prompt like create folders/file, read/write files etc.. in current directory as root.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "command to execute on windows command prompt",
          },
        },
        required: ["command"],
      },
    },
  },
];

const categoryToolDeclaration = [
  {
    type: "function",
    function: {
      name: "save_category",
      description: "saves the category of the mail",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "category of mail, expects one of 'Promotional','Rejection','Other'.",
          },
        },
        required: ["category"],
      },
    },
  },
];

const planningToolDeclaration = [
  {
    type: "function",
    function: {
      name: "save_scratchpad",
      description:
        "Overwrites the current scratchpad content with a new set of thoughts, approach ideas, or reasoning steps.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description:
              "The full text content representing the LLM's current internal thoughts, strategies, and notes.",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "append_task",
      description:
        "Appends a new task to the task management system with a specified description and status.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The unique identifier for the task.",
          },
          task_description: {
            type: "string",
            description: "The detailed description of the work to be done.",
          },
          status: {
            type: "string",
            enum: ["pending"],
            description: "The current status of the task.",
          },
          tool_names: {
            type: "array",
            description:
              "a list of tool names required to accomplish the task.",
            items: {
              type: "string",
            },
          },
        },
        required: ["id", "task_description", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_failed",
      description:
        "Updates the details or status of an existing task in the system.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The unique identifier of the task to update.",
          },
          output: {
            type: "string",
            description: "Reason of failure of the task.",
          },
        },
        required: ["id", "output"],
      },
    },
  },
];

export {
  gmailToolDeclaration,
  commandToolDeclaration,
  categoryToolDeclaration,
  planningToolDeclaration,
};
