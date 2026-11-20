export const CLAUDE_JOBS_URL = "https://github.com/XavierClavel/claude-jobs";
export const CLAUDE_JOBS_RELEASES_URL = `${CLAUDE_JOBS_URL}/releases/latest`;

export const CLAUDE_JOBS_AGENT_PROMPT = `Help me create a Claude Jobs job: a Claude Code prompt that the Claude Jobs app runs on a schedule on this Mac. Use its command line, "$HOME/Applications/Claude Jobs.app/Contents/MacOS/claude-jobs" (or the same app in /Applications); the "Command line" section of ${CLAUDE_JOBS_URL} explains \`save\`. Ask me what the job should do and when it should run, confirm the folder it runs in and the tools it may use, then create it with \`claude-jobs save\` and start a first run with \`claude-jobs start <job>\` so we can review the result together.`;
