export function detectDomain(
  text: string,
  defaultDomain: string = "general",
): string {
  const domains = {
    shell: ["command", "terminal", "bash", "shell", "execute", "script", "cli"],
    coding: [
      "code",
      "function",
      "variable",
      "syntax",
      "programming",
      "debug",
      "compile",
    ],
    system: ["file", "directory", "process", "memory", "cpu", "system", "disk"],
    network: ["http", "api", "request", "response", "url", "network", "server"],
    data: ["json", "csv", "database", "query", "data", "table", "record"],
    plugin: ["plugin", "load", "unload", "register", "module", "extension"],
  };

  const lowerText = text.toLowerCase();

  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return domain;
    }
  }

  return defaultDomain;
}

// Add other general text parsing utilities for experiences if identified and consolidated.
