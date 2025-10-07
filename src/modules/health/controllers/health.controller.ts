import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { HealthResponseDto } from "../dto/health-response.dto";
import { HealthService } from "../services/health.service";
const healthRoute = "v1/health";
export class HealthController {
  private readonly healthService: HealthService;

  constructor() {
    this.healthService = new HealthService();
  }

  async getHealth(): Promise<HealthResponseDto> {
    return this.healthService.getHealthStatus();
  }

  async getHealthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.healthService.getSimpleHealthStatus();
  }

  async getLiveness(): Promise<{ status: string }> {
    return { status: "alive" };
  }

  async getReadiness(): Promise<{ status: string; ready: boolean }> {
    try {
      const healthStatus = await this.healthService.getHealthStatus();
      const ready =
        healthStatus.services.database === "healthy" &&
        healthStatus.services.api === "healthy";

      return {
        status: ready ? "ready" : "not ready",
        ready,
      };
    } catch (error) {
      return {
        status: "not ready",
        ready: false,
      };
    }
  }
}

const healthController = new HealthController();

export async function healthCheck(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const healthStatus = await healthController.getHealthCheck();
    return {
      status: 200,
      jsonBody: healthStatus,
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: { error: "Health check failed" },
    };
  }
}

export async function health(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const healthStatus = await healthController.getHealth();
    return {
      status: 200,
      jsonBody: healthStatus,
    };
  } catch (error) {
    console.error("Health check failed:", error);
    return {
      status: 500,
      jsonBody: { error: "Health check failed" },
    };
  }
}

app.http("healthCheck", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: healthRoute,
  handler: healthCheck,
});

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: `${healthRoute}/status`,
  handler: health,
});
