import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy init Gemini client to avoid crashes if GEMINI_API_KEY is not defined yet.
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Real AI responses will fall back to smart simulated agents.");
      // We will handle fallback gracefully below.
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// In-memory Store (Restores default state each server reboot, but tracks changes live)
let deadlines = [
  {
    id: "1",
    title: "CS301 Final Project submission",
    description: "Submit final source code zip file and 5-page PDF report to LMS portal. 25% of final grade.",
    dueAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 mins from now
    source: "gmail",
    sourceName: "LMS Portal email digest",
    urgencyScore: 92,
    status: "active",
    contactName: "Prof. Sharma",
    contactEmail: "sharma.academic@university.edu",
    category: "study"
  },
  {
    id: "2",
    title: "Weekly Client Progress Sync",
    description: "Align on weekly roadmap, blockers, and sign off the Q3 project milestone draft.",
    dueAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(), // 2 hours from now
    source: "calendar",
    sourceName: "Google Calendar Event",
    urgencyScore: 78,
    status: "active",
    contactName: "Priya Patel",
    contactEmail: "priya.patel@vibe-studios.com",
    category: "work"
  },
  {
    id: "3",
    title: "AWS Cloud Architecture Design Proposal",
    description: "Deliver complete server topology diagrams and pricing estimate to the DevOps team.",
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    source: "tasks",
    sourceName: "Google Tasks",
    urgencyScore: 65,
    status: "active",
    contactName: "Alex Mercer",
    contactEmail: "alex.m@devops-lead.io",
    category: "work"
  },
  {
    id: "4",
    title: "Physics 101 Mechanics Lab Report",
    description: "Submit friction coefficients lab report and pendulum experiment spreadsheet. (Late policy: -10% per day).",
    dueAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(), // 3 hours ago (MISSED!)
    source: "gmail",
    sourceName: "Syllabus Course Outline",
    urgencyScore: 95,
    status: "missed",
    contactName: "Dr. Evelyn Foster",
    contactEmail: "evelyn.foster@physics-dept.edu",
    category: "study"
  }
];

// In-memory Actions
let agentActions: any[] = [];

