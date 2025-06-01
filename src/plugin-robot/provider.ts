import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
  addHeader,
  logger,
  ModelType,
} from "@elizaos/core";
import { type RobotService } from "./service";
import { type ScreenContext, type ScreenObject } from "./types";

function formatAge(ageMs: number): string {
  if (ageMs < 1000) {
    return "just now";
  } else if (ageMs < 60000) {
    return `${Math.floor(ageMs / 1000)} seconds ago`;
  } else if (ageMs < 3600000) {
    return `${Math.floor(ageMs / 60000)} minutes ago`;
  } else {
    return `${Math.floor(ageMs / 3600000)} hours ago`;
  }
}

export const screenProvider: Provider = {
  name: "SCREEN_CONTEXT",
  description:
    "Current screen context with OCR, description history, and change detection information.",
  position: 50,
  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    try {
      const service = runtime.getService<RobotService>("ROBOT" as any);
      if (!service) {
        logger.debug(
          "[screenProvider] RobotService not yet available, services may still be initializing",
        );
        return {
          values: {
            serviceStatus: "initializing",
            dataAge: "unavailable",
            currentDescription: "",
            ocr: "",
            objects: [],
            changeDetected: false,
            pixelDifferencePercentage: undefined,
            historyCount: 0,
            isStale: false,
          },
          text: "# Screen Context\n\n🔄 **Robot Service Initializing**\n\nThe robot service is still starting up. Screen context will be available once initialization is complete.\n\n**Status**: Service not yet available\n**Expected**: Available after service initialization",
          data: { serviceStatus: "initializing" },
        };
      }

      let context: ScreenContext | null = null;
      let contextAge = "unknown";
      let isStale = false;

      try {
        context = await Promise.race([
          service.getContext(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Context timeout")), 1000),
          ),
        ]);

        if (context) {
          const ageMs = Date.now() - context.timestamp;
          contextAge = formatAge(ageMs);
          isStale = ageMs > 10000; // Consider stale after 10 seconds
        }
      } catch (error) {
        logger.debug(
          "[screenProvider] Context not immediately available, using fallback",
          error,
        );
        return {
          values: {
            serviceStatus: "processing",
            dataAge: "processing",
            currentDescription: "",
            ocr: "",
            objects: [],
            changeDetected: false,
            pixelDifferencePercentage: undefined,
            historyCount: 0,
            isStale: false,
          },
          text: "# Screen Context\n\n⏳ **Processing Screen Data**\n\nThe robot service is currently processing screen information in the background.\n\n**Status**: Background processing active\n**Data**: Will be available shortly",
          data: { serviceStatus: "processing" },
        };
      }

      if (!context) {
        return {
          values: {
            serviceStatus: "no-data",
            dataAge: "none",
            currentDescription: "",
            ocr: "",
            objects: [],
            changeDetected: false,
            pixelDifferencePercentage: undefined,
            historyCount: 0,
            isStale: false,
          },
          text: "# Screen Context\n\n❌ **No Screen Data Available**\n\nNo screen context data is currently available.\n\n**Status**: No data captured yet",
          data: { serviceStatus: "no-data" },
        };
      }

      // Format status indicators
      const statusIndicators = [];
      if (isStale) {
        statusIndicators.push("⚠️ Data may be stale");
      }
      if (context.changeDetected) {
        statusIndicators.push("🔄 Fresh AI analysis");
      } else {
        statusIndicators.push("💾 Using cached analysis");
      }

      // Format current description section
      const currentDescriptionText =
        context.currentDescription || "No description available";
      const currentDescriptionSection = `# Current Screen Description\n${currentDescriptionText}`;

      // Format description history section
      let historySection = "# Recent Screen History\n";
      if (context.descriptionHistory && context.descriptionHistory.length > 0) {
        historySection += context.descriptionHistory
          .map(
            (entry, index) =>
              `${index + 1}. ${entry.relativeTime}: ${entry.description}`,
          )
          .join("\n");
      } else {
        historySection += "No recent history available";
      }

      // Format OCR section
      const ocrText = context.ocr || "No text detected";
      const ocrSection = `# Text on Screen (OCR)\n${ocrText}`;

      // Format objects section
      const objectsText =
        Array.isArray(context.objects) && context.objects.length > 0
          ? context.objects
              .map((o) => {
                const { label, bbox } = o as {
                  label: string;
                  bbox?: { x?: number; y?: number };
                };
                if (
                  bbox &&
                  typeof bbox.x === "number" &&
                  typeof bbox.y === "number"
                ) {
                  return `${label} at (${bbox.x},${bbox.y})`;
                }
                return label;
              })
              .join("\n")
          : "No object data available";
      const objectsSection = objectsText
        ? `# Interactive Objects\n${objectsText}`
        : "# Interactive Objects\nNone detected";

      // Format change detection section
      let changeSection = "# Processing Status\n";
      if (context.changeDetected) {
        changeSection += `✅ Significant change detected`;
        if (context.pixelDifferencePercentage !== undefined) {
          changeSection += ` (${context.pixelDifferencePercentage.toFixed(1)}% pixels changed)`;
        }
        changeSection +=
          "\n🔄 AI analysis was performed for this screen capture";
      } else {
        changeSection += `⏸️ No significant change detected`;
        if (context.pixelDifferencePercentage !== undefined) {
          changeSection += ` (${context.pixelDifferencePercentage.toFixed(1)}% pixels changed)`;
        }
        changeSection += "\n💾 Using cached AI analysis to save resources";
      }

      // Add data freshness info
      const freshnessSection = `# Data Freshness\n📅 **Last Updated**: ${contextAge}\n📊 **Status**: ${statusIndicators.join(", ")}`;

      // Combine all sections
      const text = [
        currentDescriptionSection,
        historySection,
        ocrSection,
        objectsSection,
        changeSection,
        freshnessSection,
      ].join("\n\n");

      return {
        values: {
          currentDescription: context.currentDescription || "",
          ocr: context.ocr || "",
          objects: context.objects || [],
          changeDetected: context.changeDetected,
          pixelDifferencePercentage: context.pixelDifferencePercentage,
          historyCount: context.descriptionHistory
            ? context.descriptionHistory.length
            : 0,
          serviceStatus: "active",
          dataAge: contextAge,
          isStale: isStale,
        },
        text,
        data: context,
      };
    } catch (error) {
      logger.error("[screenProvider] Error getting screen context:", error);
      return {
        values: {
          serviceStatus: "error",
          dataAge: "error",
          currentDescription: "",
          ocr: "",
          objects: [],
          changeDetected: false,
          pixelDifferencePercentage: undefined,
          historyCount: 0,
          isStale: false,
        },
        text: "# Screen Context\n\n❌ **Error Getting Screen Data**\n\nAn error occurred while retrieving screen context.\n\n**Status**: Error state\n**Action**: Service will retry automatically",
        data: { error: (error as Error).message },
      };
    }
  },
};
