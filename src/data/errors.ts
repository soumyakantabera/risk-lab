export type DataErrorCode =
  | "NETWORK_ERROR"
  | "CORS_ERROR"
  | "RATE_LIMIT"
  | "UPSTREAM_CHANGE"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "PROXY_MISCONFIGURED"
  | "PARTIAL_DATA";

export type ErrorDebugInfo = {
  status?: number;
  endpoint?: string;
  requestId?: string;
  timestamp?: string;
  rawPreview?: string;
  details?: string;
};

export class DataError extends Error {
  code: DataErrorCode;
  actionHint: string;
  debugInfo?: ErrorDebugInfo;

  constructor(code: DataErrorCode, message: string, actionHint: string, debugInfo?: ErrorDebugInfo) {
    super(message);
    this.code = code;
    this.actionHint = actionHint;
    this.debugInfo = debugInfo;
  }
}

export class NetworkError extends DataError {
  constructor(message: string, actionHint: string, debugInfo?: ErrorDebugInfo) {
    super("NETWORK_ERROR", message, actionHint, debugInfo);
  }
}

export class CorsError extends DataError {
  constructor(message: string, actionHint: string, debugInfo?: ErrorDebugInfo) {
    super("CORS_ERROR", message, actionHint, debugInfo);
  }
}

export class RateLimitError extends DataError {
  constructor(message: string, actionHint: string, debugInfo?: ErrorDebugInfo) {
    super("RATE_LIMIT", message, actionHint, debugInfo);
  }
}

export class UpstreamChangeError extends DataError {
  constructor(message: string, actionHint: string, debugInfo?: ErrorDebugInfo) {
    super("UPSTREAM_CHANGE", message, actionHint, debugInfo);
  }
}

export class NotFoundError extends DataError {
  constructor(message: string, actionHint: string, debugInfo?: ErrorDebugInfo) {
    super("NOT_FOUND", message, actionHint, debugInfo);
  }
}

export class ValidationError extends DataError {
  constructor(message: string, actionHint: string, debugInfo?: ErrorDebugInfo) {
    super("VALIDATION_ERROR", message, actionHint, debugInfo);
  }
}

export class ProxyMisconfiguredError extends DataError {
  constructor(message: string, actionHint: string, debugInfo?: ErrorDebugInfo) {
    super("PROXY_MISCONFIGURED", message, actionHint, debugInfo);
  }
}

export class PartialDataWarning extends DataError {
  constructor(message: string, actionHint: string, debugInfo?: ErrorDebugInfo) {
    super("PARTIAL_DATA", message, actionHint, debugInfo);
  }
}