// Default Preferences
let userPreferences = {
  name: "Arjun Mehta",
  email: "arjun.mehta@university.edu",
  aiTone: "balanced",
  voiceActive: true
};

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // GET Deadlines
  app.get("/api/deadlines", (req, res) => {
    res.json(deadlines);
  });

  // POST Create manual deadline
  app.post("/api/deadlines", (req, res) => {
    const { title, description, dueAt, source, contactName, contactEmail, category } = req.body;
    const newDeadline = {
      id: Math.random().toString(36).substr(2, 9),
      title: title || "New Deadline",
      description: description || "",
      dueAt: dueAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      source: source || "manual",
      sourceName: source === "manual" ? "Manual Input" : "ACTO Connected Portal",
      urgencyScore: Math.floor(Math.random() * 40) + 50,
      status: new Date(dueAt).getTime() < Date.now() ? "missed" : "active",
      contactName: contactName || "Partner",
      contactEmail: contactEmail || "partner@example.com",
      category: category || "personal"
    };
    deadlines.push(newDeadline);
    res.json(newDeadline);
  });

  // PUT Update deadline status
  app.put("/api/deadlines/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const idx = deadlines.findIndex(d => d.id === id);
    if (idx !== -1) {
      deadlines[idx].status = status;
      res.json(deadlines[idx]);
    } else {
      res.status(404).json({ error: "Deadline not found" });
    }
  });

  // DELETE Deadline
  app.delete("/api/deadlines/:id", (req, res) => {
    const { id } = req.params;
    deadlines = deadlines.filter(d => d.id !== id);
    res.json({ success: true, id });
  });

  // GET User preferences
  app.get("/api/preferences", (req, res) => {
    res.json(userPreferences);
  });

  // PUT User preferences
  app.put("/api/preferences", (req, res) => {
    userPreferences = { ...userPreferences, ...req.body };
    res.json(userPreferences);
  });

  // GET Actions
  app.get("/api/actions", (req, res) => {
    res.json(agentActions);
  });

  // POST Call Gemini to draft a suggestion for a deadline
  app.post("/api/agent/suggest", async (req, res) => {
    const { deadlineId, playbook = "negotiate" } = req.body;
    const dl = deadlines.find(d => d.id === deadlineId);
    if (!dl) {
      return res.status(404).json({ error: "Deadline not found" });
    }

    // If the deadline is already completed or recovered, return the executed action details
    if (dl.status === "done" || dl.status === "recovered") {
      const executedAction = agentActions.find(a => a.deadlineId === dl.id && a.status === "executed");
      if (executedAction) {
        return res.json(executedAction);
      } else {
        const fallbackCompletedAction = {
          id: "executed-" + dl.id,
          deadlineId: dl.id,
          type: "send_email",
          status: "executed",
          draftTo: dl.contactEmail,
          draftSubject: `Re: Resolved - ${dl.title}`,
          draftBody: `Hi ${dl.contactName},\n\nThis is confirmed resolved and dispatched. Thank you!\n\nBest,\n${userPreferences.name}`,
          agentReasoning: "Automatically executed and archived by ACTO Agent.",
          agentConfidence: 100,
          chainOfThought: ["Scan status", "Verify resolution", "Archive task"],
          executedAt: new Date().toISOString()
        };
        return res.json(fallbackCompletedAction);
      }
    }

    // Determine type of suggested action
    let type: 'send_email' | 'reschedule_event' | 'extension_request' | 'send_whatsapp' = "send_email";
    if (playbook === "shield") {
      type = "reschedule_event";
    } else if (playbook === "coworking") {
      type = "send_whatsapp";
    } else if (dl.category === "work" && dl.source === "calendar") {
      type = "reschedule_event";
    } else if (dl.status === "missed") {
      type = "extension_request";
    } else if (dl.category === "personal") {
      type = "send_whatsapp";
    }

    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (hasApiKey) {
      try {
        const client = getGeminiClient();
        
        let playbookPromptModifier = "";
        if (playbook === "negotiate") {
          playbookPromptModifier = "Draft a formal, highly diplomatic, or professional delay resolution/email extension request explaining the issue politely.";
        } else if (playbook === "shield") {
          playbookPromptModifier = "Draft a 2-hour Google Calendar Shield Block event outline. Instead of an email, design a clear focus objective, structured calendar agenda with exact time breakdown, and concentration tips to reserve the slot.";
        } else if (playbook === "outline") {
          playbookPromptModifier = "Draft a granular, step-by-step 3-hour micro-milestone plan of attack (not an email!). Detail hourly tasks and timestamps to systematically conquer this deadline.";
        } else if (playbook === "coworking") {
          playbookPromptModifier = "Draft a warm, collaborative peer or teammate outreach message (for Slack/WhatsApp/Email) inviting them to coordinate or run a focus study block to tackle this together.";
        }

        const prompt = `
          You are ACTO (AI Chief Task Officer), an autonomous executor agent.
          The user has an approaching or missed deadline. Analyze the context and write a customized proposed action.
          
          Deadline Title: ${dl.title}
          Deadline Description: ${dl.description}
          Due Date: ${dl.dueAt}
          Current Time: ${new Date().toISOString()}
          Category: ${dl.category}
          Status: ${dl.status}
          Recipient Name: ${dl.contactName}
          Recipient Email: ${dl.contactEmail}
          AI Tone Preference: ${userPreferences.aiTone}
          Playbook Strategy Chosen: ${playbook} (${playbookPromptModifier})
          
          Generate a JSON object matching this schema exactly:
          {
            "draftSubject": "Compelling subject line, short summary title, or calendar event title",
            "draftBody": "The entire customized message body or structured list. Use modern, realistic copy — no placeholders. Sign off with name '${userPreferences.name}' if appropriate.",
            "agentReasoning": "1-2 sentence explanation of why this chosen playbook strategy is optimal to defeat procrastination and secure the deadline.",
            "agentConfidence": 95,
            "chainOfThought": [
              "Step 1: Analyzed deadline urgency and selected ${playbook} playbook",
              "Step 2: Scanned recipient context and relationship dynamics...",
              "Step 3: Drafted customized execution response..."
            ]
          }
        `;

        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                draftSubject: { type: Type.STRING },
                draftBody: { type: Type.STRING },
                agentReasoning: { type: Type.STRING },
                agentConfidence: { type: Type.INTEGER },
                chainOfThought: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["draftSubject", "draftBody", "agentReasoning", "agentConfidence", "chainOfThought"]
            }
          }
        });

        const jsonStr = response.text ? response.text.trim() : "";
        const result = JSON.parse(jsonStr);

        const newAction = {
          id: Math.random().toString(36).substr(2, 9),
          deadlineId: dl.id,
          type,
          status: "awaiting_approval",
          draftTo: dl.contactEmail,
          draftSubject: result.draftSubject,
          draftBody: result.draftBody,
          agentReasoning: result.agentReasoning,
          agentConfidence: result.agentConfidence,
          chainOfThought: result.chainOfThought,
          createdAt: new Date().toISOString()
        };

        // Remove any old pending suggestions for this deadline
        agentActions = agentActions.filter(a => a.deadlineId !== dl.id || a.status !== "awaiting_approval");
        agentActions.push(newAction);

        return res.json(newAction);

      } catch (error: any) {
        console.warn("⚠️ [ACTO API Engine] Gemini API Quota Limit reached or Key offline. Activating dynamic local synthesis engine.");
        // Fallback gracefully below
      }
    }

    // Fallback/Simulated intelligent generation if API fails or is not available
    const fallbackActions: Record<string, Record<string, any>> = {
      "1": {
        negotiate: {
          draftSubject: "Extension Request & Update: CS301 Final Project submission",
          draftBody: `Dear Prof. Sharma,\n\nI am currently packaging the source code files for our CS301 Final Project. I ran into a compile-time bug with the build system when compiling the containerized version on our testbed, which is causing a slight delay. \n\nI am actively refactoring the module and estimate completion within the next 2 hours. Would it be possible to submit the project zip with a small grace period? I want to ensure the code compiles flawlessly on your grading environment.\n\nThank you for your understanding,\n${userPreferences.name}`,
          agentReasoning: "Drafted academic explanation regarding compilation errors, leveraging professional student-professor relationship.",
          agentConfidence: 94,
          chainOfThought: [
            "Scan CS301 syllabus policies regarding late work",
            "Identify recipient: Prof. Sharma's email structure",
            "Match academic tone to Prof. Sharma's previous announcements",
            "Formulate grace-period request centered on code-quality assurance"
          ]
        },
        shield: {
          draftSubject: "📅 [SHIELD] CS301 Deep Focus: Code Packaging & Compile Verify",
          draftBody: `Focus Objective: Resolve Docker compilation errors and verify packaging pipeline.\n\nSTRUCTURED ACTION AGENDA:\n• 1:00 PM - 2:00 PM: Troubleshoot and repair relative ESM import compilation bugs.\n• 2:00 PM - 2:30 PM: Run local test suite to confirm complete testbed success.\n• 2:30 PM - 3:00 PM: Draft 5-page PDF report and archive final submission package.\n\nCONCENTRATION PROTOCOL:\n- Switch all phone notifications to DND.\n- Play background binaural beats (40Hz) for coding deep focus.\n- Close irrelevant browser tabs and email notifications.`,
          agentReasoning: "Auto-scheduled a 2-hour high-efficiency block in your Google Calendar to safeguard your time from secondary team calls.",
          agentConfidence: 98,
          chainOfThought: [
            "Scan active Google Calendar slots for a free 2-hour window",
            "Draft high-productivity deep work reservation outline",
            "Configure concentration guidelines specific to full-stack debugging"
          ]
        },
        outline: {
          draftSubject: "⚡ CS301 Final Project: 3-Hour Attack Plan",
          draftBody: `ACTO AUTOMATED MICRO-MILESTONE PLAYBOOK:\n\n[MILESTONE 1 - 0h to 1h]: ESM Paths Fix\n- Isolate relative export statement errors in /server.ts\n- Run 'tsc --noEmit' to verify compilation\n\n[MILESTONE 2 - 1h to 2h]: Container Assembly\n- Run 'docker build -t cs301-applet .'\n- Inspect port mappings and resource volumes\n\n[MILESTONE 3 - 2h to 3h]: PDF & Package Dispatch\n- Outline architectural topology diagram\n- Zip files and upload securely to university grading portal`,
          agentReasoning: "Deconstructed overwhelming CS301 submission into three 60-minute actionable milestones to bypass panic.",
          agentConfidence: 96,
          chainOfThought: [
            "Deconstruct CS301 rubric into modular milestones",
            "Calibrate timestamps based on current local clock",
            "Inject specific technical goals to assure grade-maximizing code delivery"
          ]
        },
        coworking: {
          draftSubject: "💬 WhatsApp Outreach: CS301 Code-Session Invite",
          draftBody: `Hey guys! Are any of you working on the CS301 Final Project package right now? I'm hitting a minor relative path compile bug in the Docker container build. Let's do a quick huddle or study-session in the student center to verify our build setups and submit together! I can bring coffee ☕`,
          agentReasoning: "Formulated a casual peer invitation to foster collaboration and share debugging cognitive load.",
          agentConfidence: 90,
          chainOfThought: [
            "Identify course peers registered on your study Discord channels",
            "Formulate low-friction, high-incentive study offer (coffee ☕)",
            "Structure clear technical call-to-action"
          ]
        }
      },
      "2": {
        negotiate: {
          draftSubject: "Proposed Agenda: Weekly Client Progress Sync",
          draftBody: `Hi Priya,\n\nI look forward to our weekly sync at 3:00 PM. To keep our session highly productive, I've outlined the core agenda items we will cover:\n\n1. Q3 Roadmap Review: Walkthrough of the updated figma screens and visual templates.\n2. Milestone Sign-off: Verification of the finalized product specification document.\n3. DevOps Infrastructure: Status update on cloud deployment tasks.\n\nLet me know if you would like to append any other items to our discussion.\n\nBest regards,\n${userPreferences.name}`,
          agentReasoning: "Synthesized draft agenda using standard project management goals, saving 15 minutes of preparation.",
          agentConfidence: 91,
          chainOfThought: [
            "Retrieve previous weekly meeting notes from Calendar integration",
            "Detect unconfirmed draft deliverables in shared folder",
            "Formulate bulleted list highlighting key decision points",
            "Format casual-professional client email template"
          ]
        },
        shield: {
          draftSubject: "📅 [SHIELD] Client Demo & Presentation Prep Block",
          draftBody: `Focus Objective: Ensure presentation slides and Figma prototypes are fully loaded and rehearsed.\n\nSTRUCTURED ACTION AGENDA:\n• 1:30 PM - 2:00 PM: Walkthrough client demo flow to check for broken visual UI elements.\n• 2:00 PM - 2:30 PM: Finalize roadmap slides and polish performance metrics.\n• 2:30 PM - 2:50 PM: Draft client summary email ready to dispatch post-sync.\n\nCONCENTRATION PROTOCOL:\n- Close messaging apps (Slack, Discord) to avoid last-minute scope changes.\n- Run demo in clean private browser window to avoid cache lag.`,
          agentReasoning: "Shielded the 1.5 hours prior to your demo with Priya to ensure 100% prepared delivery.",
          agentConfidence: 95,
          chainOfThought: [
            "Identify pre-meeting high stress buffer times",
            "Formulate practical client-demo rehearsal tasks",
            "Draft calendar event placeholder"
          ]
        },
        outline: {
          draftSubject: "⚡ Client Sync: Pre-Meeting 90-Minute Blueprint",
          draftBody: `ACTO AUTOMATED SYNC BLUEPRINT:\n\n[00m - 30m]: Technical Audit\n- Boot development server and trigger full demo cycle\n- Verify database handshakes are reporting 100% success\n\n[30m - 60m]: Visual Alignment\n- Compile performance stats screenshots from your AnalyticsWorkspace\n- Load presentation deck inside Chrome presentation tab\n\n[60m - 90m]: Rehearsal\n- Verbal practice of key technical feature explanations`,
          agentReasoning: "Formulated a step-by-step prep checklist to remove pre-meeting anxiety and guarantee client success.",
          agentConfidence: 93,
          chainOfThought: [
            "Extract sync prerequisites from team calendar description",
            "Structure logical tech-check workflow",
            "Calibrate timestamps to terminate 10 minutes prior to sync"
          ]
        },
        coworking: {
          draftSubject: "💬 Slack Message: Quick Pre-Sync Alignment",
          draftBody: `Hey Team! Priya Patel wants to sign off on our Q3 project milestone specs during our weekly sync at 3:00 PM. Let's do a quick 10-minute huddle in the Huddle Room at 1:30 PM to align on our roadmap targets and make sure we're completely on the same page before she boots the call.`,
          agentReasoning: "Generated teammate sync ping to prevent conflicting statements during the live client call.",
          agentConfidence: 92,
          chainOfThought: [
            "Locate active development team members in workspace directory",
            "Draft highly urgent but low-friction collaborative ping",
            "Schedule call in free shared slot"
          ]
        }
      },
      "4": {
        negotiate: {
          draftSubject: "Late Submission Request: Mechanics Lab Report",
          draftBody: `Dear Dr. Foster,\n\nI am writing to sincerely apologize for missing the submission window for the friction coefficient lab report earlier today. I unfortunately miscalculated the spreadsheet calibration time and was unable to compile the final graphs before the deadline.\n\nI have now completed the entire report and attached the PDF. I understand the late policy specifies a -10% deduction per day, and I completely accept this penalty. I appreciate your patience and dedication to our coursework.\n\nSincerely,\n${userPreferences.name}`,
          agentReasoning: "Initiated Crisis Recovery Mode. Generated polite late submission cover letter accepting standard penalties.",
          agentConfidence: 96,
          chainOfThought: [
            "Trigger Crisis Recovery Mode: Deadline was missed 3 hours ago",
            "Scan syllabus for exact late penalty specifications (detected -10%/day)",
            "Formulate honest apology acknowledging the error directly",
            "Prepare attachment references for immediate manual submission"
          ]
        },
        shield: {
          draftSubject: "📅 [SHIELD] Mechanics Lab Analysis Calibration",
          draftBody: `Focus Objective: Fix experimental error formulas and compile scatter plots.\n\nSTRUCTURED ACTION AGENDA:\n• 4:00 PM - 4:45 PM: Correct friction coefficient spreadsheets calibration math.\n• 4:45 PM - 5:15 PM: Plot final linear regression charts with correct R² values.\n• 5:15 PM - 5:45 PM: Draft Experimental Errors analysis paragraph and package report.\n\nCONCENTRATION PROTOCOL:\n- Put phone on silent.\n- Keep experimental workbook open on left monitor, spreadsheet on right monitor.`,
          agentReasoning: "Auto-scheduled an emergency 100-minute shield block in your calendar to complete the report immediately.",
          agentConfidence: 97,
          chainOfThought: [
            "Isolate urgent missed task variables",
            "Calculate minimum needed calibration time",
            "Establish strict environment focus rules"
          ]
        },
        outline: {
          draftSubject: "⚡ Mechanics Lab: Emergency 2-Hour Recovery Plan",
          draftBody: `ACTO EMERGENCY RECOVERY WORKFLOW:\n\n[00m - 40m]: Data Fixes\n- Cross-verify local friction workbook numbers against class lab averages\n- Apply linear least-squares regression corrections\n\n[40m - 80m]: Visual Plotting\n- Output dual scatter graphs and format axis labels cleanly\n- Embed charts inside mechanics-report-final.docx template\n\n[80m - 120m]: Report Compile\n- Fill in methodology and error log fields\n- Save as PDF and dispatch with late cover email`,
          agentReasoning: "Laid out exact recovery plan to stop panicking and recover maximum late credit.",
          agentConfidence: 95,
          chainOfThought: [
            "Define essential steps to reach minimum passing submission quality",
            "Arrange workflow to build the charts before drafting findings",
            "Establish timeline ending with immediate upload to Dr. Foster"
          ]
        },
        coworking: {
          draftSubject: "💬 Discord ping: Mechanics Lab calculation check",
          draftBody: `Hey! Are you done with the friction coefficient spreadsheet for Dr. Foster's lab report? I'm hitting some weird experimental error percentages on my data sheet. Can we hop on a quick discord screen-share to compare calibration plots so I can fix mine and submit? I'd really appreciate it!`,
          agentReasoning: "Formulated a peer study request to resolve mathematical obstacles via screen-share.",
          agentConfidence: 89,
          chainOfThought: [
            "Identify classmates who completed similar labs",
            "Formulate screen-share ask to minimize coordination lag",
            "Focus strictly on calibration numbers"
          ]
        }
      }
    };

    const deadlinePlaybooks = fallbackActions[dl.id] || {
      negotiate: {
        draftSubject: `Regarding: ${dl.title}`,
        draftBody: `Hi ${dl.contactName},\n\nI am reaching out regarding our upcoming deadline for "${dl.title}". Please let me know if we need to align or reschedule.\n\nBest,\n${userPreferences.name}`,
        agentReasoning: "Formulated gentle proactive reminder to secure alignment and communication channels.",
        agentConfidence: 85,
        chainOfThought: [
          "Read context of manual task",
          "Generate basic notification draft to secure recipient alignment"
        ]
      },
      shield: {
        draftSubject: `📅 [SHIELD] Deep Focus Reservation: ${dl.title}`,
        draftBody: `Focus Objective: Secure target resolution before deadline expires.\n\nSTRUCTURED ACTION AGENDA:\n• Hour 1: Complete initial data collection and research.\n• Hour 2: Draft deliverables and compile final report.\n\nCONCENTRATION PROTOCOL:\n- Focus 100% on the single target. No multitasking.`,
        agentReasoning: "Created proactive focus lock to minimize distraction.",
        agentConfidence: 85,
        chainOfThought: ["Calculate buffer time", "Structure basic deep focus agenda"]
      },
      outline: {
        draftSubject: `⚡ ${dl.title}: 2-Hour Action Blueprint`,
        draftBody: `ACTO STEP-BY-STEP ACTION BLUEPRINT:\n\n- Milestone 1 (0h - 1h): Isolate key requirements and sketch drafts.\n- Milestone 2 (1h - 2h): Refine final output, package dependencies, and dispatch.`,
        agentReasoning: "Deconstructed task into bite-sized actionable items.",
        agentConfidence: 88,
        chainOfThought: ["Deconstruct manual task requirements", "Map realistic 2-hour workflow"]
      },
      coworking: {
        draftSubject: "💬 Outreach: Coordination Invite",
        draftBody: `Hi ${dl.contactName},\n\nI am working on the deliverables for "${dl.title}". Let me know if you have 10 minutes to sync up so we can coordinate our efforts and finish this together smoothly.`,
        agentReasoning: "Sent collaborative ping to coordinate deliverables.",
        agentConfidence: 86,
        chainOfThought: ["Draft alignment message", "Reference specific task title"]
      }
    };

    const actionData = deadlinePlaybooks[playbook] || deadlinePlaybooks.negotiate;

    const simAction = {
      id: Math.random().toString(36).substr(2, 9),
      deadlineId: dl.id,
      type,
      status: "awaiting_approval",
      draftTo: dl.contactEmail,
      draftSubject: actionData.draftSubject,
      draftBody: actionData.draftBody,
      agentReasoning: actionData.agentReasoning,
      agentConfidence: actionData.agentConfidence,
      chainOfThought: actionData.chainOfThought,
      createdAt: new Date().toISOString()
    };

    agentActions = agentActions.filter(a => a.deadlineId !== dl.id || a.status !== "awaiting_approval");
    agentActions.push(simAction);
    res.json(simAction);
  });

  // POST Demo generation
  app.post("/api/demo", async (req, res) => {
    const { prompt } = req.body;
    try {
      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze this deadline crisis and draft a solution: "${prompt}".
        Return JSON matching this schema:
        {
          "draftSubject": "string",
          "draftBody": "string",
          "agentReasoning": "string"
        }`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are ACTO, the AI Chief Task Officer. Respond with professional, polished solutions."
        }
      });
      res.json(JSON.parse(response.text!));
    } catch (e) {
      res.json({
        draftSubject: "Re: Your Deadline Inquiry",
        draftBody: "I have analyzed your situation and suggest we immediately initiate contact to request an extension or align on deliverables. I am ready to dispatch this if you approve.",
        agentReasoning: "Simulated response for demonstration purposes as Gemini is currently unavailable."
      });
    }
  });


  // POST Execute action (Simulate actually dispatching via APIs)
  app.post("/api/agent/execute", (req, res) => {
    const { actionId, editedSubject, editedBody } = req.body;
    const actionIdx = agentActions.findIndex(a => a.id === actionId);
    if (actionIdx === -1) {
      return res.status(404).json({ error: "Action not found" });
    }

    agentActions[actionIdx].status = "executed";
    agentActions[actionIdx].executedAt = new Date().toISOString();
    if (editedSubject) {
      agentActions[actionIdx].draftSubject = editedSubject;
    }
    if (editedBody) {
      agentActions[actionIdx].draftBody = editedBody;
    }

    // Mark corresponding deadline as "done" or "recovered"
    const dlIdx = deadlines.findIndex(d => d.id === agentActions[actionIdx].deadlineId);
    if (dlIdx !== -1) {
      deadlines[dlIdx].status = deadlines[dlIdx].status === "missed" ? "recovered" : "done";
    }

    res.json({
      success: true,
      action: agentActions[actionIdx],
      deadline: dlIdx !== -1 ? deadlines[dlIdx] : null
    });
  });

  // POST Reject action
  app.post("/api/agent/reject", (req, res) => {
    const { actionId } = req.body;
    const actionIdx = agentActions.findIndex(a => a.id === actionId);
    if (actionIdx === -1) {
      return res.status(404).json({ error: "Action not found" });
    }

    agentActions[actionIdx].status = "failed";
    res.json({ success: true, action: agentActions[actionIdx] });
  });

  // POST Voice Command
  app.post("/api/agent/voice", async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Voice transcription text required" });
    }

    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (hasApiKey) {
      try {
        const client = getGeminiClient();
        const prompt = `
          You are ACTO's Voice Assistant parser. The user said: "${text}".
          Extract the core action they want to take and generate a structured JSON object.
          
          Provide a JSON response matching this schema:
          {
            "title": "A short, crisp deadline or task name, e.g., 'Reschedule Priya पटेल'",
            "description": "A description of what needs to happen based on the utterance",
            "contactName": "Name of contact extracted, e.g. 'Priya Patel'",
            "contactEmail": "A simulated plausible email, e.g. 'priya.patel@vibe-studios.com'",
            "category": "work", // one of: 'work', 'study', 'personal', 'finance'
            "urgencyScore": 85
          }
        `;

        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                contactName: { type: Type.STRING },
                contactEmail: { type: Type.STRING },
                category: { type: Type.STRING },
                urgencyScore: { type: Type.INTEGER }
              },
              required: ["title", "description", "contactName", "contactEmail", "category", "urgencyScore"]
            }
          }
        });

        const result = JSON.parse(response.text ? response.text.trim() : "{}");
        const newDl = {
          id: Math.random().toString(36).substr(2, 9),
          title: result.title || "Voice Command Task",
          description: result.description || text,
          dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
          source: "manual",
          sourceName: "Voice Command",
          urgencyScore: result.urgencyScore || 80,
          status: "active",
          contactName: result.contactName || "Contact",
          contactEmail: result.contactEmail || "contact@example.com",
          category: result.category || "personal"
        };

        deadlines.push(newDl);
        return res.json({ success: true, deadline: newDl });

      } catch (error) {
        console.warn("⚠️ [ACTO API Engine] Gemini API voice parsing error or quota exceeded. Activating local voice transcription parser.");
      }
    }

    // Default simulation fallback
    const mockVoiceTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: "Rescheduled Meeting with Priya Patel",
      description: `Auto-generated voice trigger: "${text}"`,
      dueAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      source: "manual",
      sourceName: "Voice Input",
      urgencyScore: 89,
      status: "active",
      contactName: "Priya Patel",
      contactEmail: "priya.patel@vibe-studios.com",
      category: "work"
    };

    deadlines.push(mockVoiceTask);
    res.json({ success: true, deadline: mockVoiceTask });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ACTO Server running on http://localhost:${PORT}`);
  });
}

startServer();
